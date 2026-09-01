export const targets = {
  BROWSER: "browser",
  BROWSER_EXTENSION: "browser-extension",
  NATIVE: "native",
};

export class NotFoundError extends Error {
  constructor(message = "No provider result available") {
    super(message);
    this.name = "NotFoundError";
  }
}

const DIAGNOSTIC_HLS_URL =
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

const LANGUAGE_CODES = {
  english: "en",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  japanese: "ja",
  korean: "ko",
  chinese: "zh",
  arabic: "ar",
  russian: "ru",
  hindi: "hi",
  dutch: "nl",
  polish: "pl",
  turkish: "tr",
  swedish: "sv",
  norwegian: "no",
  danish: "da",
  finnish: "fi",
};

export function labelToLanguageCode(label) {
  if (typeof label !== "string") return null;
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;
  if (LANGUAGE_CODES[normalized]) return LANGUAGE_CODES[normalized];
  if (/^[a-z]{2,3}(?:-[a-z]{2})?$/.test(normalized)) {
    return normalized.split("-")[0];
  }
  return null;
}

export function setM3U8ProxyUrl() {}

function normalizeHeaders(headers) {
  if (headers instanceof Headers) return headers;
  return new Headers(headers ?? {});
}

export function makeStandardFetcher(fetchImpl = globalThis.fetch) {
  return async (url, ops = {}) => {
    const response = await fetchImpl(url, {
      method: ops.method,
      headers: normalizeHeaders(ops.headers),
      body: ops.body,
    });

    let body;
    if (ops.responseType === "arrayBuffer") body = await response.arrayBuffer();
    else if (ops.responseType === "blob") body = await response.blob();
    else if (ops.responseType === "json") body = await response.json();
    else body = await response.text();

    return {
      body,
      finalUrl: response.url,
      statusCode: response.status,
      headers: response.headers,
    };
  };
}

export function makeSimpleProxyFetcher(_proxyUrl, fetchImpl = globalThis.fetch) {
  return makeStandardFetcher(fetchImpl);
}

function normalizeSourceConfig(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((source) => source && typeof source.id === "string")
    .map((source, index) => ({
      id: source.id,
      name: source.name || source.id,
      endpoint: typeof source.endpoint === "string" ? source.endpoint : "",
      method: source.method === "GET" ? "GET" : "POST",
      headers: source.headers && typeof source.headers === "object" ? source.headers : {},
      rank: typeof source.rank === "number" ? source.rank : index,
      disabled: Boolean(source.disabled),
    }))
    .filter((source) => !source.disabled);
}

function sourceMetadata(source) {
  return {
    id: source.id,
    name: source.name,
    rank: source.rank,
    disabled: false,
  };
}

function parseBody(body) {
  if (body == null) return null;
  if (typeof body === "string") {
    if (!body.trim()) return null;
    return JSON.parse(body);
  }
  return body;
}

function normalizeCaptions(captions) {
  if (!Array.isArray(captions)) return [];
  return captions
    .filter((caption) => caption && caption.id && caption.language && caption.url)
    .map((caption) => ({
      ...caption,
      hasCorsRestrictions: Boolean(caption.hasCorsRestrictions),
    }));
}

function normalizeStream(payload) {
  if (!payload) return null;
  let candidate = payload.stream ?? payload;
  if (Array.isArray(candidate)) candidate = candidate[0];
  if (!candidate || typeof candidate !== "object") return null;

  if (candidate.type === "hls") {
    const playlist = candidate.playlist || candidate.url;
    if (!playlist || typeof playlist !== "string") return null;
    return {
      type: "hls",
      playlist,
      captions: normalizeCaptions(candidate.captions),
      headers: candidate.headers,
      preferredHeaders: candidate.preferredHeaders,
    };
  }

  if (candidate.type === "file" && candidate.qualities) {
    const qualities = {};
    Object.entries(candidate.qualities).forEach(([quality, value]) => {
      if (!value || typeof value.url !== "string") return;
      qualities[quality] = {
        ...value,
        type: "mp4",
      };
    });
    if (Object.keys(qualities).length === 0) return null;
    return {
      type: "file",
      qualities,
      captions: normalizeCaptions(candidate.captions),
      headers: candidate.headers,
      preferredHeaders: candidate.preferredHeaders,
    };
  }

  return null;
}

function appendMediaQuery(endpoint, media) {
  const url = new URL(endpoint, globalThis.location?.href || "http://localhost");
  Object.entries({
    type: media?.type,
    tmdbId: media?.tmdbId,
    imdbId: media?.imdbId,
    title: media?.title,
    releaseYear: media?.releaseYear,
    season: media?.season?.number,
    episode: media?.episode?.number,
  }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function resolveConfiguredSource(source, media, fetcher) {
  if (source.diagnostic) {
    return {
      type: "hls",
      playlist: DIAGNOSTIC_HLS_URL,
      captions: [],
    };
  }

  if (!source.endpoint) {
    throw new Error("No authorized provider endpoint configured");
  }

  const requestUrl =
    source.method === "GET"
      ? appendMediaQuery(source.endpoint, media)
      : source.endpoint;

  const response = await fetcher(requestUrl, {
    method: source.method,
    headers: {
      accept: "application/json",
      ...(source.method === "POST" ? { "content-type": "application/json" } : {}),
      ...source.headers,
    },
    body: source.method === "POST" ? JSON.stringify({ media }) : undefined,
    responseType: "json",
  });

  if (response.statusCode === 404 || response.statusCode === 204) return null;
  if (response.statusCode >= 400) {
    throw new Error(`Provider returned HTTP ${response.statusCode}`);
  }

  const payload = parseBody(response.body);
  if (payload?.found === false) return null;
  return normalizeStream(payload);
}

export function makeProviders(options = {}) {
  const fetcher = options.fetcher || makeStandardFetcher();
  const configured = normalizeSourceConfig(options.sources);
  const sources =
    configured.length > 0
      ? configured
      : [
          {
            id: "synapse-diagnostic",
            name: "Synapse Test Stream (diagnostic)",
            endpoint: "",
            method: "GET",
            headers: {},
            rank: 0,
            disabled: false,
            diagnostic: true,
          },
        ];

  async function runOne(source, media) {
    const stream = await resolveConfiguredSource(source, media, fetcher);
    if (!stream) throw new NotFoundError(`${source.name} found no stream`);
    return stream;
  }

  return {
    listSources() {
      return sources.map(sourceMetadata);
    },
    listEmbeds() {
      return [];
    },
    async runAll(runOptions = {}) {
      const events = runOptions.events || {};
      const requestedOrder = Array.isArray(runOptions.sourceOrder)
        ? runOptions.sourceOrder
        : sources.map((source) => source.id);
      const orderedSources = requestedOrder
        .map((id) => sources.find((source) => source.id === id))
        .filter(Boolean);

      events.init?.({ sourceIds: orderedSources.map((source) => source.id) });

      for (const source of orderedSources) {
        events.start?.(source.id);
        events.update?.({
          id: source.id,
          status: "pending",
          percentage: 15,
        });

        try {
          const stream = await runOne(source, runOptions.media);
          events.update?.({
            id: source.id,
            status: "success",
            percentage: 100,
          });
          return {
            sourceId: source.id,
            stream,
          };
        } catch (error) {
          const notFound = error instanceof NotFoundError;
          events.update?.({
            id: source.id,
            status: notFound ? "notfound" : "failure",
            reason: error instanceof Error ? error.message : String(error),
            error,
            percentage: 100,
          });
        }
      }

      return null;
    },
    async runSourceScraper({ id, media } = {}) {
      const source = sources.find((item) => item.id === id);
      if (!source) throw new NotFoundError(`Unknown source: ${id}`);
      const stream = await runOne(source, media);
      return { stream: [stream], embeds: [] };
    },
    async runEmbedScraper() {
      throw new NotFoundError("No embed resolver is configured");
    },
  };
}

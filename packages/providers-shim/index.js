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

export function makeProviders() {
  return {
    listSources() {
      return [];
    },
    listEmbeds() {
      return [];
    },
    async runAll(options = {}) {
      options.events?.init?.({ sourceIds: [] });
      return null;
    },
    async runSourceScraper() {
      return { stream: [], embeds: [] };
    },
    async runEmbedScraper() {
      return { stream: [] };
    },
  };
}

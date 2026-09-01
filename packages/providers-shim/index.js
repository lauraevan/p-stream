export const targets = {
  BROWSER: "browser",
  BROWSER_EXTENSION: "browser-extension",
  NATIVE: "native",
};

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

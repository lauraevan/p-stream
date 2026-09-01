export type Fetcher = (url: string, ops?: any) => Promise<any>;

export type RunOutput = {
  sourceId: string;
  embedId?: string;
  stream: any;
};

export type ScrapeMedia = any;

export type FullScraperEvents = {
  init?: (event: any) => void;
  start?: (id: any) => void;
  update?: (event: any) => void;
  discoverEmbeds?: (event: any) => void;
};

export declare const targets: {
  BROWSER: string;
  BROWSER_EXTENSION: string;
  NATIVE: string;
};

export declare function setM3U8ProxyUrl(url?: string): void;
export declare function makeStandardFetcher(fetchImpl?: any): Fetcher;
export declare function makeSimpleProxyFetcher(
  proxyUrl?: string,
  fetchImpl?: any,
): Fetcher;

export type ProviderController = {
  listSources(): any[];
  listEmbeds(): any[];
  runAll(options?: any): Promise<RunOutput | null>;
  runSourceScraper(options?: any): Promise<any>;
  runEmbedScraper(options?: any): Promise<any>;
};

export declare function makeProviders(options?: any): ProviderController;

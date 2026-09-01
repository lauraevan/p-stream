export type Qualities = "unknown" | "360" | "480" | "720" | "1080" | "4k";

export type Caption = {
  id: string;
  language: string;
  url: string;
  hasCorsRestrictions: boolean;
  opensubtitles?: boolean;
  type?: string;
  display?: string;
  media?: string;
  isHearingImpaired?: boolean;
  source?: string;
  encoding?: string;
  [key: string]: any;
};

export type Stream =
  | {
      type: "hls";
      playlist: string;
      captions: Caption[];
      headers?: Record<string, string>;
      preferredHeaders?: Record<string, string>;
    }
  | {
      type: "file";
      qualities: Partial<
        Record<Qualities, { type: "mp4"; url: string; [key: string]: any }>
      >;
      captions: Caption[];
      headers?: Record<string, string>;
      preferredHeaders?: Record<string, string>;
    };

export type RunOutput = {
  sourceId: string;
  embedId?: string;
  stream: Stream;
};

export type EmbedOutput = {
  stream: Stream[];
};

export type SourcererOutput = {
  stream: Stream[];
  embeds: Array<{
    embedId: string;
    url: string;
  }>;
};

export type ScrapeMedia = any;

export type MetaOutput = {
  id: string;
  name: string;
  rank?: number;
  disabled?: boolean;
  [key: string]: any;
};

export type FullScraperEvents = {
  init?: (event: { sourceIds: string[] }) => void;
  start?: (id: string) => void;
  update?: (event: {
    id: string;
    status: "failure" | "pending" | "notfound" | "success" | "waiting";
    reason?: string;
    error?: any;
    percentage: number;
  }) => void;
  discoverEmbeds?: (event: {
    sourceId: string;
    embeds: Array<{ id: string; embedScraperId: string }>;
  }) => void;
};

export type Fetcher = (url: string, ops: any) => Promise<any>;

export declare class NotFoundError extends Error {
  constructor(message?: string);
}

export declare const targets: {
  BROWSER: string;
  BROWSER_EXTENSION: string;
  NATIVE: string;
};

export declare function labelToLanguageCode(label: string): string | null;
export declare function setM3U8ProxyUrl(url?: string): void;
export declare function makeStandardFetcher(fetchImpl?: any): Fetcher;
export declare function makeSimpleProxyFetcher(
  proxyUrl?: string,
  fetchImpl?: any,
): Fetcher;

export type ProviderController = {
  listSources(): MetaOutput[];
  listEmbeds(): MetaOutput[];
  runAll(options?: any): Promise<RunOutput | null>;
  runSourceScraper(options?: any): Promise<SourcererOutput>;
  runEmbedScraper(options?: any): Promise<EmbedOutput>;
};

export type ProviderControls = ProviderController;

export declare function makeProviders(options?: any): ProviderController;

import { FullScraperEvents, RunOutput, ScrapeMedia } from "@p-stream/providers";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";

import { isExtensionActiveCached } from "@/backend/extension/messaging";
import { prepareStream } from "@/backend/extension/streams";
import { getCachedMetadata } from "@/backend/helpers/providerApi";
import { getProviders } from "@/backend/providers/providers";
import { getMediaKey } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import {
  FAST_SOURCE_DELAYS,
  isFastScrapeEnabled,
  rankProviderIds,
  recordProviderResult,
} from "@/utils/providerPerformance";

export interface ScrapingItems {
  id: string;
  children: string[];
}

export interface ScrapingSegment {
  name: string;
  id: string;
  embedId?: string;
  status: "failure" | "pending" | "notfound" | "success" | "waiting";
  reason?: string;
  error?: any;
  percentage: number;
}

type ScraperEvent<Event extends keyof FullScraperEvents> = Parameters<
  NonNullable<FullScraperEvents[Event]>
>[0];

function useBaseScrape() {
  const [sources, setSources] = useState<Record<string, ScrapingSegment>>({});
  const [sourceOrder, setSourceOrder] = useState<ScrapingItems[]>([]);
  const [currentSource, setCurrentSource] = useState<string>();
  const lastId = useRef<string | null>(null);

  const initEvent = useCallback((evt: ScraperEvent<"init">) => {
    setSources(
      evt.sourceIds
        .map((v) => {
          const source = getCachedMetadata().find((s) => s.id === v);
          if (!source) throw new Error("invalid source id");
          const out: ScrapingSegment = {
            name: source.name,
            id: source.id,
            status: "waiting",
            percentage: 0,
          };
          return out;
        })
        .reduce<Record<string, ScrapingSegment>>((a, v) => {
          a[v.id] = v;
          return a;
        }, {}),
    );
    setSourceOrder(evt.sourceIds.map((v) => ({ id: v, children: [] })));
  }, []);

  const startEvent = useCallback((id: ScraperEvent<"start">) => {
    const lastIdTmp = lastId.current;
    setSources((s) => {
      if (s[id]) s[id].status = "pending";
      if (lastIdTmp && s[lastIdTmp] && s[lastIdTmp].status === "pending")
        s[lastIdTmp].status = "success";
      return { ...s };
    });
    setCurrentSource(id);
    lastId.current = id;
  }, []);

  const concurrentStartEvent = useCallback((id: ScraperEvent<"start">) => {
    setSources((s) => {
      if (s[id]) {
        s[id].status = "pending";
        s[id].percentage = 0;
      }
      return { ...s };
    });
    setCurrentSource(id);
  }, []);

  const setSourceWaiting = useCallback((id: string) => {
    setSources((s) => {
      if (s[id]) {
        s[id].status = "waiting";
        s[id].percentage = 0;
        s[id].reason = undefined;
        s[id].error = undefined;
      }
      return { ...s };
    });
  }, []);

  const updateEvent = useCallback((evt: ScraperEvent<"update">) => {
    setSources((s) => {
      if (s[evt.id]) {
        s[evt.id].status = evt.status;
        s[evt.id].reason = evt.reason;
        s[evt.id].error = evt.error;
        s[evt.id].percentage = evt.percentage;
      }
      return { ...s };
    });
  }, []);

  const discoverEmbedsEvent = useCallback(
    (evt: ScraperEvent<"discoverEmbeds">) => {
      setSources((s) => {
        evt.embeds.forEach((v) => {
          const source = getCachedMetadata().find(
            (src) => src.id === v.embedScraperId,
          );
          if (!source) throw new Error("invalid source id");
          const out: ScrapingSegment = {
            embedId: v.embedScraperId,
            name: source.name,
            id: v.id,
            status: "waiting",
            percentage: 0,
          };
          s[v.id] = out;
        });
        return { ...s };
      });
      setSourceOrder((s) => {
        const source = s.find((v) => v.id === evt.sourceId);
        if (!source) throw new Error("invalid source id");
        source.children = evt.embeds.map((v) => v.id);
        return [...s];
      });
    },
    [],
  );

  const startScrape = useCallback(() => {
    lastId.current = null;
  }, []);

  const getResult = useCallback((output: RunOutput | null) => {
    if (output && lastId.current) {
      setSources((s) => {
        if (!lastId.current) return s;
        if (s[lastId.current]) s[lastId.current].status = "success";
        return { ...s };
      });
    }
    return output;
  }, []);

  return {
    initEvent,
    startEvent,
    concurrentStartEvent,
    setSourceWaiting,
    updateEvent,
    discoverEmbedsEvent,
    startScrape,
    getResult,
    sources,
    sourceOrder,
    currentSource,
  };
}

export function useScrape() {
  const {
    sources,
    sourceOrder,
    currentSource,
    updateEvent,
    discoverEmbedsEvent,
    initEvent,
    getResult,
    startEvent,
    concurrentStartEvent,
    setSourceWaiting,
    startScrape,
  } = useBaseScrape();

  const preferredSourceOrder = usePreferencesStore((s) => s.sourceOrder);
  const enableSourceOrder = usePreferencesStore((s) => s.enableSourceOrder);
  const lastSuccessfulSource = usePreferencesStore(
    (s) => s.lastSuccessfulSource,
  );
  const enableLastSuccessfulSource = usePreferencesStore(
    (s) => s.enableLastSuccessfulSource,
  );
  const preferredEmbedOrder = usePreferencesStore((s) => s.embedOrder);
  const enableEmbedOrder = usePreferencesStore((s) => s.enableEmbedOrder);

  const startScraping = useCallback(
    async (media: ScrapeMedia, startFromSourceId?: string) => {
      const providerInstance = getProviders();
      const allSources = providerInstance.listSources();
      const playerState = usePlayerStore.getState();

      // Get media-specific failed sources/embeds
      // Try to get media key from player state first, fallback to deriving from ScrapeMedia
      let mediaKey = getMediaKey(playerState.meta);
      if (!mediaKey) {
        // Derive media key from ScrapeMedia if meta is not set yet
        if (media.type === "movie") {
          mediaKey = `movie-${media.tmdbId}`;
        } else if (media.type === "show" && media.season && media.episode) {
          mediaKey = `show-${media.tmdbId}-${media.season.tmdbId}-${media.episode.tmdbId}`;
        } else if (media.type === "show") {
          mediaKey = `show-${media.tmdbId}`;
        }
      }
      const failedSources = mediaKey
        ? playerState.failedSourcesPerMedia[mediaKey] || []
        : [];
      const failedEmbeds = mediaKey
        ? playerState.failedEmbedsPerMedia[mediaKey] || {}
        : {};

      // Start with all available sources (filtered by failed ones only)
      let baseSourceOrder = allSources
        .filter((source) => !failedSources.includes(source.id))
        .map((source) => source.id);

      // Apply custom source ordering if enabled
      if (enableSourceOrder && (preferredSourceOrder || []).length > 0) {
        const orderedSources: string[] = [];
        const remainingSources = [...baseSourceOrder];

        // Add sources in preferred order
        for (const sourceId of preferredSourceOrder) {
          const sourceIndex = remainingSources.indexOf(sourceId);
          if (sourceIndex !== -1) {
            orderedSources.push(sourceId);
            remainingSources.splice(sourceIndex, 1);
          }
        }

        // Add remaining sources
        baseSourceOrder = [...orderedSources, ...remainingSources];
      }

      // Learn from successful/fast providers unless the user explicitly set
      // their own order. Unknown providers keep their original relative order.
      if (!enableSourceOrder) {
        baseSourceOrder = rankProviderIds(baseSourceOrder);
      }

      // If we have a last successful source and the feature is enabled, prioritize it
      // BUT only if we're not resuming from a specific source (to preserve custom order)
      if (
        enableLastSuccessfulSource &&
        lastSuccessfulSource &&
        !startFromSourceId
      ) {
        const lastSourceIndex = baseSourceOrder.indexOf(lastSuccessfulSource);
        if (lastSourceIndex !== -1) {
          baseSourceOrder = [
            lastSuccessfulSource,
            ...baseSourceOrder.filter((id) => id !== lastSuccessfulSource),
          ];
        }
      }

      // If starting from a specific source ID, filter the order to start AFTER that source
      // This preserves the custom order while starting from the next source
      let filteredSourceOrder = baseSourceOrder;
      if (startFromSourceId) {
        const startIndex = filteredSourceOrder.indexOf(startFromSourceId);
        if (startIndex !== -1) {
          filteredSourceOrder = filteredSourceOrder.slice(startIndex + 1);
        }
      }

      // Collect all failed embed IDs across all sources for current media
      const allFailedEmbedIds = Object.values(failedEmbeds).flat();

      // Filter out failed embeds from the embed order
      const filteredEmbedOrder = enableEmbedOrder
        ? (preferredEmbedOrder || []).filter(
            (id) => !allFailedEmbedIds.includes(id),
          )
        : undefined;

      startScrape();

      // Fast path: hedge up to three top-ranked sources using the provider
      // package's individual source/embed runners. Provider implementations and
      // playback logic stay untouched. If every hedge misses (or hits a source
      // shape that cannot be reproduced exactly), the original runAll path
      // below remains the safety net.
      const fastPathEnabled =
        !startFromSourceId &&
        !isExtensionActiveCached() &&
        !window.__PSTREAM_DESKTOP__ &&
        isFastScrapeEnabled() &&
        filteredSourceOrder.length > 1;

      if (fastPathEnabled) {
        initEvent({
          sourceIds: filteredSourceOrder,
        } as ScraperEvent<"init">);

        const raceSourceIds = filteredSourceOrder.slice(
          0,
          FAST_SOURCE_DELAYS.length,
        );
        let winnerChosen = false;

        const runSingleSourceFast = async (
          sourceId: string,
        ): Promise<{
          output: RunOutput | null;
          recordResult: boolean | null;
        }> => {
          const attemptProviders = getProviders();
          const sourceOutput = await attemptProviders.runSourceScraper({
            id: sourceId,
            media,
          });

          // Only accept the direct-stream case when its shape matches stock
          // runAll closely: one direct stream and no embeds. Mixed or
          // multi-direct outputs go through the untouched fallback so source
          // semantics are preserved.
          if (sourceOutput.stream?.length) {
            if (
              sourceOutput.stream.length === 1 &&
              sourceOutput.embeds.length === 0
            ) {
              return {
                output: {
                  sourceId,
                  stream: sourceOutput.stream[0],
                },
                recordResult: true,
              };
            }
            return {
              output: null,
              recordResult: null,
            };
          }

          if (sourceOutput.embeds.length === 0) {
            return {
              output: null,
              recordResult: false,
            };
          }

          let embedIds = attemptProviders.listEmbeds().map((embed) => embed.id);
          if (filteredEmbedOrder?.length) {
            const preferred = filteredEmbedOrder.filter((id) =>
              embedIds.includes(id),
            );
            embedIds = [
              ...preferred,
              ...embedIds.filter((id) => !preferred.includes(id)),
            ];
          }

          const embedRank = new Map(
            embedIds.map((id, index) => [id, index] as const),
          );
          const sortedEmbeds = [...sourceOutput.embeds].sort(
            (a, b) =>
              (embedRank.get(a.embedId) ?? Number.MAX_SAFE_INTEGER) -
              (embedRank.get(b.embedId) ?? Number.MAX_SAFE_INTEGER),
          );

          for (const embed of sortedEmbeds) {
            try {
              const embedOutput = await attemptProviders.runEmbedScraper({
                id: embed.embedId,
                url: embed.url,
              });
              if (embedOutput.stream?.[0]) {
                return {
                  output: {
                    sourceId,
                    embedId: embed.embedId,
                    stream: embedOutput.stream[0],
                  },
                  recordResult: true,
                };
              }
            } catch {
              continue;
            }
          }

          return {
            output: null,
            recordResult: false,
          };
        };

        const fastOutput = await new Promise<RunOutput | null>((resolve) => {
          let completed = 0;

          const completeAttempt = () => {
            completed += 1;
            if (completed === raceSourceIds.length && !winnerChosen)
              resolve(null);
          };

          raceSourceIds.forEach((sourceId, index) => {
            window.setTimeout(async () => {
              if (winnerChosen) {
                completeAttempt();
                return;
              }

              concurrentStartEvent(sourceId as ScraperEvent<"start">);
              const startedAt = Date.now();

              try {
                const attempt = await runSingleSourceFast(sourceId);
                const attemptOutput = attempt.output;
                const elapsed = Date.now() - startedAt;
                if (attempt.recordResult !== null) {
                  recordProviderResult(sourceId, attempt.recordResult, elapsed);
                }

                if (attemptOutput && !winnerChosen) {
                  winnerChosen = true;
                  concurrentStartEvent(sourceId as ScraperEvent<"start">);
                  updateEvent({
                    id: sourceId,
                    status: "success",
                    percentage: 100,
                  } as ScraperEvent<"update">);

                  raceSourceIds
                    .filter((id) => id !== sourceId)
                    .forEach((id) => {
                      setSourceWaiting(id);
                    });

                  resolve(attemptOutput);
                } else if (!attemptOutput && !winnerChosen) {
                  if (attempt.recordResult === null) {
                    setSourceWaiting(sourceId);
                  } else {
                    updateEvent({
                      id: sourceId,
                      status: "notfound",
                      percentage: 100,
                    } as ScraperEvent<"update">);
                  }
                }
              } catch (error) {
                recordProviderResult(sourceId, false, Date.now() - startedAt);
                if (!winnerChosen) {
                  updateEvent({
                    id: sourceId,
                    status: "failure",
                    percentage: 100,
                    error,
                  } as ScraperEvent<"update">);
                }
              } finally {
                completeAttempt();
              }
            }, FAST_SOURCE_DELAYS[index] ?? 0);
          });
        });

        if (fastOutput) {
          try {
            if (isExtensionActiveCached())
              await prepareStream(fastOutput.stream);
            return fastOutput;
          } catch (error) {
            console.warn(
              "Fast source resolved but stream preparation failed; falling back",
              error,
            );
          }
        }
      }

      const providers = getProviders();

      const output = await providers.runAll({
        media,
        sourceOrder: filteredSourceOrder,
        embedOrder: filteredEmbedOrder,
        events: {
          init: initEvent,
          start: startEvent,
          update: updateEvent,
          discoverEmbeds: discoverEmbedsEvent,
        },
      });
      if (output && isExtensionActiveCached())
        await prepareStream(output.stream);
      return getResult(output);
    },
    [
      initEvent,
      startEvent,
      concurrentStartEvent,
      setSourceWaiting,
      updateEvent,
      discoverEmbedsEvent,
      getResult,
      startScrape,
      preferredSourceOrder,
      enableSourceOrder,
      lastSuccessfulSource,
      enableLastSuccessfulSource,
      preferredEmbedOrder,
      enableEmbedOrder,
    ],
  );

  const resumeScraping = useCallback(
    async (media: ScrapeMedia, startFromSourceId: string) => {
      return startScraping(media, startFromSourceId);
    },
    [startScraping],
  );

  return {
    startScraping,
    resumeScraping,
    sourceOrder,
    sources,
    currentSource,
  };
}

export function useListCenter(
  containerRef: RefObject<HTMLDivElement | null>,
  listRef: RefObject<HTMLDivElement | null>,
  sourceOrder: ScrapingItems[],
  currentSource: string | undefined,
) {
  const [renderedOnce, setRenderedOnce] = useState(false);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    if (!listRef.current) return;

    const elements = [
      ...listRef.current.querySelectorAll("div[data-source-id]"),
    ] as HTMLDivElement[];

    const currentIndex = elements.findIndex(
      (e) => e.getAttribute("data-source-id") === currentSource,
    );

    const currentElement = elements[currentIndex];

    if (!currentElement) return;

    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const listWidth = listRef.current.getBoundingClientRect().width;

    const containerHeight = containerRef.current.getBoundingClientRect().height;

    const listTop = listRef.current.getBoundingClientRect().top;

    const currentTop = currentElement.getBoundingClientRect().top;
    const currentHeight = currentElement.getBoundingClientRect().height;

    const topDifference = currentTop - listTop;

    const listNewLeft = containerWidth / 2 - listWidth / 2;
    const listNewTop = containerHeight / 2 - topDifference - currentHeight / 2;

    listRef.current.style.transform = `translateY(${listNewTop}px) translateX(${listNewLeft}px)`;
    setTimeout(() => {
      setRenderedOnce(true);
    }, 150);
  }, [currentSource, containerRef, listRef, setRenderedOnce]);

  const updatePositionRef = useRef(updatePosition);

  useEffect(() => {
    updatePosition();
    updatePositionRef.current = updatePosition;
  }, [updatePosition, sourceOrder]);

  useEffect(() => {
    function resize() {
      updatePositionRef.current();
    }
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return renderedOnce;
}

interface ProviderPerformanceEntry {
  attempts: number;
  successes: number;
  failures: number;
  ewmaMs: number;
  lastSuccess: number;
  lastFailure: number;
}

const STORAGE_KEY = "synapse-provider-performance-v1";
const EWMA_ALPHA = 0.35;

export const FAST_SOURCE_DELAYS = [0, 350, 750] as const;

function readStats(): Record<string, ProviderPerformanceEntry> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStats(stats: Record<string, ProviderPerformanceEntry>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Storage can be unavailable in strict privacy modes. Performance learning
    // should never block playback.
  }
}

export function recordProviderResult(
  sourceId: string,
  success: boolean,
  durationMs: number,
) {
  const stats = readStats();
  const previous = stats[sourceId];
  const elapsed = Math.max(1, Math.min(durationMs, 30000));
  const now = Date.now();

  const next: ProviderPerformanceEntry = previous
    ? {
        ...previous,
        attempts: previous.attempts + 1,
        successes: previous.successes + (success ? 1 : 0),
        failures: previous.failures + (success ? 0 : 1),
        ewmaMs: previous.ewmaMs * (1 - EWMA_ALPHA) + elapsed * EWMA_ALPHA,
        lastSuccess: success ? now : previous.lastSuccess,
        lastFailure: success ? previous.lastFailure : now,
      }
    : {
        attempts: 1,
        successes: success ? 1 : 0,
        failures: success ? 0 : 1,
        ewmaMs: elapsed,
        lastSuccess: success ? now : 0,
        lastFailure: success ? 0 : now,
      };

  stats[sourceId] = next;
  writeStats(stats);
}

function scoreProvider(entry: ProviderPerformanceEntry | undefined): number {
  if (!entry) return 0;

  const attempts = Math.max(entry.attempts, 1);
  const successRate = (entry.successes + 1) / (attempts + 2);
  const sampleWeight = Math.min(attempts / 5, 1);
  const latencyPenalty = Math.min(entry.ewmaMs, 15000) / 250;

  const ageHours = entry.lastSuccess
    ? (Date.now() - entry.lastSuccess) / 3_600_000
    : Number.POSITIVE_INFINITY;
  const recentSuccessBoost = Number.isFinite(ageHours)
    ? Math.max(0, 24 - ageHours)
    : 0;

  const latestWasFailure =
    entry.lastFailure > 0 && entry.lastFailure > entry.lastSuccess;
  const recentFailurePenalty = latestWasFailure
    ? Math.min(20, (entry.failures / attempts) * 12)
    : 0;

  return (
    (successRate * 100 - latencyPenalty) * sampleWeight +
    recentSuccessBoost -
    recentFailurePenalty
  );
}

export function rankProviderIds(sourceIds: string[]): string[] {
  const stats = readStats();

  return sourceIds
    .map((id, index) => ({
      id,
      index,
      score: scoreProvider(stats[id]),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.id);
}

export function isFastScrapeEnabled(): boolean {
  if (typeof window === "undefined") return true;

  try {
    return (
      window.localStorage.getItem("synapse-fast-scrape-disabled") !== "true"
    );
  } catch {
    return true;
  }
}

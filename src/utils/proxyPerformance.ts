interface ProxyPerformanceEntry {
  attempts: number;
  failures: number;
  ewmaMs: number;
  lastSuccess: number;
  lastFailure: number;
}

const STORAGE_KEY = "synapse-proxy-performance-v1";
const EWMA_ALPHA = 0.3;

function readStats(): Record<string, ProxyPerformanceEntry> {
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

function writeStats(stats: Record<string, ProxyPerformanceEntry>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Proxy learning is optional and must never affect playback.
  }
}

function statKey(group: string, url: string) {
  return `${group}|${url}`;
}

export function selectAdaptiveProxy(
  urls: string[],
  group = "provider",
): string | undefined {
  if (urls.length === 0) return undefined;
  if (urls.length === 1) return urls[0];

  const stats = readStats();

  // Explore every configured proxy at least once before settling on the
  // quickest/reliable choices. Randomizing the unknown pool avoids always
  // favoring the first configured endpoint after storage is cleared.
  const unknown = urls.filter((url) => !stats[statKey(group, url)]);
  if (unknown.length > 0) {
    return unknown[Math.floor(Math.random() * unknown.length)];
  }

  return [...urls].sort((a, b) => {
    const aStat = stats[statKey(group, a)];
    const bStat = stats[statKey(group, b)];

    const aFailureRate = aStat.failures / Math.max(aStat.attempts, 1);
    const bFailureRate = bStat.failures / Math.max(bStat.attempts, 1);

    const aRecentFailure =
      aStat.lastFailure > aStat.lastSuccess ? Math.min(aStat.ewmaMs, 5000) : 0;
    const bRecentFailure =
      bStat.lastFailure > bStat.lastSuccess ? Math.min(bStat.ewmaMs, 5000) : 0;

    const aScore = aStat.ewmaMs * (1 + aFailureRate * 2) + aRecentFailure;
    const bScore = bStat.ewmaMs * (1 + bFailureRate * 2) + bRecentFailure;

    return aScore - bScore;
  })[0];
}

export function recordProxyResult(
  url: string,
  success: boolean,
  durationMs: number,
  group = "provider",
) {
  const stats = readStats();
  const key = statKey(group, url);
  const previous = stats[key];
  const elapsed = Math.max(1, Math.min(durationMs, 30000));
  const now = Date.now();

  stats[key] = previous
    ? {
        attempts: previous.attempts + 1,
        failures: previous.failures + (success ? 0 : 1),
        ewmaMs: previous.ewmaMs * (1 - EWMA_ALPHA) + elapsed * EWMA_ALPHA,
        lastSuccess: success ? now : previous.lastSuccess,
        lastFailure: success ? previous.lastFailure : now,
      }
    : {
        attempts: 1,
        failures: success ? 0 : 1,
        ewmaMs: elapsed,
        lastSuccess: success ? now : 0,
        lastFailure: success ? 0 : now,
      };

  writeStats(stats);
}

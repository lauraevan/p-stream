const { test, expect } = require("@playwright/test");

test.setTimeout(120000);

test("Synapse diagnostic source reaches real video playback", async ({ page }) => {
  const consoleErrors = [];
  const failedRequests = [];
  const responses = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText || "unknown",
    });
  });
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("test-streams.mux.dev") || url.includes(".m3u8")) {
      responses.push({ url, status: response.status() });
    }
  });

  await page.goto(
    "http://127.0.0.1:4173/media/tmdb-movie-1288445-mutiny",
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );

  await page.waitForSelector("video", { timeout: 60000 });

  const initial = await page.locator("video").evaluate((video) => ({
    readyState: video.readyState,
    networkState: video.networkState,
    currentTime: video.currentTime,
    currentSrc: video.currentSrc,
    src: video.src,
    paused: video.paused,
  }));
  console.log("INITIAL_VIDEO_STATE", JSON.stringify(initial));

  await page.locator("video").evaluate((video) => {
    video.muted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  });

  let result = null;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 45000) {
    result = await page.locator("video").evaluate((video) => ({
      ok: video.readyState >= 2 && video.currentTime > 0.25,
      currentTime: video.currentTime,
      readyState: video.readyState,
      networkState: video.networkState,
      src: video.currentSrc || video.src,
      paused: video.paused,
      error: video.error
        ? { code: video.error.code, message: video.error.message }
        : null,
    }));
    if (result.ok) break;
    await page.waitForTimeout(500);
  }

  if (!result?.ok) {
    result = { ...result, ok: false, reason: "video-did-not-advance" };
  }

  console.log("PLAYBACK_RESULT", JSON.stringify(result));
  console.log("HLS_RESPONSES", JSON.stringify(responses.slice(-30)));
  console.log("BROWSER_CONSOLE_ERRORS", JSON.stringify(consoleErrors.slice(-30)));
  console.log("FAILED_REQUESTS", JSON.stringify(failedRequests.slice(-30)));

  expect(result.ok, JSON.stringify(result)).toBe(true);
});

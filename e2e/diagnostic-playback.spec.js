const { test, expect } = require("@playwright/test");

test("Synapse diagnostic source reaches real video playback", async ({ page }) => {
  const consoleErrors = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText || "unknown",
    });
  });

  await page.goto(
    "http://127.0.0.1:4173/media/tmdb-movie-1288445-mutiny",
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );

  await page.waitForSelector("video", { timeout: 60000 });

  const result = await page.evaluate(async () => {
    const video = document.querySelector("video");
    if (!video) return { ok: false, reason: "no-video" };

    video.muted = true;
    try {
      await video.play();
    } catch (error) {
      return {
        ok: false,
        reason: "play-rejected",
        error: error instanceof Error ? error.message : String(error),
        readyState: video.readyState,
        networkState: video.networkState,
        src: video.currentSrc || video.src,
      };
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < 20000) {
      if (video.readyState >= 2 && video.currentTime > 0.25) {
        return {
          ok: true,
          currentTime: video.currentTime,
          readyState: video.readyState,
          networkState: video.networkState,
          src: video.currentSrc || video.src,
          paused: video.paused,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return {
      ok: false,
      reason: "video-did-not-advance",
      currentTime: video.currentTime,
      readyState: video.readyState,
      networkState: video.networkState,
      src: video.currentSrc || video.src,
      paused: video.paused,
      error: video.error
        ? { code: video.error.code, message: video.error.message }
        : null,
    };
  });

  console.log("PLAYBACK_RESULT", JSON.stringify(result));
  console.log("BROWSER_CONSOLE_ERRORS", JSON.stringify(consoleErrors));
  console.log("FAILED_REQUESTS", JSON.stringify(failedRequests.slice(-20)));

  expect(result.ok, JSON.stringify(result)).toBe(true);
});

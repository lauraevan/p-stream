let tmdbReadToken = "";
try {
  tmdbReadToken = localStorage.getItem("pstream-tmdb-read-token") || "";
} catch {
  tmdbReadToken = "";
}

// A fresh self-hosted install has no TMDB token yet. Instead of letting the
// catalog boot into a broken/empty state, send the browser to the one-time
// setup page and return to the original URL after saving.
if (!tmdbReadToken && !window.location.pathname.endsWith("/set-tmdb.html")) {
  const currentUrl = window.location.href;
  const currentPath = window.location.pathname;
  const lastSlash = currentPath.lastIndexOf("/");
  const basePath = currentPath.slice(0, lastSlash + 1);
  window.location.replace(
    `${basePath}set-tmdb.html?return=${encodeURIComponent(currentUrl)}`,
  );
}

window.__CONFIG__ = {
  // The URL for the CORS proxy, the URL must NOT end with a slash!
  // If not specified, the onboarding will not allow a "default setup". The user will have to use the extension or set up a proxy themselves
  VITE_CORS_PROXY_URL: "",

  // The READ API key to access TMDB. A local browser value can be set via /set-tmdb.html.
  VITE_TMDB_READ_API_KEY: tmdbReadToken,

  // The DMCA email displayed in the footer, null to hide the DMCA link
  VITE_DMCA_EMAIL: null,

  // Whether to disable hash-based routing, leave this as false if you don't know what this is
  VITE_NORMAL_ROUTER: true,

  // The backend URL(s) to communicate with - can be a single URL or comma-separated list (e.g., "https://server1.com,https://server2.com")
  VITE_BACKEND_URL: null,

  // A comma separated list of disallowed IDs in the case of a DMCA claim - in the format "series-<id>" and "movie-<id>"
  VITE_DISALLOWED_IDS: "",
};
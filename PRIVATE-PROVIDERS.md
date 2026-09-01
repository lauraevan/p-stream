# Private P-Stream provider package integration

This branch keeps the stock P-Stream frontend/provider API unchanged.

The application continues to import `@p-stream/providers` exactly as upstream does. To use a privately-held, authorized copy of that package, place the package directory at:

`private/p-stream-providers/`

The private package directory should contain its own `package.json` with `name` set to `@p-stream/providers` and the same exports expected by the stock frontend.

Do not commit that directory unless you intend to store it in this private repository.

After the package is present, change the dependency in `package.json` from the unavailable upstream GitHub source to:

`"@p-stream/providers": "file:./private/p-stream-providers"`

Then run a fresh install so the lockfile is regenerated against the private package.

No application source changes are required: `src/backend/providers/providers.ts`, `src/backend/providers/fetchers.ts`, the scrape hook, source checker, and player can remain stock P-Stream.

> [!NOTE]
> Synapse Player is currently based on the P-Stream codebase while we build out the Synapse-specific player experience.

# Synapse Player

A Synapse-focused media player fork built on the P-Stream foundation.

## Upstream

This project originated from P-Stream. The original project is no longer maintained due to legal pressure, but its historical documentation and supporting repositories are still useful references for development.

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fp-stream%2Fp-stream)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/p-stream/p-stream)

**NOTE: To self-host, more setup is required. Check the [upstream docs](https://p-stream.github.io/docs/) for the original setup information.**

## Upstream Links And Resources

| Service       | Link                                            | Source Code                                            |
| ------------- | ----------------------------------------------- | ------------------------------------------------------ |
| P-Stream Docs | [docs](https://docs.pstream.mov)                | [source code](https://github.com/p-stream/docs)        |
| Extension     | [extension](https://docs.pstream.mov/extension) | [source code](https://github.com/p-stream/browser-ext) |
| Proxy         | [simple-proxy](https://docs.pstream.mov/proxy)  | [source code](https://github.com/p-stream/sudo-proxy)  |
| Backend       | [backend](https://server.fifthwit.net)          | [source code](https://github.com/p-stream/backend)     |
| Frontend      | [P-Stream](https://docs.pstream.mov/instances)  | [source code](https://github.com/p-stream/p-stream)    |
| Weblate       | [weblate](https://weblate.pstream.mov)          |                                                        |

## Running Locally

Use the standard project commands:

```bash
pnpm install
pnpm run dev
```

Then open the local Vite instance, normally at http://localhost:5173.

## Updating From Upstream

If you intentionally want to pull changes from the original P-Stream repository, add it as an upstream remote and merge carefully so Synapse-specific work is preserved.

```bash
git remote add upstream https://github.com/p-stream/p-stream.git
git fetch upstream
git checkout production
git merge upstream/production
```

Resolve any conflicts before committing and pushing.

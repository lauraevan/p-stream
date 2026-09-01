import {
  ConfiguredProviderSource,
  makeProviders,
  makeStandardFetcher,
  ProviderController,
  ProviderOptions,
  targets,
} from "@p-stream/providers";

import { isExtensionActiveCached } from "@/backend/extension/messaging";
import { setCachedMetadata } from "@/backend/helpers/providerApi";
import {
  makeExtensionFetcher,
  makeLoadBalancedSimpleProxyFetcher,
  setupM3U8Proxy,
} from "@/backend/providers/fetchers";

// Initialize M3U8 proxy on module load
setupM3U8Proxy();

function isDesktopApp(): boolean {
  return Boolean(typeof window !== "undefined" && window.__PSTREAM_DESKTOP__);
}

function parseConfiguredSources(): ConfiguredProviderSource[] {
  const runtimeConfig =
    typeof window !== "undefined"
      ? (window as any).__SYNAPSE_PROVIDER_CONFIG__
      : undefined;

  if (Array.isArray(runtimeConfig)) return runtimeConfig;

  const rawConfig =
    typeof runtimeConfig === "string"
      ? runtimeConfig
      : import.meta.env.VITE_AUTHORIZED_PROVIDER_CONFIG;

  if (!rawConfig) return [];

  try {
    const parsed = JSON.parse(rawConfig);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse configured provider sources", error);
    return [];
  }
}

function createProviderController(options: ProviderOptions): ProviderController {
  const controller = makeProviders({
    ...options,
    sources: parseConfiguredSources(),
  });

  setCachedMetadata([...controller.listSources(), ...controller.listEmbeds()]);
  return controller;
}

export function getProviders() {
  // Desktop app has extension built in and can play MKV; use NATIVE target.
  if (isDesktopApp()) {
    return createProviderController({
      fetcher: makeStandardFetcher(fetch),
      proxiedFetcher: makeExtensionFetcher(),
      target: targets.NATIVE,
      consistentIpForRequests: true,
    });
  }

  if (isExtensionActiveCached()) {
    return createProviderController({
      fetcher: makeStandardFetcher(fetch),
      proxiedFetcher: makeExtensionFetcher(),
      target: targets.BROWSER_EXTENSION,
      consistentIpForRequests: true,
    });
  }

  setupM3U8Proxy();

  return createProviderController({
    fetcher: makeStandardFetcher(fetch),
    proxiedFetcher: makeLoadBalancedSimpleProxyFetcher(),
    target: targets.BROWSER,
  });
}

export function getAllProviders() {
  return createProviderController({
    fetcher: makeStandardFetcher(fetch),
    target: targets.BROWSER_EXTENSION,
    consistentIpForRequests: true,
  });
}

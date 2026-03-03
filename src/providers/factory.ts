import { JsonFileContactsProvider } from "./json-file-provider";
import { MacContactsProvider } from "./mac-provider";
import { ContactsProvider, type ProviderContext } from "./provider";

export type BackendType = "mac" | "json";

export interface ProviderFactoryOptions extends ProviderContext {
  backend?: string;
}

export function createContactsProvider(
  options: ProviderFactoryOptions,
  platform: NodeJS.Platform = process.platform,
): ContactsProvider {
  const backend = parseBackend(options.backend, platform);

  if (backend === "json") {
    return new JsonFileContactsProvider(options);
  }

  if (platform !== "darwin") {
    throw new Error(
      "The mac backend is only available on macOS. Use --backend json, or run `contacts backend set json` to persist it.",
    );
  }

  return new MacContactsProvider(options);
}

export function parseBackend(
  rawBackend: string | undefined,
  platform: NodeJS.Platform = process.platform,
): BackendType {
  if (typeof rawBackend === "undefined") {
    return defaultBackendForPlatform(platform);
  }

  const normalized = rawBackend.trim().toLowerCase();
  if (!normalized) {
    throw new Error(`Invalid --backend value: ${rawBackend}. Expected one of: mac, json.`);
  }

  if (normalized === "mac" || normalized === "json") {
    return normalized;
  }

  throw new Error(`Invalid --backend value: ${rawBackend}. Expected one of: mac, json.`);
}

export function defaultBackendForPlatform(
  platform: NodeJS.Platform = process.platform,
): BackendType {
  return platform === "darwin" ? "mac" : "json";
}

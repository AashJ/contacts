import { JsonFileContactsProvider } from "./json-file-provider";
import { MacContactsProvider } from "./mac-provider";
import { ContactsProvider, type ProviderContext } from "./provider";

export type BackendType = "mac" | "json";

export interface ProviderFactoryOptions extends ProviderContext {
  backend?: string;
}

export function createContactsProvider(options: ProviderFactoryOptions): ContactsProvider {
  const backend = parseBackend(options.backend);

  if (backend === "json") {
    return new JsonFileContactsProvider(options);
  }

  return new MacContactsProvider(options);
}

export function parseBackend(rawBackend: string | undefined): BackendType {
  if (typeof rawBackend === "undefined") {
    return "mac";
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

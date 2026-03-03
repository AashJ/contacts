import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export type StoredBackend = "mac" | "json";

export interface AppConfig {
  backend?: StoredBackend;
  source?: string;
}

export interface AppConfigUpdate {
  backend?: StoredBackend | null;
  source?: string | null;
}

export interface LoadedAppConfig {
  path: string;
  values: AppConfig;
}

const CONFIG_ENV_VAR = "CONTACTS_CONFIG";
const DEFAULT_CONFIG_FILENAME = "config.json";

export function resolveConfigPath(configPathOverride?: string): string {
  const explicitOverride = normalizeOptionalText(configPathOverride);
  if (explicitOverride) {
    return resolve(explicitOverride);
  }

  const envOverride = normalizeOptionalText(process.env[CONFIG_ENV_VAR]);
  if (envOverride) {
    return resolve(envOverride);
  }

  const xdgConfigHome = normalizeOptionalText(process.env.XDG_CONFIG_HOME);
  if (xdgConfigHome) {
    return resolve(join(xdgConfigHome, "contacts", DEFAULT_CONFIG_FILENAME));
  }

  const home = normalizeOptionalText(process.env.HOME);
  if (home) {
    return resolve(join(home, ".config", "contacts", DEFAULT_CONFIG_FILENAME));
  }

  throw new Error(
    "Could not resolve config path. Set HOME, XDG_CONFIG_HOME, CONTACTS_CONFIG, or pass --config <path>.",
  );
}

export async function loadAppConfig(configPathOverride?: string): Promise<LoadedAppConfig> {
  const path = resolveConfigPath(configPathOverride);
  const file = Bun.file(path);

  if (!(await file.exists())) {
    return {
      path,
      values: {},
    };
  }

  const raw = await file.text();
  if (!raw.trim()) {
    return {
      path,
      values: {},
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in config file ${path}: ${String(error)}`);
  }

  return {
    path,
    values: normalizeConfig(parsed, path),
  };
}

export async function updateAppConfig(
  updates: AppConfigUpdate,
  configPathOverride?: string,
): Promise<LoadedAppConfig> {
  const loaded = await loadAppConfig(configPathOverride);
  const nextConfig: AppConfig = { ...loaded.values };

  if (hasOwn(updates, "backend")) {
    if (updates.backend === null) {
      delete nextConfig.backend;
    } else if (updates.backend === "mac" || updates.backend === "json") {
      nextConfig.backend = updates.backend;
    } else {
      throw new Error(`Invalid backend value: ${String(updates.backend)}`);
    }
  }

  if (hasOwn(updates, "source")) {
    if (updates.source === null) {
      delete nextConfig.source;
    } else {
      const normalizedSource = normalizeOptionalText(updates.source);
      if (!normalizedSource) {
        throw new Error("Config source path cannot be empty.");
      }
      nextConfig.source = normalizedSource;
    }
  }

  await mkdir(dirname(loaded.path), { recursive: true });
  await Bun.write(loaded.path, `${JSON.stringify(nextConfig, null, 2)}\n`);

  return {
    path: loaded.path,
    values: nextConfig,
  };
}

function normalizeConfig(value: unknown, sourcePath: string): AppConfig {
  if (!value || typeof value !== "object") {
    return {};
  }

  const raw = value as { backend?: unknown; source?: unknown };
  const config: AppConfig = {};

  if (typeof raw.backend === "string") {
    const backend = raw.backend.trim().toLowerCase();
    if (backend !== "mac" && backend !== "json") {
      throw new Error(
        `Invalid backend "${raw.backend}" in config file ${sourcePath}. Expected one of: mac, json.`,
      );
    }

    config.backend = backend;
  }

  const source = normalizeOptionalText(raw.source);
  if (source) {
    config.source = source;
  }

  return config;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function hasOwn<T extends object>(object: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

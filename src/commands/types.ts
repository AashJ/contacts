import { dirname, join } from "node:path";
import { loadAppConfig } from "../config/store";
import {
  defaultBackendForPlatform,
  parseBackend,
  type BackendType,
} from "../providers/factory";

export interface GlobalOptions {
  backend?: string;
  config?: string;
  source?: string;
  verbose?: boolean;
}

export interface ResolvedGlobalOptions {
  backend: BackendType;
  configPath: string;
  sourcePath?: string;
  verbose?: boolean;
}

export async function resolveGlobalOptions(
  globalOptions: GlobalOptions,
): Promise<ResolvedGlobalOptions> {
  const loadedConfig = await loadAppConfig(globalOptions.config);
  const configuredBackend = normalizeOptionalText(
    globalOptions.backend ?? loadedConfig.values.backend,
  );
  const backend = configuredBackend ? parseBackend(configuredBackend) : defaultBackendForPlatform();
  const configuredSourcePath = normalizeOptionalText(
    globalOptions.source ?? loadedConfig.values.source,
  );
  const sourcePath =
    configuredSourcePath ??
    (backend === "json" ? defaultJsonSourcePath(loadedConfig.path) : undefined);

  return {
    backend,
    configPath: loadedConfig.path,
    sourcePath,
    verbose: globalOptions.verbose,
  };
}

export function defaultJsonSourcePath(configPath: string): string {
  return join(dirname(configPath), "contacts.json");
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

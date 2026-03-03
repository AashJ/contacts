import { loadAppConfig } from "../config/store";
import { parseBackend, type BackendType } from "../providers/factory";

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
  const backend = parseBackend(globalOptions.backend ?? loadedConfig.values.backend);
  const sourcePath = normalizeOptionalText(globalOptions.source ?? loadedConfig.values.source);

  return {
    backend,
    configPath: loadedConfig.path,
    sourcePath,
    verbose: globalOptions.verbose,
  };
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

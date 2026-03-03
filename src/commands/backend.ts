import { Command } from "commander";
import { loadAppConfig, updateAppConfig } from "../config/store";
import type { TableJsonFormat } from "../domain/types";
import { parseBackend } from "../providers/factory";
import { writeJson } from "../output/json";
import type { GlobalOptions } from "./types";

interface BackendSetOptions {
  clearSource?: boolean;
  defaultSource?: string;
  format: string;
}

interface BackendShowOptions {
  format: string;
}

interface BackendView {
  backend: string | null;
  configPath: string;
  source: string | null;
}

export function registerBackendCommand(program: Command): void {
  const backend = program
    .command("backend")
    .description("Manage persisted backend defaults");

  backend
    .command("show")
    .description("Show saved backend defaults")
    .option("--format <format>", "Output format: table or json", "table")
    .action(async (options: BackendShowOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const format = parseBackendOutputFormat(options.format);
      const loaded = await loadAppConfig(globalOptions.config);

      const view: BackendView = {
        backend: loaded.values.backend ?? null,
        configPath: loaded.path,
        source: loaded.values.source ?? null,
      };

      renderBackendView(view, format);
    });

  backend
    .command("set <backend>")
    .description("Set default backend (and optional default source)")
    .option("--default-source <path>", "Persist default source path")
    .option("--clear-source", "Remove saved default source path")
    .option("--format <format>", "Output format: table or json", "table")
    .action(async (backendRaw: string, options: BackendSetOptions, command: Command) => {
      if (options.defaultSource && options.clearSource) {
        throw new Error("Use either --default-source or --clear-source, not both.");
      }

      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const backend = parseBackend(backendRaw);
      const format = parseBackendOutputFormat(options.format);

      const updates: { backend: "mac" | "json"; source?: string | null } = { backend };

      if (options.clearSource) {
        updates.source = null;
      } else if (typeof options.defaultSource === "string") {
        const source = normalizeOptionalText(options.defaultSource);
        if (!source) {
          throw new Error("Source path cannot be empty.");
        }
        updates.source = source;
      }

      const saved = await updateAppConfig(updates, globalOptions.config);

      const view: BackendView = {
        backend: saved.values.backend ?? null,
        configPath: saved.path,
        source: saved.values.source ?? null,
      };

      renderBackendView(view, format);
    });
}

function parseBackendOutputFormat(rawFormat: string): TableJsonFormat {
  const normalized = rawFormat.trim().toLowerCase();

  if (normalized === "table" || normalized === "json") {
    return normalized;
  }

  throw new Error(`Invalid --format value: ${rawFormat}. Expected one of: table, json.`);
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function renderBackendView(view: BackendView, format: TableJsonFormat): void {
  if (format === "json") {
    writeJson(view);
    return;
  }

  process.stdout.write(`Backend: ${view.backend ?? "(not set; default is mac)"}\n`);
  process.stdout.write(`Source: ${view.source ?? "(not set)"}\n`);
  process.stdout.write(`Config: ${view.configPath}\n`);
}

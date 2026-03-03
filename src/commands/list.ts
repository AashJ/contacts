import { Command } from "commander";
import type { Contact, OutputFormat } from "../domain/types";
import { createContactsProvider } from "../providers/factory";
import { writeJson, writeNdjson } from "../output/json";
import { writeContactsTable } from "../output/table";
import { resolveGlobalOptions, type GlobalOptions } from "./types";

interface ListOptions {
  limit?: string;
  format: string;
}

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List contacts from the configured backend")
    .option("--limit <number>", "Maximum number of contacts to return")
    .option("--format <format>", "Output format: auto, table, json, ndjson", "auto")
    .action(async (options: ListOptions, command: Command) => {
      const rawGlobalOptions = command.optsWithGlobals<GlobalOptions>();
      const globalOptions = await resolveGlobalOptions(rawGlobalOptions);
      const limit = typeof options.limit === "string" ? parseLimit(options.limit) : undefined;
      const format = parseOutputFormat(options.format);
      const provider = createContactsProvider(globalOptions);

      const result = await provider.listContacts({ limit });

      renderContacts(result.contacts, format);

      if (globalOptions.verbose) {
        console.error(
          `[contacts] returned ${result.contacts.length} contact(s) from ${result.sourcePath}`,
        );
      }
    });
}

export function parseLimit(rawLimit: string): number {
  const normalized = rawLimit.trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Invalid --limit value: ${rawLimit}. Expected a positive integer.`);
  }

  const limit = Number.parseInt(normalized, 10);

  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error(`Invalid --limit value: ${rawLimit}. Expected a positive integer.`);
  }

  return limit;
}

export function parseOutputFormat(rawFormat: string): OutputFormat {
  const normalized = rawFormat.trim().toLowerCase();

  if (
    normalized === "auto" ||
    normalized === "table" ||
    normalized === "json" ||
    normalized === "ndjson"
  ) {
    return normalized;
  }

  throw new Error(
    `Invalid --format value: ${rawFormat}. Expected one of: auto, table, json, ndjson.`,
  );
}

export function resolveOutputFormat(
  format: OutputFormat,
  isTty: boolean,
): Exclude<OutputFormat, "auto"> {
  if (format !== "auto") {
    return format;
  }

  return isTty ? "table" : "json";
}

export function renderContacts(contacts: Contact[], format: OutputFormat): void {
  const resolved = resolveOutputFormat(format, Boolean(process.stdout.isTTY));

  if (resolved === "table") {
    writeContactsTable(contacts);
    return;
  }

  if (resolved === "json") {
    writeJson(contacts);
    return;
  }

  writeNdjson(contacts);
}

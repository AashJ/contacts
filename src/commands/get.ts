import { Command } from "commander";
import type { Contact, TableJsonFormat } from "../domain/types";
import { writeJson } from "../output/json";
import { writeContactsTable } from "../output/table";
import { getContact } from "../providers/macos-address-book";
import type { GlobalOptions } from "./types";

interface GetOptions {
  format: string;
}

export function registerGetCommand(program: Command): void {
  program
    .command("get <id>")
    .description("Get a single contact by id")
    .option("--format <format>", "Output format: table or json", "table")
    .action(async (id: string, options: GetOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const parsedId = parseContactId(id);
      const format = parseGetOutputFormat(options.format);

      const result = await getContact({
        id: parsedId,
        sourcePath: globalOptions.source,
        verbose: globalOptions.verbose,
      });

      if (!result.contact) {
        throw new Error(`No contact found for id: ${parsedId}`);
      }

      renderGetResult(result.contact, format);

      if (globalOptions.verbose) {
        console.error(`[mac-contacts] loaded contact ${parsedId} from ${result.sourcePath}`);
      }
    });
}

export function parseContactId(rawId: string): number {
  const normalized = rawId.trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Invalid contact id: ${rawId}. Expected a positive integer.`);
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid contact id: ${rawId}. Expected a positive integer.`);
  }

  return parsed;
}

export function parseGetOutputFormat(rawFormat: string): TableJsonFormat {
  const normalized = rawFormat.trim().toLowerCase();

  if (normalized === "table" || normalized === "json") {
    return normalized;
  }

  throw new Error(`Invalid --format value: ${rawFormat}. Expected one of: table, json.`);
}

function renderGetResult(contact: Contact, format: TableJsonFormat): void {
  if (format === "table") {
    writeContactsTable([contact]);
    return;
  }

  writeJson(contact);
}

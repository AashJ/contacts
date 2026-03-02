import { Command } from "commander";
import type { Contact, SearchField, TableJsonFormat } from "../domain/types";
import { writeJson } from "../output/json";
import { writeContactsTable } from "../output/table";
import { searchContacts } from "../providers/macos-address-book";
import type { GlobalOptions } from "./types";

interface SearchOptions {
  field?: string;
  format: string;
}

export function registerSearchCommand(program: Command): void {
  program
    .command("search <query>")
    .description("Search contacts by name, email, or phone")
    .option("--field <field>", "Search only one field: name, email, phone")
    .option("--format <format>", "Output format: table or json", "table")
    .action(async (query: string, options: SearchOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const field = typeof options.field === "string" ? parseSearchField(options.field) : undefined;
      const format = parseSearchOutputFormat(options.format);

      const result = await searchContacts({
        query,
        field,
        sourcePath: globalOptions.source,
        verbose: globalOptions.verbose,
      });

      renderSearchResults(result.contacts, format);

      if (globalOptions.verbose) {
        console.error(
          `[mac-contacts] matched ${result.contacts.length} contact(s) from ${result.sourcePath}`,
        );
      }
    });
}

export function parseSearchField(rawField: string): SearchField {
  const normalized = rawField.trim().toLowerCase();

  if (normalized === "name" || normalized === "email" || normalized === "phone") {
    return normalized;
  }

  throw new Error(`Invalid --field value: ${rawField}. Expected one of: name, email, phone.`);
}

export function parseSearchOutputFormat(rawFormat: string): TableJsonFormat {
  const normalized = rawFormat.trim().toLowerCase();

  if (normalized === "table" || normalized === "json") {
    return normalized;
  }

  throw new Error(`Invalid --format value: ${rawFormat}. Expected one of: table, json.`);
}

function renderSearchResults(contacts: Contact[], format: TableJsonFormat): void {
  if (format === "table") {
    writeContactsTable(contacts);
    return;
  }

  writeJson(contacts);
}

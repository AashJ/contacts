import { Command } from "commander";
import type { Contact, ContactField, ExportFileFormat } from "../domain/types";
import { createContactsProvider } from "../providers/factory";
import { resolveGlobalOptions, type GlobalOptions } from "./types";

interface ExportOptions {
  format: string;
  out: string;
}

export function registerExportCommand(program: Command): void {
  program
    .command("export")
    .description("Export contacts to JSON or CSV")
    .requiredOption("--format <format>", "Export format: json or csv")
    .requiredOption("--out <path>", "Path to output file")
    .action(async (options: ExportOptions, command: Command) => {
      const rawGlobalOptions = command.optsWithGlobals<GlobalOptions>();
      const globalOptions = await resolveGlobalOptions(rawGlobalOptions);
      const format = parseExportFormat(options.format);
      const provider = createContactsProvider(globalOptions);

      const result = await provider.listContacts({});

      if (format === "json") {
        await Bun.write(options.out, `${JSON.stringify(result.contacts, null, 2)}\n`);
      } else {
        await Bun.write(options.out, contactsToCsv(result.contacts));
      }

      if (globalOptions.verbose) {
        console.error(
          `[contacts] exported ${result.contacts.length} contact(s) to ${options.out} from ${result.sourcePath}`,
        );
      }
    });
}

export function parseExportFormat(rawFormat: string): ExportFileFormat {
  const normalized = rawFormat.trim().toLowerCase();

  if (normalized === "json" || normalized === "csv") {
    return normalized;
  }

  throw new Error(`Invalid --format value: ${rawFormat}. Expected one of: json, csv.`);
}

export function contactsToCsv(contacts: Contact[]): string {
  const header = [
    "id",
    "uniqueId",
    "displayName",
    "firstName",
    "lastName",
    "organization",
    "emails",
    "phones",
  ];

  const rows = contacts.map((contact) => [
    String(contact.id),
    contact.uniqueId ?? "",
    contact.displayName,
    contact.firstName ?? "",
    contact.lastName ?? "",
    contact.organization ?? "",
    formatFieldsForCsv(contact.emails),
    formatFieldsForCsv(contact.phones),
  ]);

  return [header.join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n") + "\n";
}

function formatFieldsForCsv(fields: ContactField[]): string {
  return fields
    .map((field) => {
      const label = field.label ? `${field.label}: ` : "";
      const primaryMarker = field.isPrimary ? " [primary]" : "";
      return `${label}${field.value}${primaryMarker}`;
    })
    .join(" | ");
}

function csvEscape(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, "\"\"")}"`;
}

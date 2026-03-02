import { Command } from "commander";
import type { TableJsonFormat } from "../domain/types";
import { addPhoneToContact } from "../providers/macos-contacts-writer";
import { writeJson } from "../output/json";
import type { GlobalOptions } from "./types";
import { parseAddOutputFormat, parseContactIdentifier, parsePhoneValue } from "./add";

interface AddPhoneOptions {
  label?: string;
  format: string;
}

interface AddPhoneResult {
  contactId: string;
  displayName: string;
  phone: string;
  label?: string;
}

export function registerAddPhoneCommand(program: Command): void {
  program
    .command("add-phone <contactId> <phone>")
    .description("Add a phone number to an existing contact")
    .option("--label <label>", "Phone label, for example: home/work/mobile")
    .option("--format <format>", "Output format: table or json", "table")
    .action(async (contactId: string, phone: string, options: AddPhoneOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const parsedContactId = parseContactIdentifier(contactId);
      const parsedPhone = parsePhoneValue(phone);
      const label = normalizeOptionalText(options.label);
      const format: TableJsonFormat = parseAddOutputFormat(options.format);

      const updated = await addPhoneToContact(parsedContactId, parsedPhone, label);

      const result: AddPhoneResult = {
        contactId: updated.contactId,
        displayName: updated.displayName,
        phone: parsedPhone,
        label,
      };

      renderAddPhoneResult(result, format);

      if (globalOptions.verbose) {
        console.error(`[mac-contacts] added phone to ${updated.contactId}`);
      }
    });
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function renderAddPhoneResult(result: AddPhoneResult, format: TableJsonFormat): void {
  if (format === "json") {
    writeJson(result);
    return;
  }

  const displayName = result.displayName || "(unnamed contact)";
  const label = result.label ? ` [${result.label}]` : "";
  process.stdout.write(`Added phone to ${displayName} (${result.contactId}): ${result.phone}${label}\n`);
}

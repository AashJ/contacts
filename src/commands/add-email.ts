import { Command } from "commander";
import type { TableJsonFormat } from "../domain/types";
import { addEmailToContact } from "../providers/macos-contacts-writer";
import { writeJson } from "../output/json";
import type { GlobalOptions } from "./types";
import { parseAddOutputFormat, parseContactIdentifier, parseEmailValue } from "./add";

interface AddEmailOptions {
  label?: string;
  format: string;
}

interface AddEmailResult {
  contactId: string;
  displayName: string;
  email: string;
  label?: string;
}

export function registerAddEmailCommand(program: Command): void {
  program
    .command("add-email <contactId> <email>")
    .description("Add an email address to an existing contact")
    .option("--label <label>", "Email label, for example: home/work")
    .option("--format <format>", "Output format: table or json", "table")
    .action(async (contactId: string, email: string, options: AddEmailOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const parsedContactId = parseContactIdentifier(contactId);
      const parsedEmail = parseEmailValue(email);
      const label = normalizeOptionalText(options.label);
      const format: TableJsonFormat = parseAddOutputFormat(options.format);

      const updated = await addEmailToContact(parsedContactId, parsedEmail, label);

      const result: AddEmailResult = {
        contactId: updated.contactId,
        displayName: updated.displayName,
        email: parsedEmail,
        label,
      };

      renderAddEmailResult(result, format);

      if (globalOptions.verbose) {
        console.error(`[mac-contacts] added email to ${updated.contactId}`);
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

function renderAddEmailResult(result: AddEmailResult, format: TableJsonFormat): void {
  if (format === "json") {
    writeJson(result);
    return;
  }

  const displayName = result.displayName || "(unnamed contact)";
  const label = result.label ? ` [${result.label}]` : "";
  process.stdout.write(`Added email to ${displayName} (${result.contactId}): ${result.email}${label}\n`);
}

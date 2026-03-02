import { Command } from "commander";
import type { TableJsonFormat } from "../domain/types";
import {
  addEmailToContact,
  addPhoneToContact,
  createContact,
} from "../providers/macos-contacts-writer";
import { writeJson } from "../output/json";
import type { GlobalOptions } from "./types";

interface AddOptions {
  first?: string;
  last?: string;
  organization?: string;
  note?: string;
  email: string[];
  phone: string[];
  emailLabel?: string;
  phoneLabel?: string;
  format: string;
}

interface AddContactResult {
  contactId: string;
  displayName: string;
  emails: string[];
  phones: string[];
}

export function registerAddCommand(program: Command): void {
  program
    .command("add")
    .description("Add a contact to macOS Contacts")
    .option("--first <name>", "First name")
    .option("--last <name>", "Last name")
    .option("--organization <name>", "Organization name")
    .option("--note <text>", "Contact note")
    .option("--email <address>", "Email address (repeatable)", collectValues, [])
    .option("--phone <number>", "Phone number (repeatable)", collectValues, [])
    .option("--email-label <label>", "Label to apply to all --email values")
    .option("--phone-label <label>", "Label to apply to all --phone values")
    .option("--format <format>", "Output format: table or json", "table")
    .action(async (options: AddOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const format = parseAddOutputFormat(options.format);
      const normalized = normalizeAddOptions(options);

      if (!normalized.firstName && !normalized.lastName && !normalized.organization) {
        throw new Error("Provide at least one of: --first, --last, --organization.");
      }

      const created = await createContact({
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        organization: normalized.organization,
        note: normalized.note,
      });

      for (const email of normalized.emails) {
        await addEmailToContact(created.contactId, email, normalized.emailLabel);
      }

      for (const phone of normalized.phones) {
        await addPhoneToContact(created.contactId, phone, normalized.phoneLabel);
      }

      const result: AddContactResult = {
        contactId: created.contactId,
        displayName: created.displayName,
        emails: normalized.emails,
        phones: normalized.phones,
      };

      renderAddResult(result, format);

      if (globalOptions.verbose) {
        console.error(
          `[mac-contacts] added contact ${created.contactId} with ${normalized.emails.length} email(s) and ${normalized.phones.length} phone(s)`,
        );
      }
    });
}

export function parseAddOutputFormat(rawFormat: string): TableJsonFormat {
  const normalized = rawFormat.trim().toLowerCase();

  if (normalized === "table" || normalized === "json") {
    return normalized;
  }

  throw new Error(`Invalid --format value: ${rawFormat}. Expected one of: table, json.`);
}

export function parseContactIdentifier(rawId: string): string {
  const normalized = rawId.trim();
  if (!normalized) {
    throw new Error("Contact id cannot be empty.");
  }

  return normalized;
}

export function parseEmailValue(rawEmail: string): string {
  const normalized = rawEmail.trim();
  if (!normalized) {
    throw new Error("Email value cannot be empty.");
  }

  return normalized;
}

export function parsePhoneValue(rawPhone: string): string {
  const normalized = rawPhone.trim();
  if (!normalized) {
    throw new Error("Phone value cannot be empty.");
  }

  return normalized;
}

function normalizeAddOptions(options: AddOptions): {
  firstName?: string;
  lastName?: string;
  organization?: string;
  note?: string;
  emails: string[];
  phones: string[];
  emailLabel?: string;
  phoneLabel?: string;
} {
  return {
    firstName: normalizeOptionalText(options.first),
    lastName: normalizeOptionalText(options.last),
    organization: normalizeOptionalText(options.organization),
    note: normalizeOptionalText(options.note),
    emails: options.email.map(parseEmailValue),
    phones: options.phone.map(parsePhoneValue),
    emailLabel: normalizeOptionalText(options.emailLabel),
    phoneLabel: normalizeOptionalText(options.phoneLabel),
  };
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function collectValues(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function renderAddResult(result: AddContactResult, format: TableJsonFormat): void {
  if (format === "json") {
    writeJson(result);
    return;
  }

  const displayName = result.displayName || "(unnamed contact)";
  process.stdout.write(`Added contact: ${displayName}\n`);
  process.stdout.write(`Contact ID: ${result.contactId}\n`);

  if (result.emails.length > 0) {
    process.stdout.write(`Emails added: ${result.emails.join(", ")}\n`);
  }

  if (result.phones.length > 0) {
    process.stdout.write(`Phones added: ${result.phones.join(", ")}\n`);
  }
}

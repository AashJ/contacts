import type { Contact, Group } from "../domain/types";

const MAX_NAME_WIDTH = 36;
const MAX_EMAIL_WIDTH = 34;
const MAX_PHONE_WIDTH = 24;
const MAX_GROUP_NAME_WIDTH = 44;

export function writeContactsTable(contacts: Contact[]): void {
  if (contacts.length === 0) {
    process.stdout.write("No contacts found.\n");
    return;
  }

  const rows = contacts.map((contact) => ({
    id: String(contact.id),
    name: contact.displayName,
    email: summarizeValue(contact.emails.map((item) => item.value)),
    phone: summarizeValue(contact.phones.map((item) => item.value)),
  }));

  const idWidth = Math.max(2, ...rows.map((row) => row.id.length));
  const nameWidth = Math.min(MAX_NAME_WIDTH, Math.max(4, ...rows.map((row) => row.name.length)));
  const emailWidth = Math.min(MAX_EMAIL_WIDTH, Math.max(5, ...rows.map((row) => row.email.length)));
  const phoneWidth = Math.min(MAX_PHONE_WIDTH, Math.max(5, ...rows.map((row) => row.phone.length)));

  const header =
    `${pad("ID", idWidth)}  ` +
    `${pad("NAME", nameWidth)}  ` +
    `${pad("EMAIL", emailWidth)}  ` +
    `${pad("PHONE", phoneWidth)}`;

  const divider =
    `${"-".repeat(idWidth)}  ` +
    `${"-".repeat(nameWidth)}  ` +
    `${"-".repeat(emailWidth)}  ` +
    `${"-".repeat(phoneWidth)}`;

  process.stdout.write(`${header}\n${divider}\n`);

  for (const row of rows) {
    const line =
      `${pad(truncate(row.id, idWidth), idWidth)}  ` +
      `${pad(truncate(row.name, nameWidth), nameWidth)}  ` +
      `${pad(truncate(row.email, emailWidth), emailWidth)}  ` +
      `${pad(truncate(row.phone, phoneWidth), phoneWidth)}`;

    process.stdout.write(`${line}\n`);
  }
}

export function writeGroupsTable(groups: Group[]): void {
  if (groups.length === 0) {
    process.stdout.write("No groups found.\n");
    return;
  }

  const rows = groups.map((group) => ({
    id: String(group.id),
    name: group.name,
    uniqueId: group.uniqueId ?? "",
  }));

  const idWidth = Math.max(2, ...rows.map((row) => row.id.length));
  const nameWidth = Math.min(MAX_GROUP_NAME_WIDTH, Math.max(4, ...rows.map((row) => row.name.length)));
  const uniqueIdWidth = Math.max(9, ...rows.map((row) => row.uniqueId.length));

  const header =
    `${pad("ID", idWidth)}  ` + `${pad("NAME", nameWidth)}  ` + `${pad("UNIQUE ID", uniqueIdWidth)}`;

  const divider =
    `${"-".repeat(idWidth)}  ` + `${"-".repeat(nameWidth)}  ` + `${"-".repeat(uniqueIdWidth)}`;

  process.stdout.write(`${header}\n${divider}\n`);

  for (const row of rows) {
    const line =
      `${pad(truncate(row.id, idWidth), idWidth)}  ` +
      `${pad(truncate(row.name, nameWidth), nameWidth)}  ` +
      `${pad(truncate(row.uniqueId, uniqueIdWidth), uniqueIdWidth)}`;

    process.stdout.write(`${line}\n`);
  }
}

function summarizeValue(values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  const [first] = values;
  const extraCount = values.length - 1;
  return extraCount > 0 ? `${first} (+${extraCount})` : first;
}

function truncate(value: string, width: number): string {
  if (value.length <= width) {
    return value;
  }

  if (width <= 3) {
    return value.slice(0, width);
  }

  return `${value.slice(0, width - 3)}...`;
}

function pad(value: string, width: number): string {
  return value.padEnd(width, " ");
}

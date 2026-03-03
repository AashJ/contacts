import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
  Contact,
  ContactField,
  GetContactResult,
  Group,
  ListContactsResult,
  ListGroupsResult,
  SearchField,
} from "../domain/types";
import type {
  ContactMutationResult,
  CreateContactInput,
  GetContactQuery,
  ListContactsQuery,
  SearchContactsQuery,
} from "./provider";
import { ContactsProvider } from "./provider";

interface JsonContactsStore {
  contacts: Contact[];
  groups: Group[];
}

export class JsonFileContactsProvider extends ContactsProvider {
  override async listContacts(query: ListContactsQuery): Promise<ListContactsResult> {
    const sourcePath = this.requireSourcePath();
    const store = await this.readStore(sourcePath);
    const contacts = sortContacts(store.contacts);

    return {
      sourcePath,
      contacts: typeof query.limit === "number" ? contacts.slice(0, query.limit) : contacts,
    };
  }

  override async searchContacts(query: SearchContactsQuery): Promise<ListContactsResult> {
    const normalizedQuery = query.query.trim().toLowerCase();
    if (!normalizedQuery) {
      throw new Error("Search query cannot be empty.");
    }

    const sourcePath = this.requireSourcePath();
    const store = await this.readStore(sourcePath);
    const contacts = sortContacts(store.contacts).filter((contact) =>
      contactMatchesQuery(contact, normalizedQuery, query.field),
    );

    return {
      sourcePath,
      contacts: typeof query.limit === "number" ? contacts.slice(0, query.limit) : contacts,
    };
  }

  override async getContact(query: GetContactQuery): Promise<GetContactResult> {
    const sourcePath = this.requireSourcePath();
    const store = await this.readStore(sourcePath);
    const contact = store.contacts.find((item) => item.id === query.id) ?? null;

    return {
      sourcePath,
      contact,
    };
  }

  override async listGroups(): Promise<ListGroupsResult> {
    const sourcePath = this.requireSourcePath();
    const store = await this.readStore(sourcePath);
    const groups = [...store.groups].sort(
      (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) || a.id - b.id,
    );

    return {
      sourcePath,
      groups,
    };
  }

  override async createContact(input: CreateContactInput): Promise<ContactMutationResult> {
    const sourcePath = this.requireSourcePath();
    const store = await this.readStore(sourcePath);

    const nextId = nextNumericId(store.contacts.map((contact) => contact.id));
    const uniqueId = `${crypto.randomUUID()}:JSONPerson`;
    const firstName = normalizeOptionalText(input.firstName);
    const lastName = normalizeOptionalText(input.lastName);
    const organization = normalizeOptionalText(input.organization);
    const displayName = buildDisplayName(nextId, firstName, lastName, organization);

    const contact: Contact = {
      id: nextId,
      uniqueId,
      displayName,
      firstName,
      lastName,
      organization,
      emails: [],
      phones: [],
    };

    store.contacts.push(contact);
    await this.writeStore(sourcePath, store);

    return {
      contactId: uniqueId,
      displayName,
    };
  }

  override async addEmailToContact(
    contactId: string,
    email: string,
    label?: string,
  ): Promise<ContactMutationResult> {
    const sourcePath = this.requireSourcePath();
    const store = await this.readStore(sourcePath);
    const contact = findContactForMutation(store.contacts, contactId);
    if (!contact) {
      throw new Error(`No contact found for contactId: ${contactId}`);
    }

    contact.emails.push({
      value: email.trim(),
      label: normalizeOptionalText(label) ?? null,
      isPrimary: contact.emails.length === 0,
    });
    contact.emails = dedupeFields(contact.emails);

    await this.writeStore(sourcePath, store);
    return {
      contactId: contact.uniqueId ?? String(contact.id),
      displayName: contact.displayName,
    };
  }

  override async addPhoneToContact(
    contactId: string,
    phone: string,
    label?: string,
  ): Promise<ContactMutationResult> {
    const sourcePath = this.requireSourcePath();
    const store = await this.readStore(sourcePath);
    const contact = findContactForMutation(store.contacts, contactId);
    if (!contact) {
      throw new Error(`No contact found for contactId: ${contactId}`);
    }

    contact.phones.push({
      value: phone.trim(),
      label: normalizeOptionalText(label) ?? null,
      isPrimary: contact.phones.length === 0,
    });
    contact.phones = dedupeFields(contact.phones);

    await this.writeStore(sourcePath, store);
    return {
      contactId: contact.uniqueId ?? String(contact.id),
      displayName: contact.displayName,
    };
  }

  private requireSourcePath(): string {
    const sourcePath = normalizeOptionalText(this.sourcePath);
    if (!sourcePath) {
      throw new Error("JSON backend requires --source <path> to a contacts JSON file.");
    }

    return resolve(sourcePath);
  }

  private async readStore(sourcePath: string): Promise<JsonContactsStore> {
    const file = Bun.file(sourcePath);
    if (!(await file.exists())) {
      return { contacts: [], groups: [] };
    }

    const rawContent = await file.text();
    if (!rawContent.trim()) {
      return { contacts: [], groups: [] };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch (error) {
      throw new Error(`Invalid JSON in ${sourcePath}: ${String(error)}`);
    }

    return normalizeStore(parsed);
  }

  private async writeStore(sourcePath: string, store: JsonContactsStore): Promise<void> {
    await mkdir(dirname(sourcePath), { recursive: true });
    await Bun.write(sourcePath, `${JSON.stringify(store, null, 2)}\n`);
  }
}

function normalizeStore(value: unknown): JsonContactsStore {
  if (!value || typeof value !== "object") {
    return { contacts: [], groups: [] };
  }

  const root = value as { contacts?: unknown; groups?: unknown };
  const contactsRaw = Array.isArray(root.contacts) ? root.contacts : [];
  const groupsRaw = Array.isArray(root.groups) ? root.groups : [];

  return {
    contacts: contactsRaw.map((entry, index) => normalizeContact(entry, index + 1)),
    groups: groupsRaw.map((entry, index) => normalizeGroup(entry, index + 1)),
  };
}

function normalizeContact(value: unknown, fallbackId: number): Contact {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const id = toPositiveInteger(raw.id) ?? fallbackId;
  const uniqueId = toOptionalString(raw.uniqueId);
  const firstName = toOptionalString(raw.firstName);
  const lastName = toOptionalString(raw.lastName);
  const organization = toOptionalString(raw.organization);
  const displayName = toOptionalString(raw.displayName) ?? buildDisplayName(id, firstName, lastName, organization);

  return {
    id,
    uniqueId,
    displayName,
    firstName,
    lastName,
    organization,
    emails: normalizeFields(raw.emails),
    phones: normalizeFields(raw.phones),
  };
}

function normalizeGroup(value: unknown, fallbackId: number): Group {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const id = toPositiveInteger(raw.id) ?? fallbackId;
  const uniqueId = toOptionalString(raw.uniqueId);
  const name = toOptionalString(raw.name) ?? `group-${id}`;

  return {
    id,
    uniqueId,
    name,
  };
}

function normalizeFields(value: unknown): ContactField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeFields(
    value
      .map((entry) => normalizeField(entry))
      .filter((entry): entry is ContactField => entry !== null),
  );
}

function normalizeField(value: unknown): ContactField | null {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const fieldValue = toOptionalString(raw.value);
  if (!fieldValue) {
    return null;
  }

  return {
    value: fieldValue,
    label: toOptionalString(raw.label),
    isPrimary: Boolean(raw.isPrimary),
  };
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function nextNumericId(values: number[]): number {
  if (values.length === 0) {
    return 1;
  }

  return Math.max(...values) + 1;
}

function buildDisplayName(
  id: number,
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  organization: string | null | undefined,
): string {
  const personName = [firstName ?? null, lastName ?? null].filter(Boolean).join(" ");
  if (personName) {
    return personName;
  }

  if (organization) {
    return organization;
  }

  return `contact-${id}`;
}

function dedupeFields(fields: ContactField[]): ContactField[] {
  const seen = new Set<string>();
  const deduped: ContactField[] = [];

  for (const field of fields) {
    const key = `${field.value}::${field.label ?? ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(field);
  }

  return deduped;
}

function sortContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }) || a.id - b.id,
  );
}

function contactMatchesQuery(contact: Contact, query: string, field?: SearchField): boolean {
  if (field === "name") {
    return contactMatchesName(contact, query);
  }

  if (field === "email") {
    return contact.emails.some((email) => email.value.toLowerCase().includes(query));
  }

  if (field === "phone") {
    return contact.phones.some((phone) => phone.value.toLowerCase().includes(query));
  }

  return (
    contactMatchesName(contact, query) ||
    contact.emails.some((email) => email.value.toLowerCase().includes(query)) ||
    contact.phones.some((phone) => phone.value.toLowerCase().includes(query))
  );
}

function contactMatchesName(contact: Contact, query: string): boolean {
  return [contact.displayName, contact.firstName, contact.lastName, contact.organization]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(query));
}

function findContactForMutation(contacts: Contact[], contactId: string): Contact | undefined {
  const normalizedContactId = contactId.trim();
  if (!normalizedContactId) {
    return undefined;
  }

  return contacts.find(
    (contact) =>
      contact.uniqueId === normalizedContactId || String(contact.id) === normalizedContactId,
  );
}

import { Database } from "bun:sqlite";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  Contact,
  ContactField,
  GetContactResult,
  Group,
  ListContactsResult,
  ListGroupsResult,
  SearchField,
} from "../domain/types";

const DEFAULT_SOURCES_SUBPATH = "Library/Application Support/AddressBook/Sources";

interface ListContactsOptions {
  limit?: number;
  sourcePath?: string;
  verbose?: boolean;
}

interface SearchContactsOptions {
  query: string;
  field?: SearchField;
  limit?: number;
  sourcePath?: string;
  verbose?: boolean;
}

interface GetContactOptions {
  id: number;
  sourcePath?: string;
  verbose?: boolean;
}

interface ListGroupsOptions {
  sourcePath?: string;
  verbose?: boolean;
}

interface ContactRow {
  id: number;
  unique_id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
}

interface ContactFieldRow {
  owner_id: number;
  value: string | null;
  label: string | null;
  is_primary: number;
}

interface GroupRow {
  id: number;
  unique_id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
}

interface Candidate {
  path: string;
  mtime: number;
}

export async function listContacts(options: ListContactsOptions): Promise<ListContactsResult> {
  const sourcePath = await resolveSourcePath(options.sourcePath);
  logSourcePath(sourcePath, options.verbose);

  const db = new Database(sourcePath, { readonly: true });

  try {
    const contacts = queryContacts(db, options.limit);
    hydrateContactFields(db, contacts);
    return { sourcePath, contacts };
  } finally {
    db.close();
  }
}

export async function searchContacts(options: SearchContactsOptions): Promise<ListContactsResult> {
  const normalizedQuery = normalizeText(options.query)?.toLowerCase();
  if (!normalizedQuery) {
    throw new Error("Search query cannot be empty.");
  }

  const sourcePath = await resolveSourcePath(options.sourcePath);
  logSourcePath(sourcePath, options.verbose);

  const db = new Database(sourcePath, { readonly: true });

  try {
    const contacts = queryContacts(db);
    hydrateContactFields(db, contacts);

    const filtered = contacts.filter((contact) =>
      contactMatchesQuery(contact, normalizedQuery, options.field),
    );

    const limited =
      typeof options.limit === "number" ? filtered.slice(0, options.limit) : filtered;

    return {
      sourcePath,
      contacts: limited,
    };
  } finally {
    db.close();
  }
}

export async function getContact(options: GetContactOptions): Promise<GetContactResult> {
  const sourcePath = await resolveSourcePath(options.sourcePath);
  logSourcePath(sourcePath, options.verbose);

  const db = new Database(sourcePath, { readonly: true });

  try {
    const row = db
      .query(
        `
        SELECT
          Z_PK AS id,
          ZUNIQUEID AS unique_id,
          ZNAME AS full_name,
          ZFIRSTNAME AS first_name,
          ZLASTNAME AS last_name,
          ZORGANIZATION AS organization
        FROM ZABCDRECORD
        WHERE
          COALESCE(ZISALL, 0) = 0
          AND ZUNIQUEID LIKE '%:ABPerson'
          AND Z_PK = ?1
        `,
      )
      .get(options.id) as ContactRow | null;

    if (!row) {
      return {
        sourcePath,
        contact: null,
      };
    }

    const contact = toContact(row);
    hydrateContactFields(db, [contact]);

    return {
      sourcePath,
      contact,
    };
  } finally {
    db.close();
  }
}

export async function listGroups(options: ListGroupsOptions): Promise<ListGroupsResult> {
  const sourcePath = await resolveSourcePath(options.sourcePath);
  logSourcePath(sourcePath, options.verbose);

  const db = new Database(sourcePath, { readonly: true });

  try {
    const groups = queryGroups(db);
    return {
      sourcePath,
      groups,
    };
  } finally {
    db.close();
  }
}

async function resolveSourcePath(sourcePath?: string): Promise<string> {
  return sourcePath ?? (await discoverAddressBookPath());
}

function logSourcePath(sourcePath: string, verbose?: boolean): void {
  if (verbose) {
    console.error(`[contacts] using database: ${sourcePath}`);
  }
}

async function discoverAddressBookPath(): Promise<string> {
  const home = process.env.HOME;
  if (!home) {
    throw new Error("Could not resolve HOME to locate macOS Contacts database.");
  }

  const candidateSourceDirs = [
    join(home, DEFAULT_SOURCES_SUBPATH),
    join(home, "Library/Containers/com.apple.AddressBook/Data/Library/AddressBook/Sources"),
    join(home, "Library/Group Containers/group.com.apple.contacts/AddressBook/Sources"),
    join(home, "Library/Group Containers/group.com.apple.AddressBook/AddressBook/Sources"),
  ];

  const candidates: Candidate[] = [];
  const issues: string[] = [];

  for (const sourceDir of candidateSourceDirs) {
    try {
      const sourceEntries = await readdir(sourceDir, { withFileTypes: true });

      for (const sourceEntry of sourceEntries) {
        if (!sourceEntry.isDirectory()) {
          continue;
        }

        const sourcePath = join(sourceDir, sourceEntry.name);
        const files = await readdir(sourcePath, { withFileTypes: true });

        for (const file of files) {
          if (!file.isFile()) {
            continue;
          }

          if (!/^AddressBook-v\d+\.abcddb$/.test(file.name)) {
            continue;
          }

          const fullPath = join(sourcePath, file.name);
          candidates.push({
            path: fullPath,
            mtime: Bun.file(fullPath).lastModified,
          });
        }
      }
    } catch (error) {
      issues.push(formatSourceDirectoryIssue(sourceDir, error));
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.mtime - a.mtime || a.path.localeCompare(b.path));
    return candidates[0].path;
  }

  throw new Error(buildDiscoveryError(candidateSourceDirs, issues));
}

function formatSourceDirectoryIssue(sourceDir: string, error: unknown): string {
  if (error && typeof error === "object") {
    const nodeError = error as { code?: string; message?: string };

    if (nodeError.code && nodeError.message) {
      return `${sourceDir} -> ${nodeError.code}: ${nodeError.message}`;
    }

    if (nodeError.message) {
      return `${sourceDir} -> ${nodeError.message}`;
    }
  }

  return `${sourceDir} -> ${String(error)}`;
}

function buildDiscoveryError(sourceDirs: string[], issues: string[]): string {
  const issueSummary = issues.length > 0 ? `\n\nDirectory checks:\n- ${issues.join("\n- ")}` : "";
  const hasPermissionError = issues.some(
    (issue) =>
      issue.includes("EPERM") ||
      issue.includes("EACCES") ||
      issue.includes("Operation not permitted"),
  );

  const permissionHint = hasPermissionError
    ? "\n\nPermission hint:\n- macOS may block direct DB reads. In System Settings > Privacy & Security:\n  1. Add your terminal app and Bun to Full Disk Access\n  2. Allow Contacts access for the same app\n- Then rerun the command."
    : "";

  return (
    `Could not locate a readable macOS Contacts database. Checked:\n- ${sourceDirs.join("\n- ")}` +
    issueSummary +
    permissionHint
  );
}

function queryContacts(db: Database, limit?: number): Contact[] {
  const baseQuery = `
      SELECT
        Z_PK AS id,
        ZUNIQUEID AS unique_id,
        ZNAME AS full_name,
        ZFIRSTNAME AS first_name,
        ZLASTNAME AS last_name,
        ZORGANIZATION AS organization
      FROM ZABCDRECORD
      WHERE
        COALESCE(ZISALL, 0) = 0
        AND ZUNIQUEID LIKE '%:ABPerson'
      ORDER BY
        LOWER(
          COALESCE(
            NULLIF(TRIM(ZNAME), ''),
            NULLIF(TRIM(COALESCE(ZFIRSTNAME, '') || ' ' || COALESCE(ZLASTNAME, '')), ''),
            NULLIF(TRIM(ZORGANIZATION), ''),
            CAST(Z_PK AS TEXT)
          )
        ),
        Z_PK
      `;

  const rows =
    typeof limit === "number"
      ? (db.query(`${baseQuery}\nLIMIT ?1`).all(limit) as ContactRow[])
      : (db.query(baseQuery).all() as ContactRow[]);

  return rows.map((row) => toContact(row));
}

function queryGroups(db: Database): Group[] {
  const rows = db
    .query(
      `
      SELECT
        Z_PK AS id,
        ZUNIQUEID AS unique_id,
        ZNAME AS full_name,
        ZFIRSTNAME AS first_name,
        ZLASTNAME AS last_name,
        ZORGANIZATION AS organization
      FROM ZABCDRECORD
      WHERE
        COALESCE(ZISALL, 0) = 0
        AND ZUNIQUEID LIKE '%:ABGroup'
      ORDER BY
        LOWER(
          COALESCE(
            NULLIF(TRIM(ZNAME), ''),
            NULLIF(TRIM(COALESCE(ZFIRSTNAME, '') || ' ' || COALESCE(ZLASTNAME, '')), ''),
            NULLIF(TRIM(ZORGANIZATION), ''),
            CAST(Z_PK AS TEXT)
          )
        ),
        Z_PK
      `,
    )
    .all() as GroupRow[];

  return rows.map((row) => ({
    id: row.id,
    uniqueId: normalizeText(row.unique_id),
    name: toGroupName(row),
  }));
}

function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    uniqueId: normalizeText(row.unique_id),
    displayName: toDisplayName(row),
    firstName: normalizeText(row.first_name),
    lastName: normalizeText(row.last_name),
    organization: normalizeText(row.organization),
    emails: [],
    phones: [],
  };
}

function hydrateContactFields(db: Database, contacts: Contact[]): void {
  attachFieldValues(db, contacts, "ZABCDEMAILADDRESS", "ZADDRESS", "emails");
  attachFieldValues(db, contacts, "ZABCDPHONENUMBER", "ZFULLNUMBER", "phones");
}

function attachFieldValues(
  db: Database,
  contacts: Contact[],
  tableName: "ZABCDEMAILADDRESS" | "ZABCDPHONENUMBER",
  valueColumn: "ZADDRESS" | "ZFULLNUMBER",
  targetField: "emails" | "phones",
): void {
  if (contacts.length === 0) {
    return;
  }

  const contactIds = contacts.map((contact) => contact.id);
  const contactById = new Map<number, Contact>(contacts.map((contact) => [contact.id, contact]));

  for (const chunk of chunked(contactIds, 400)) {
    const placeholders = chunk.map(() => "?").join(",");

    const rows = db
      .query(
        `
        SELECT
          COALESCE(ZOWNER, Z22_OWNER) AS owner_id,
          ${valueColumn} AS value,
          ZLABEL AS label,
          COALESCE(ZISPRIMARY, 0) AS is_primary
        FROM ${tableName}
        WHERE
          COALESCE(ZOWNER, Z22_OWNER) IN (${placeholders})
          AND NULLIF(TRIM(${valueColumn}), '') IS NOT NULL
        ORDER BY
          owner_id,
          COALESCE(ZORDERINGINDEX, 0),
          Z_PK
        `,
      )
      .all(...chunk) as ContactFieldRow[];

    for (const row of rows) {
      const contact = contactById.get(row.owner_id);
      if (!contact) {
        continue;
      }

      const value = normalizeText(row.value);
      if (!value) {
        continue;
      }

      contact[targetField].push({
        value,
        label: normalizeLabel(row.label),
        isPrimary: Boolean(row.is_primary),
      });
    }
  }

  for (const contact of contacts) {
    contact[targetField] = dedupeFields(contact[targetField]);
  }
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
  const candidateNames = [
    contact.displayName,
    contact.firstName,
    contact.lastName,
    contact.organization,
  ].filter((value): value is string => Boolean(value));

  return candidateNames.some((value) => value.toLowerCase().includes(query));
}

function toDisplayName(row: ContactRow): string {
  const fullName = normalizeText(row.full_name);
  if (fullName) {
    return fullName;
  }

  const first = normalizeText(row.first_name);
  const last = normalizeText(row.last_name);
  const personName = [first, last].filter(Boolean).join(" ");
  if (personName) {
    return personName;
  }

  const organization = normalizeText(row.organization);
  if (organization) {
    return organization;
  }

  return `contact-${row.id}`;
}

function toGroupName(row: GroupRow): string {
  const fullName = normalizeText(row.full_name);
  if (fullName) {
    return fullName;
  }

  const first = normalizeText(row.first_name);
  const last = normalizeText(row.last_name);
  const composed = [first, last].filter(Boolean).join(" ");
  if (composed) {
    return composed;
  }

  const organization = normalizeText(row.organization);
  if (organization) {
    return organization;
  }

  return `group-${row.id}`;
}

function normalizeText(value: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLabel(label: string | null): string | null {
  const normalized = normalizeText(label);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^_\$!<(.+)>!\$_$/);
  if (match) {
    return match[1].trim().toLowerCase();
  }

  return normalized.toLowerCase();
}

function chunked<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }

  return chunks;
}

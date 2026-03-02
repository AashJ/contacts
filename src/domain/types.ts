export type OutputFormat = "auto" | "table" | "json" | "ndjson";
export type TableJsonFormat = "table" | "json";
export type ExportFileFormat = "json" | "csv";
export type SearchField = "name" | "email" | "phone";

export interface ContactField {
  value: string;
  label: string | null;
  isPrimary: boolean;
}

export interface Contact {
  id: number;
  uniqueId: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  organization: string | null;
  emails: ContactField[];
  phones: ContactField[];
}

export interface ListContactsResult {
  sourcePath: string;
  contacts: Contact[];
}

export interface GetContactResult {
  sourcePath: string;
  contact: Contact | null;
}

export interface Group {
  id: number;
  uniqueId: string | null;
  name: string;
}

export interface ListGroupsResult {
  sourcePath: string;
  groups: Group[];
}

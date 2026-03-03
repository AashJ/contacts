import type {
  GetContactResult,
  ListContactsResult,
  ListGroupsResult,
  SearchField,
} from "../domain/types";

export interface ProviderContext {
  sourcePath?: string;
  verbose?: boolean;
}

export interface ListContactsQuery {
  limit?: number;
}

export interface SearchContactsQuery {
  query: string;
  field?: SearchField;
  limit?: number;
}

export interface GetContactQuery {
  id: number;
}

export interface CreateContactInput {
  firstName?: string;
  lastName?: string;
  organization?: string;
  note?: string;
}

export interface ContactMutationResult {
  contactId: string;
  displayName: string;
}

export abstract class ContactsProvider {
  protected readonly sourcePath?: string;
  protected readonly verbose?: boolean;

  constructor(context: ProviderContext) {
    this.sourcePath = context.sourcePath;
    this.verbose = context.verbose;
  }

  abstract listContacts(query: ListContactsQuery): Promise<ListContactsResult>;
  abstract searchContacts(query: SearchContactsQuery): Promise<ListContactsResult>;
  abstract getContact(query: GetContactQuery): Promise<GetContactResult>;
  abstract listGroups(): Promise<ListGroupsResult>;
  abstract createContact(input: CreateContactInput): Promise<ContactMutationResult>;
  abstract addEmailToContact(
    contactId: string,
    email: string,
    label?: string,
  ): Promise<ContactMutationResult>;
  abstract addPhoneToContact(
    contactId: string,
    phone: string,
    label?: string,
  ): Promise<ContactMutationResult>;
}

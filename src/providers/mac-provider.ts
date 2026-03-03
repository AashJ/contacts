import { getContact, listContacts, listGroups, searchContacts } from "./macos-address-book";
import {
  addEmailToContact,
  addPhoneToContact,
  createContact,
} from "./macos-contacts-writer";
import type {
  ContactMutationResult,
  CreateContactInput,
  GetContactQuery,
  ListContactsQuery,
  SearchContactsQuery,
} from "./provider";
import { ContactsProvider } from "./provider";

export class MacContactsProvider extends ContactsProvider {
  override async listContacts(query: ListContactsQuery) {
    return listContacts({
      limit: query.limit,
      sourcePath: this.sourcePath,
      verbose: this.verbose,
    });
  }

  override async searchContacts(query: SearchContactsQuery) {
    return searchContacts({
      query: query.query,
      field: query.field,
      limit: query.limit,
      sourcePath: this.sourcePath,
      verbose: this.verbose,
    });
  }

  override async getContact(query: GetContactQuery) {
    return getContact({
      id: query.id,
      sourcePath: this.sourcePath,
      verbose: this.verbose,
    });
  }

  override async listGroups() {
    return listGroups({
      sourcePath: this.sourcePath,
      verbose: this.verbose,
    });
  }

  override async createContact(input: CreateContactInput): Promise<ContactMutationResult> {
    return createContact({
      firstName: input.firstName,
      lastName: input.lastName,
      organization: input.organization,
      note: input.note,
    });
  }

  override async addEmailToContact(
    contactId: string,
    email: string,
    label?: string,
  ): Promise<ContactMutationResult> {
    return addEmailToContact(contactId, email, label);
  }

  override async addPhoneToContact(
    contactId: string,
    phone: string,
    label?: string,
  ): Promise<ContactMutationResult> {
    return addPhoneToContact(contactId, phone, label);
  }
}

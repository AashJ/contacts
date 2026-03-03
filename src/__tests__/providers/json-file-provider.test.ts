import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonFileContactsProvider } from "../../providers/json-file-provider";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("json file provider", () => {
  test("requires source path for json backend", async () => {
    const provider = new JsonFileContactsProvider({});
    await expect(provider.listContacts({})).rejects.toThrow("JSON backend requires --source");
  });

  test("supports create/list/get/search and field mutations", async () => {
    const sourcePath = createTempSourcePath();
    const provider = new JsonFileContactsProvider({ sourcePath });

    const created = await provider.createContact({ firstName: "Jane", lastName: "Doe" });
    expect(created.contactId.endsWith(":JSONPerson")).toBe(true);
    expect(created.displayName).toBe("Jane Doe");

    await provider.addEmailToContact(created.contactId, "jane@example.com", "home");
    await provider.addPhoneToContact(created.contactId, "+1 555 0100", "mobile");

    const listed = await provider.listContacts({});
    expect(listed.contacts).toHaveLength(1);
    expect(listed.contacts[0].displayName).toBe("Jane Doe");
    expect(listed.contacts[0].emails).toEqual([
      { value: "jane@example.com", label: "home", isPrimary: true },
    ]);
    expect(listed.contacts[0].phones).toEqual([
      { value: "+1 555 0100", label: "mobile", isPrimary: true },
    ]);

    const fetched = await provider.getContact({ id: listed.contacts[0].id });
    expect(fetched.contact?.displayName).toBe("Jane Doe");

    const searchByEmail = await provider.searchContacts({
      query: "example.com",
      field: "email",
    });
    expect(searchByEmail.contacts.map((contact) => contact.displayName)).toEqual(["Jane Doe"]);
  });

  test("reads existing groups and contacts from json file", async () => {
    const sourcePath = createTempSourcePath();
    await Bun.write(
      sourcePath,
      `${JSON.stringify(
        {
          contacts: [
            {
              id: 12,
              uniqueId: "person-12:JSONPerson",
              displayName: "Acme Co",
              organization: "Acme Co",
              emails: [{ value: "info@acme.test", label: "work", isPrimary: true }],
              phones: [],
            },
          ],
          groups: [
            {
              id: 1,
              uniqueId: "group-1:JSONGroup",
              name: "Vendors",
            },
          ],
        },
        null,
        2,
      )}\n`,
    );

    const provider = new JsonFileContactsProvider({ sourcePath });
    const groups = await provider.listGroups();
    const contacts = await provider.listContacts({});

    expect(groups.groups).toEqual([
      {
        id: 1,
        uniqueId: "group-1:JSONGroup",
        name: "Vendors",
      },
    ]);
    expect(contacts.contacts.map((contact) => contact.displayName)).toEqual(["Acme Co"]);
  });
});

function createTempSourcePath(): string {
  const dir = mkdtempSync(join(tmpdir(), "contacts-json-provider-"));
  tempDirs.push(dir);
  return join(dir, "contacts.json");
}

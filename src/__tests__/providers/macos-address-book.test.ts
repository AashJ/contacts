import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getContact,
  listContacts,
  listGroups,
  searchContacts,
} from "../../providers/macos-address-book";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("macOS address book provider", () => {
  test("returns all ABPerson records when no limit is provided", async () => {
    const dbPath = createFixtureDatabase();

    const result = await listContacts({ sourcePath: dbPath });

    expect(result.sourcePath).toBe(dbPath);
    expect(result.contacts).toHaveLength(3);
    expect(result.contacts.map((contact) => contact.displayName)).toEqual([
      "Acme LLC",
      "Alice Zephyr",
      "Bob Yellow",
    ]);
  });

  test("returns only ABPerson records sorted and limited", async () => {
    const dbPath = createFixtureDatabase();

    const result = await listContacts({ sourcePath: dbPath, limit: 2 });

    expect(result.sourcePath).toBe(dbPath);
    expect(result.contacts).toHaveLength(2);
    expect(result.contacts.map((contact) => contact.displayName)).toEqual([
      "Acme LLC",
      "Alice Zephyr",
    ]);
  });

  test("attaches and normalizes email/phone fields", async () => {
    const dbPath = createFixtureDatabase();

    const result = await listContacts({ sourcePath: dbPath, limit: 10 });

    const bob = result.contacts.find((contact) => contact.displayName === "Bob Yellow");
    expect(bob).toBeDefined();
    expect(bob?.emails).toEqual([{ value: "bob@example.com", label: "home", isPrimary: true }]);
    expect(bob?.phones).toEqual([]);

    const alice = result.contacts.find((contact) => contact.displayName === "Alice Zephyr");
    expect(alice).toBeDefined();
    expect(alice?.emails).toEqual([
      { value: "alice@work.test", label: "work", isPrimary: true },
      { value: "alice+extra@test.dev", label: null, isPrimary: false },
    ]);
    expect(alice?.phones).toEqual([
      { value: "+1 (555) 000-0001", label: "mobile", isPrimary: true },
    ]);
  });

  test("searches contacts by name, email, and phone", async () => {
    const dbPath = createFixtureDatabase();

    const byName = await searchContacts({ sourcePath: dbPath, query: "alice", field: "name" });
    expect(byName.contacts.map((contact) => contact.displayName)).toEqual(["Alice Zephyr"]);

    const byEmail = await searchContacts({ sourcePath: dbPath, query: "example.com", field: "email" });
    expect(byEmail.contacts.map((contact) => contact.displayName)).toEqual(["Bob Yellow"]);

    const byPhone = await searchContacts({ sourcePath: dbPath, query: "000-0001", field: "phone" });
    expect(byPhone.contacts.map((contact) => contact.displayName)).toEqual(["Alice Zephyr"]);
  });

  test("gets contact by id and returns null for missing ids", async () => {
    const dbPath = createFixtureDatabase();

    const found = await getContact({ sourcePath: dbPath, id: 101 });
    expect(found.contact?.displayName).toBe("Bob Yellow");
    expect(found.contact?.emails).toEqual([
      { value: "bob@example.com", label: "home", isPrimary: true },
    ]);

    const missing = await getContact({ sourcePath: dbPath, id: 999 });
    expect(missing.contact).toBeNull();
  });

  test("lists groups from ABGroup records", async () => {
    const dbPath = createFixtureDatabase();

    const result = await listGroups({ sourcePath: dbPath });

    expect(result.groups).toEqual([
      {
        id: 2,
        uniqueId: "group:ABGroup",
        name: "Friends",
      },
    ]);
  });
});

function createFixtureDatabase(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "mac-contacts-test-"));
  tempDirs.push(tempDir);

  const dbPath = join(tempDir, "AddressBook-v22.abcddb");
  const db = new Database(dbPath);

  db.run(`
    CREATE TABLE ZABCDRECORD (
      Z_PK INTEGER PRIMARY KEY,
      ZISALL INTEGER,
      ZUNIQUEID TEXT,
      ZNAME TEXT,
      ZFIRSTNAME TEXT,
      ZLASTNAME TEXT,
      ZORGANIZATION TEXT
    );

    CREATE TABLE ZABCDEMAILADDRESS (
      Z_PK INTEGER PRIMARY KEY,
      ZOWNER INTEGER,
      Z22_OWNER INTEGER,
      ZADDRESS TEXT,
      ZLABEL TEXT,
      ZISPRIMARY INTEGER,
      ZORDERINGINDEX INTEGER
    );

    CREATE TABLE ZABCDPHONENUMBER (
      Z_PK INTEGER PRIMARY KEY,
      ZOWNER INTEGER,
      Z22_OWNER INTEGER,
      ZFULLNUMBER TEXT,
      ZLABEL TEXT,
      ZISPRIMARY INTEGER,
      ZORDERINGINDEX INTEGER
    );
  `);

  db.run(`
    INSERT INTO ZABCDRECORD (Z_PK, ZISALL, ZUNIQUEID, ZNAME, ZFIRSTNAME, ZLASTNAME, ZORGANIZATION) VALUES
      (1, 0, 'meta:ABInfo', NULL, NULL, NULL, NULL),
      (2, 0, 'group:ABGroup', 'Friends', NULL, NULL, NULL),
      (101, 0, 'bob:ABPerson', 'Bob Yellow', NULL, NULL, NULL),
      (102, 0, 'alice:ABPerson', NULL, 'Alice', 'Zephyr', NULL),
      (103, 0, 'acme:ABPerson', NULL, NULL, NULL, 'Acme LLC');

    INSERT INTO ZABCDEMAILADDRESS (Z_PK, ZOWNER, Z22_OWNER, ZADDRESS, ZLABEL, ZISPRIMARY, ZORDERINGINDEX) VALUES
      (1, 101, NULL, 'bob@example.com', '_$!<Home>!$_', 1, 0),
      (2, 101, NULL, 'bob@example.com', '_$!<Home>!$_', 0, 1),
      (3, 102, NULL, 'alice@work.test', '_$!<Work>!$_', 1, 0),
      (4, 102, NULL, 'alice+extra@test.dev', NULL, 0, 1),
      (5, 103, NULL, ' ', '_$!<Work>!$_', 1, 0);

    INSERT INTO ZABCDPHONENUMBER (Z_PK, ZOWNER, Z22_OWNER, ZFULLNUMBER, ZLABEL, ZISPRIMARY, ZORDERINGINDEX) VALUES
      (1, 102, NULL, '+1 (555) 000-0001', '_$!<Mobile>!$_', 1, 0),
      (2, 101, NULL, ' ', '_$!<Mobile>!$_', 1, 0);
  `);

  db.close();
  return dbPath;
}

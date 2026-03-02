import { describe, expect, test } from "bun:test";
import type { Contact } from "../../domain/types";
import { contactsToCsv, parseExportFormat } from "../../commands/export";

describe("export command parsing", () => {
  test("parseExportFormat accepts supported values", () => {
    expect(parseExportFormat("json")).toBe("json");
    expect(parseExportFormat("csv")).toBe("csv");
    expect(parseExportFormat(" CSV ")).toBe("csv");
  });

  test("parseExportFormat rejects unsupported values", () => {
    expect(() => parseExportFormat("table")).toThrow();
    expect(() => parseExportFormat("ndjson")).toThrow();
  });
});

describe("contactsToCsv", () => {
  test("serializes contacts with escaped fields", () => {
    const contacts: Contact[] = [
      {
        id: 7,
        uniqueId: "abc:ABPerson",
        displayName: "Doe, Jane",
        firstName: "Jane",
        lastName: "Doe",
        organization: "Acme \"North\"",
        emails: [{ value: "jane@example.com", label: "work", isPrimary: true }],
        phones: [{ value: "+1,555,123", label: null, isPrimary: false }],
      },
    ];

    const csv = contactsToCsv(contacts);
    const lines = csv.trimEnd().split("\n");

    expect(lines[0]).toBe("id,uniqueId,displayName,firstName,lastName,organization,emails,phones");
    expect(lines[1]).toBe(
      '7,abc:ABPerson,"Doe, Jane",Jane,Doe,"Acme ""North""",work: jane@example.com [primary],"+1,555,123"',
    );
  });
});

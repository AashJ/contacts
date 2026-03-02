import { describe, expect, test } from "bun:test";
import {
  parseAddOutputFormat,
  parseContactIdentifier,
  parseEmailValue,
  parsePhoneValue,
} from "../../commands/add";

describe("add command parsing", () => {
  test("parseAddOutputFormat accepts supported values", () => {
    expect(parseAddOutputFormat("table")).toBe("table");
    expect(parseAddOutputFormat("json")).toBe("json");
    expect(parseAddOutputFormat(" JSON ")).toBe("json");
  });

  test("parseAddOutputFormat rejects unsupported values", () => {
    expect(() => parseAddOutputFormat("ndjson")).toThrow();
    expect(() => parseAddOutputFormat("csv")).toThrow();
  });

  test("parseContactIdentifier accepts non-empty values", () => {
    expect(parseContactIdentifier("abc:ABPerson")).toBe("abc:ABPerson");
    expect(parseContactIdentifier("  123  ")).toBe("123");
  });

  test("parseContactIdentifier rejects empty values", () => {
    expect(() => parseContactIdentifier("")).toThrow();
    expect(() => parseContactIdentifier("   ")).toThrow();
  });

  test("parseEmailValue and parsePhoneValue require non-empty values", () => {
    expect(parseEmailValue("  user@example.com  ")).toBe("user@example.com");
    expect(parsePhoneValue("  +1 555 000 0000  ")).toBe("+1 555 000 0000");
    expect(() => parseEmailValue(" ")).toThrow();
    expect(() => parsePhoneValue(" ")).toThrow();
  });
});

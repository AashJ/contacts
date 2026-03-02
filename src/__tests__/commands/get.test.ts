import { describe, expect, test } from "bun:test";
import { parseContactId, parseGetOutputFormat } from "../../commands/get";

describe("get command parsing", () => {
  test("parseContactId accepts positive integers", () => {
    expect(parseContactId("1")).toBe(1);
    expect(parseContactId("0012")).toBe(12);
  });

  test("parseContactId rejects invalid values", () => {
    expect(() => parseContactId("0")).toThrow();
    expect(() => parseContactId("-1")).toThrow();
    expect(() => parseContactId("abc")).toThrow();
    expect(() => parseContactId("1.2")).toThrow();
  });

  test("parseGetOutputFormat accepts supported formats", () => {
    expect(parseGetOutputFormat("table")).toBe("table");
    expect(parseGetOutputFormat("json")).toBe("json");
  });

  test("parseGetOutputFormat rejects unsupported formats", () => {
    expect(() => parseGetOutputFormat("ndjson")).toThrow();
    expect(() => parseGetOutputFormat("csv")).toThrow();
  });
});

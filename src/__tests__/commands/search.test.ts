import { describe, expect, test } from "bun:test";
import { parseSearchField, parseSearchOutputFormat } from "../../commands/search";

describe("search command parsing", () => {
  test("parseSearchField accepts supported values", () => {
    expect(parseSearchField("name")).toBe("name");
    expect(parseSearchField("email")).toBe("email");
    expect(parseSearchField("phone")).toBe("phone");
    expect(parseSearchField(" EMAIL ")).toBe("email");
  });

  test("parseSearchField rejects unsupported values", () => {
    expect(() => parseSearchField("company")).toThrow();
    expect(() => parseSearchField("")).toThrow();
  });

  test("parseSearchOutputFormat accepts supported values", () => {
    expect(parseSearchOutputFormat("table")).toBe("table");
    expect(parseSearchOutputFormat("json")).toBe("json");
    expect(parseSearchOutputFormat(" JSON ")).toBe("json");
  });

  test("parseSearchOutputFormat rejects unsupported values", () => {
    expect(() => parseSearchOutputFormat("ndjson")).toThrow();
    expect(() => parseSearchOutputFormat("csv")).toThrow();
  });
});

import { describe, expect, test } from "bun:test";
import { parseLimit, parseOutputFormat, resolveOutputFormat } from "../../commands/list";

describe("list command option parsing", () => {
  test("parseLimit accepts positive integers", () => {
    expect(parseLimit("1")).toBe(1);
    expect(parseLimit("250")).toBe(250);
    expect(parseLimit("0010")).toBe(10);
  });

  test("parseLimit rejects invalid values", () => {
    expect(() => parseLimit("0")).toThrow();
    expect(() => parseLimit("-1")).toThrow();
    expect(() => parseLimit("10.5")).toThrow();
    expect(() => parseLimit("10abc")).toThrow();
    expect(() => parseLimit("abc")).toThrow();
  });

  test("parseOutputFormat accepts supported formats", () => {
    expect(parseOutputFormat("auto")).toBe("auto");
    expect(parseOutputFormat("table")).toBe("table");
    expect(parseOutputFormat("json")).toBe("json");
    expect(parseOutputFormat("ndjson")).toBe("ndjson");
    expect(parseOutputFormat(" JSON ")).toBe("json");
  });

  test("parseOutputFormat rejects unsupported formats", () => {
    expect(() => parseOutputFormat("yaml")).toThrow();
    expect(() => parseOutputFormat("csv")).toThrow();
    expect(() => parseOutputFormat("")).toThrow();
  });
});

describe("output format resolution", () => {
  test("resolves auto to table for TTY", () => {
    expect(resolveOutputFormat("auto", true)).toBe("table");
  });

  test("resolves auto to json when piped", () => {
    expect(resolveOutputFormat("auto", false)).toBe("json");
  });

  test("keeps explicit format unchanged", () => {
    expect(resolveOutputFormat("table", false)).toBe("table");
    expect(resolveOutputFormat("json", true)).toBe("json");
    expect(resolveOutputFormat("ndjson", true)).toBe("ndjson");
  });
});

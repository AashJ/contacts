import { describe, expect, test } from "bun:test";
import { parseGroupsOutputFormat } from "../../commands/groups";

describe("groups command parsing", () => {
  test("parseGroupsOutputFormat accepts supported values", () => {
    expect(parseGroupsOutputFormat("table")).toBe("table");
    expect(parseGroupsOutputFormat("json")).toBe("json");
    expect(parseGroupsOutputFormat(" JSON ")).toBe("json");
  });

  test("parseGroupsOutputFormat rejects unsupported values", () => {
    expect(() => parseGroupsOutputFormat("ndjson")).toThrow();
    expect(() => parseGroupsOutputFormat("csv")).toThrow();
  });
});

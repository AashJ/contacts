import { describe, expect, test } from "bun:test";
import { createContactsProvider, parseBackend } from "../../providers/factory";
import { JsonFileContactsProvider } from "../../providers/json-file-provider";
import { MacContactsProvider } from "../../providers/mac-provider";

describe("provider factory", () => {
  test("parseBackend defaults by platform", () => {
    expect(parseBackend(undefined, "darwin")).toBe("mac");
    expect(parseBackend(undefined, "linux")).toBe("json");
    expect(parseBackend(undefined, "win32")).toBe("json");
  });

  test("parseBackend accepts supported values", () => {
    expect(parseBackend("mac")).toBe("mac");
    expect(parseBackend("json")).toBe("json");
    expect(parseBackend(" JSON ")).toBe("json");
  });

  test("parseBackend rejects unsupported values", () => {
    expect(() => parseBackend("sqlite")).toThrow();
    expect(() => parseBackend("")).toThrow();
  });

  test("factory returns backend-specific providers", () => {
    expect(createContactsProvider({ backend: "mac" }, "darwin")).toBeInstanceOf(
      MacContactsProvider,
    );
    expect(createContactsProvider({ backend: "json", sourcePath: "contacts.json" })).toBeInstanceOf(
      JsonFileContactsProvider,
    );
  });

  test("factory rejects mac backend on non-macOS platforms", () => {
    expect(() => createContactsProvider({ backend: "mac" }, "linux")).toThrow(
      "only available on macOS",
    );
  });

  test("factory forwards --source to provider context", async () => {
    const sourcePath = "/tmp/contacts-factory-source-test.json";
    const provider = createContactsProvider({ backend: "json", sourcePath });
    const result = await provider.listContacts({});
    expect(result.sourcePath).toBe(sourcePath);
  });
});

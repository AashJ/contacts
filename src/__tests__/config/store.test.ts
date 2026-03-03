import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAppConfig, resolveConfigPath, updateAppConfig } from "../../config/store";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("config store", () => {
  test("loads empty config when file is missing", async () => {
    const configPath = createTempConfigPath();
    const loaded = await loadAppConfig(configPath);

    expect(loaded.path).toBe(configPath);
    expect(loaded.values).toEqual({});
  });

  test("updates and reloads persisted backend and source", async () => {
    const configPath = createTempConfigPath();

    const saved = await updateAppConfig(
      {
        backend: "json",
        source: "./contacts.json",
      },
      configPath,
    );

    expect(saved.values).toEqual({
      backend: "json",
      source: "./contacts.json",
    });

    const reloaded = await loadAppConfig(configPath);
    expect(reloaded.values).toEqual({
      backend: "json",
      source: "./contacts.json",
    });
  });

  test("clears source with null update", async () => {
    const configPath = createTempConfigPath();

    await updateAppConfig(
      {
        backend: "json",
        source: "./contacts.json",
      },
      configPath,
    );

    const cleared = await updateAppConfig(
      {
        source: null,
      },
      configPath,
    );

    expect(cleared.values).toEqual({
      backend: "json",
    });
  });

  test("rejects invalid backend in config file", async () => {
    const configPath = createTempConfigPath();
    await Bun.write(configPath, '{ "backend": "sqlite" }\n');

    await expect(loadAppConfig(configPath)).rejects.toThrow("Invalid backend");
  });

  test("resolveConfigPath uses explicit override", () => {
    const configPath = createTempConfigPath();
    expect(resolveConfigPath(configPath)).toBe(configPath);
  });
});

function createTempConfigPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "contacts-config-store-"));
  tempDirs.push(dir);
  return join(dir, "config.json");
}

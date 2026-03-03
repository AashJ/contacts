import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadAppConfig, resolveConfigPath, updateAppConfig } from "../../config/store";

const tempDirs: string[] = [];
const ENV_KEYS = ["CONTACTS_CONFIG", "XDG_CONFIG_HOME", "HOME", "USERPROFILE", "APPDATA"] as const;
const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  restoreEnvironment();

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

  test("resolveConfigPath uses CONTACTS_CONFIG env override", () => {
    process.env.CONTACTS_CONFIG = "./tmp/contacts-config.json";
    expect(resolveConfigPath()).toBe(resolve("./tmp/contacts-config.json"));
  });

  test("resolveConfigPath uses XDG_CONFIG_HOME when set", () => {
    delete process.env.CONTACTS_CONFIG;
    process.env.XDG_CONFIG_HOME = "./tmp/xdg";
    delete process.env.HOME;
    delete process.env.USERPROFILE;
    delete process.env.APPDATA;

    expect(resolveConfigPath()).toBe(resolve("./tmp/xdg/contacts/config.json"));
  });
});

function createTempConfigPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "contacts-config-store-"));
  tempDirs.push(dir);
  return join(dir, "config.json");
}

function restoreEnvironment(): void {
  for (const key of ENV_KEYS) {
    const originalValue = originalEnv.get(key);
    if (typeof originalValue === "string") {
      process.env[key] = originalValue;
    } else {
      delete process.env[key];
    }
  }
}

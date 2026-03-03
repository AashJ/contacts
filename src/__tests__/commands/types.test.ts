import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { updateAppConfig } from "../../config/store";
import { defaultJsonSourcePath, resolveGlobalOptions } from "../../commands/types";
import { defaultBackendForPlatform } from "../../providers/factory";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("global option resolution", () => {
  test("defaults to platform backend when config is empty", async () => {
    const configPath = createTempConfigPath();
    const resolved = await resolveGlobalOptions({ config: configPath });
    const expectedBackend = defaultBackendForPlatform();

    expect(resolved.backend).toBe(expectedBackend);
    expect(resolved.sourcePath).toBe(
      expectedBackend === "json" ? defaultJsonSourcePath(configPath) : undefined,
    );
    expect(resolved.configPath).toBe(configPath);
  });

  test("defaults json source path when backend resolves to json without source", async () => {
    const configPath = createTempConfigPath();
    await updateAppConfig(
      {
        backend: "json",
      },
      configPath,
    );

    const resolved = await resolveGlobalOptions({ config: configPath });
    expect(resolved.backend).toBe("json");
    expect(resolved.sourcePath).toBe(defaultJsonSourcePath(configPath));
  });

  test("uses persisted backend and source from config", async () => {
    const configPath = createTempConfigPath();
    await updateAppConfig(
      {
        backend: "json",
        source: "./contacts.json",
      },
      configPath,
    );

    const resolved = await resolveGlobalOptions({ config: configPath });
    expect(resolved.backend).toBe("json");
    expect(resolved.sourcePath).toBe("./contacts.json");
  });

  test("cli options override persisted config", async () => {
    const configPath = createTempConfigPath();
    await updateAppConfig(
      {
        backend: "json",
        source: "./contacts.json",
      },
      configPath,
    );

    const resolved = await resolveGlobalOptions({
      backend: "mac",
      config: configPath,
      source: "/tmp/AddressBook-v22.abcddb",
      verbose: true,
    });

    expect(resolved.backend).toBe("mac");
    expect(resolved.sourcePath).toBe("/tmp/AddressBook-v22.abcddb");
    expect(resolved.verbose).toBe(true);
  });
});

function createTempConfigPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "contacts-options-"));
  tempDirs.push(dir);
  return join(dir, "config.json");
}

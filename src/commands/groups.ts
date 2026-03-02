import { Command } from "commander";
import type { Group, TableJsonFormat } from "../domain/types";
import { writeJson } from "../output/json";
import { writeGroupsTable } from "../output/table";
import { listGroups } from "../providers/macos-address-book";
import type { GlobalOptions } from "./types";

interface GroupsOptions {
  format: string;
}

export function registerGroupsCommand(program: Command): void {
  program
    .command("groups")
    .description("List contact groups")
    .option("--format <format>", "Output format: table or json", "table")
    .action(async (options: GroupsOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const format = parseGroupsOutputFormat(options.format);

      const result = await listGroups({
        sourcePath: globalOptions.source,
        verbose: globalOptions.verbose,
      });

      renderGroups(result.groups, format);

      if (globalOptions.verbose) {
        console.error(`[mac-contacts] returned ${result.groups.length} group(s) from ${result.sourcePath}`);
      }
    });
}

export function parseGroupsOutputFormat(rawFormat: string): TableJsonFormat {
  const normalized = rawFormat.trim().toLowerCase();

  if (normalized === "table" || normalized === "json") {
    return normalized;
  }

  throw new Error(`Invalid --format value: ${rawFormat}. Expected one of: table, json.`);
}

function renderGroups(groups: Group[], format: TableJsonFormat): void {
  if (format === "table") {
    writeGroupsTable(groups);
    return;
  }

  writeJson(groups);
}

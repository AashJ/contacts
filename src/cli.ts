#!/usr/bin/env bun

import { Command } from "commander";
import { registerAddCommand } from "./commands/add";
import { registerAddEmailCommand } from "./commands/add-email";
import { registerAddPhoneCommand } from "./commands/add-phone";
import { registerExportCommand } from "./commands/export";
import { registerGetCommand } from "./commands/get";
import { registerGroupsCommand } from "./commands/groups";
import { registerListCommand } from "./commands/list";
import { registerSearchCommand } from "./commands/search";

const program = new Command();

program
  .name("mac-contacts")
  .description("CLI for reading macOS Contacts")
  .option("--source <path>", "Path to AddressBook-v*.abcddb")
  .option("--verbose", "Enable verbose logging", false);

registerListCommand(program);
registerSearchCommand(program);
registerGetCommand(program);
registerExportCommand(program);
registerGroupsCommand(program);
registerAddCommand(program);
registerAddEmailCommand(program);
registerAddPhoneCommand(program);

try {
  await program.parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}

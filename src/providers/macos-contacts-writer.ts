import { spawn } from "node:child_process";

export interface CreateContactOptions {
  firstName?: string;
  lastName?: string;
  organization?: string;
  note?: string;
}

export interface CreateContactResult {
  contactId: string;
  displayName: string;
}

export interface AddFieldResult {
  contactId: string;
  displayName: string;
}

export async function createContact(options: CreateContactOptions): Promise<CreateContactResult> {
  const properties: string[] = [];

  if (options.firstName) {
    properties.push(`first name:${toAppleScriptString(options.firstName)}`);
  }

  if (options.lastName) {
    properties.push(`last name:${toAppleScriptString(options.lastName)}`);
  }

  if (options.organization) {
    properties.push(`organization:${toAppleScriptString(options.organization)}`);
  }

  if (options.note) {
    properties.push(`note:${toAppleScriptString(options.note)}`);
  }

  const script = `
tell application "Contacts"
  set newPerson to make new person with properties {${properties.join(", ")}}
  save
  return id of newPerson & tab & name of newPerson
end tell
`;

  const output = await runAppleScript(script);
  const [contactId, displayName] = output.split("\t");

  if (!contactId) {
    throw new Error("Contacts did not return a contact id for the newly created contact.");
  }

  return {
    contactId,
    displayName: displayName ?? "",
  };
}

export async function addEmailToContact(
  contactId: string,
  email: string,
  label?: string,
): Promise<AddFieldResult> {
  const fieldProperties = [`value:${toAppleScriptString(email)}`];
  if (label) {
    fieldProperties.push(`label:${toAppleScriptString(label)}`);
  }

  const script = `
tell application "Contacts"
  set targetPerson to first person whose id is ${toAppleScriptString(contactId)}
  make new email at end of emails of targetPerson with properties {${fieldProperties.join(", ")}}
  save
  return id of targetPerson & tab & name of targetPerson
end tell
`;

  const output = await runAppleScript(script);
  const [resolvedId, displayName] = output.split("\t");

  return {
    contactId: resolvedId || contactId,
    displayName: displayName ?? "",
  };
}

export async function addPhoneToContact(
  contactId: string,
  phone: string,
  label?: string,
): Promise<AddFieldResult> {
  const fieldProperties = [`value:${toAppleScriptString(phone)}`];
  if (label) {
    fieldProperties.push(`label:${toAppleScriptString(label)}`);
  }

  const script = `
tell application "Contacts"
  set targetPerson to first person whose id is ${toAppleScriptString(contactId)}
  make new phone at end of phones of targetPerson with properties {${fieldProperties.join(", ")}}
  save
  return id of targetPerson & tab & name of targetPerson
end tell
`;

  const output = await runAppleScript(script);
  const [resolvedId, displayName] = output.split("\t");

  return {
    contactId: resolvedId || contactId,
    displayName: displayName ?? "",
  };
}

function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("osascript", ["-l", "AppleScript", "-"]);
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error("Could not find osascript. This command only works on macOS."));
        return;
      }

      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const details = stderr.trim() || "unknown osascript error";
        reject(
          new Error(
            `Failed to modify Contacts via AppleScript: ${details}. Ensure Contacts permission is granted for your terminal app.`,
          ),
        );
        return;
      }

      resolve(stdout.trim());
    });

    child.stdin.end(script);
  });
}

function toAppleScriptString(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");

  return `"${escaped}"`;
}

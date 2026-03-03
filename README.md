# contacts

Cross-platform CLI for reading and writing contacts with swappable backends.
Supports macOS, Linux, and Windows.

Developer docs live in [DEV.md](./DEV.md).

## Cross-platform and backends

Supported backends:

- `mac`: macOS only (reads Contacts DB, writes via Contacts.app AppleScript)
- `json`: macOS, Linux, Windows (reads/writes a JSON file)

Platform matrix:

| Platform | Backends | Default backend |
| --- | --- | --- |
| macOS | `mac`, `json` | `mac` |
| Linux | `json` | `json` |
| Windows | `json` | `json` |

Default backend by platform:

- macOS: `mac`
- Linux/Windows: `json`

## Requirements

- Bun
- For `mac` backend only: Contacts permissions for your terminal app and Bun

## Install

### Run from source

```bash
bun install
bun run src/cli.ts --help
```

### Build local binary

```bash
bun build src/cli.ts --compile --outfile bin/contacts
./bin/contacts --help
```

### GitHub Release binaries

Releases publish platform archives:

- `contacts-<tag>-macos-x64.tar.gz`
- `contacts-<tag>-macos-arm64.tar.gz`
- `contacts-<tag>-linux-x64.tar.gz`
- `contacts-<tag>-windows-x64.exe.zip`

## Commands

- `contacts list [--limit <n>] [--format auto|table|json|ndjson]`
- `contacts search <query> [--field name|email|phone] [--format table|json]`
- `contacts get <id> [--format table|json]`
- `contacts groups [--format table|json]`
- `contacts export --format json|csv --out <path>`
- `contacts add [--first <name>] [--last <name>] [--organization <name>] [--email <address>]... [--phone <number>]...`
- `contacts add-email <contactId> <email> [--label <label>]`
- `contacts add-phone <contactId> <phone> [--label <label>]`
- `contacts backend show`
- `contacts backend set <backend> [--default-source <path>] [--clear-source]`

Global flags:

- `--backend <backend>`: `mac` or `json`
- `--config <path>`: config file path override
- `--source <path>`: backend source path override
- `--verbose`: debug logging

## Config and backend persistence

Default config path:

- macOS/Linux: `~/.config/contacts/config.json` (or `$XDG_CONFIG_HOME/contacts/config.json`)
- Windows: `%APPDATA%\contacts\config.json`

Override config location with `--config <path>` or `CONTACTS_CONFIG`.

Set backend once and reuse:

```bash
contacts backend set json --default-source ~/contacts.json
contacts backend show
```

Notes:

- CLI flags override persisted config.
- If backend resolves to `json` and no source is set, the CLI uses `<config-dir>/contacts.json`.
- Missing JSON source file is treated as empty and is created on first write.

## Backends

### mac backend

- Available only on macOS.
- Reads from local Contacts SQLite DB.
- Writes (`add`, `add-email`, `add-phone`) via Contacts.app AppleScript.
- Optional `--source` can point to a specific `AddressBook-v*.abcddb`.

### json backend

- Available on macOS/Linux/Windows.
- Reads and writes to one JSON file.
- `--source` can point to a custom file; otherwise defaults to `<config-dir>/contacts.json`.

Example:

```bash
contacts --backend json --source ./contacts.json list --format table
contacts --backend json --source ./contacts.json add --first Jane --last Doe --email jane@example.com
```

JSON file shape:

```json
{
  "contacts": [
    {
      "id": 1,
      "uniqueId": "abc123:JSONPerson",
      "displayName": "Jane Doe",
      "firstName": "Jane",
      "lastName": "Doe",
      "organization": null,
      "emails": [{ "value": "jane@example.com", "label": "home", "isPrimary": true }],
      "phones": [{ "value": "+1 555 0100", "label": "mobile", "isPrimary": true }]
    }
  ],
  "groups": [{ "id": 1, "uniqueId": "group-1:JSONGroup", "name": "Friends" }]
}
```

## Examples

```bash
# list contacts
contacts list --limit 50

# structured output
contacts list --limit 50 --format json | jq '.[].displayName'
contacts list --limit 50 --format ndjson

# search
contacts search example.com --field email --format json

# get one contact by numeric row id
contacts get 101 --format table

# groups
contacts groups --format table

# export
contacts export --format csv --out ./contacts.csv

# create a contact
contacts add --first Jane --last Doe --email jane@example.com --phone "+1 555 0100"

# append to an existing contact
contacts add-email "A1B2C3D4-E5F6-7890-1234-56789ABCDEF0:ABPerson" jane@work.test --label work
contacts add-phone "A1B2C3D4-E5F6-7890-1234-56789ABCDEF0:ABPerson" "+1 555 0199" --label mobile

# switch backend for one command
contacts --backend json --source ./contacts.json list

# persist backend/source defaults
contacts backend set json --default-source ./contacts.json
contacts list
```

## Output behavior

For `list`, `--format auto` behaves as:

- TTY terminal: table
- piped/non-TTY: JSON array

## Troubleshooting

mac backend permission issues:

1. Open `System Settings > Privacy & Security`.
2. Add your terminal app and Bun to `Full Disk Access`.
3. Ensure the same app has `Contacts` permission.
4. Re-run the command.

Optional mac DB path override:

```bash
contacts list --source "$HOME/Library/Application Support/AddressBook/Sources/<SOURCE-ID>/AddressBook-v22.abcddb"
```

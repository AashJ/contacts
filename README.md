# contacts

CLI for macOS Contacts with read and write commands.

Developer docs live in [DEV.md](./DEV.md).

## Requirements

- macOS
- Bun
- Contacts permission for your terminal app

## Quick start

```bash
bun install
bun run src/cli.ts --help
```

Build a standalone binary:

```bash
bun build src/cli.ts --compile --outfile bin/contacts
./bin/contacts --help
```

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

- `--backend <backend>`: `mac` or `json` (defaults to saved config, else `mac`)
- `--config <path>`: config file path (default `~/.config/contacts/config.json`)
- `--source <path>`: backend source path
  - `mac` backend: optional path to `AddressBook-v*.abcddb`
  - `json` backend: required path to JSON file
- `--verbose`: print debug info

## Persisted backend defaults

Set backend once and reuse it without passing flags every time:

```bash
# save defaults
contacts backend set json --default-source ~/contacts.json

# inspect saved defaults
contacts backend show
```

Notes:

- Command-line flags (`--backend`, `--source`) override saved config.
- To remove saved source path:

```bash
contacts backend set mac --clear-source
```

## Backends

### mac backend (default)

- Reads via local Contacts SQLite DB.
- Writes (`add`, `add-email`, `add-phone`) via AppleScript/Contacts.app.
- `--source` is optional.

### json backend

- Reads and writes from a JSON file you provide via `--source`.
- Useful for testing/demo/custom data without touching macOS Contacts.

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
  "groups": [
    { "id": 1, "uniqueId": "group-1:JSONGroup", "name": "Friends" }
  ]
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

# append to an existing contact (contactId should be the Contacts unique id, usually ending in :ABPerson)
contacts add-email "A1B2C3D4-E5F6-7890-1234-56789ABCDEF0:ABPerson" jane@work.test --label work
contacts add-phone "A1B2C3D4-E5F6-7890-1234-56789ABCDEF0:ABPerson" "+1 555 0199" --label mobile

# use the json backend
contacts --backend json --source ./contacts.json list

# persist json backend defaults
contacts backend set json --default-source ./contacts.json
contacts list
```

## Output behavior

For `list`, `--format auto` behaves as:

- TTY terminal: table
- piped/non-TTY: JSON array

## Troubleshooting

If the CLI cannot read/write Contacts data, macOS permissions are usually the cause.

1. Open `System Settings > Privacy & Security`.
2. Add your terminal app and Bun to `Full Disk Access`.
3. Ensure the same app also has `Contacts` permission.
4. Re-run the command.

Optional: pass a DB path directly for mac read commands:

```bash
contacts list --source "$HOME/Library/Application Support/AddressBook/Sources/<SOURCE-ID>/AddressBook-v22.abcddb"
```

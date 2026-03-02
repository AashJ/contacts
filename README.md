# mac-contacts

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
bun build src/cli.ts --compile --outfile bin/mac-contacts
./bin/mac-contacts --help
```

## Commands

- `mac-contacts list [--limit <n>] [--format auto|table|json|ndjson]`
- `mac-contacts search <query> [--field name|email|phone] [--format table|json]`
- `mac-contacts get <id> [--format table|json]`
- `mac-contacts groups [--format table|json]`
- `mac-contacts export --format json|csv --out <path>`
- `mac-contacts add [--first <name>] [--last <name>] [--organization <name>] [--email <address>]... [--phone <number>]...`
- `mac-contacts add-email <contactId> <email> [--label <label>]`
- `mac-contacts add-phone <contactId> <phone> [--label <label>]`

Global flags:

- `--source <path>`: override discovered Contacts database path for read commands
- `--verbose`: print debug info

## Examples

```bash
# list contacts
mac-contacts list --limit 50

# structured output
mac-contacts list --limit 50 --format json | jq '.[].displayName'
mac-contacts list --limit 50 --format ndjson

# search
mac-contacts search example.com --field email --format json

# get one contact by numeric row id
mac-contacts get 101 --format table

# groups
mac-contacts groups --format table

# export
mac-contacts export --format csv --out ./contacts.csv

# create a contact
mac-contacts add --first Jane --last Doe --email jane@example.com --phone "+1 555 0100"

# append to an existing contact (contactId should be the Contacts unique id, usually ending in :ABPerson)
mac-contacts add-email "A1B2C3D4-E5F6-7890-1234-56789ABCDEF0:ABPerson" jane@work.test --label work
mac-contacts add-phone "A1B2C3D4-E5F6-7890-1234-56789ABCDEF0:ABPerson" "+1 555 0199" --label mobile
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

Optional: pass a DB path directly for read commands:

```bash
mac-contacts list --source "$HOME/Library/Application Support/AddressBook/Sources/<SOURCE-ID>/AddressBook-v22.abcddb"
```

# DEV.md

Developer notes for `contacts`.

## Scope and constraints

- Runtime/build tool: Bun only
- External dependency budget: one CLI library only (`commander`)
- No ORM, no extra data libraries, no extra runtime dependencies
- Output target: compiled single binary via `bun build --compile`

## Architecture

```txt
src/
  cli.ts
  config/
    store.ts                 # config load/save/path resolution
  commands/
    add.ts
    add-email.ts
    add-phone.ts
    backend.ts
    export.ts
    get.ts
    groups.ts
    list.ts
    search.ts
    types.ts
  providers/
    factory.ts                # backend selection
    provider.ts               # abstract provider contract
    json-file-provider.ts     # JSON backend
    mac-provider.ts           # mac backend adapter
    macos-address-book.ts      # read from sqlite contacts DB
    macos-contacts-writer.ts   # write via AppleScript / Contacts.app
  domain/
    types.ts
  output/
    json.ts
    table.ts
  __tests__/
    commands/
    providers/
```

## Data access strategy

### Reads (mac backend)

- Read local Contacts SQLite DB via `bun:sqlite`.
- Discovery path candidates include:
  - `~/Library/Application Support/AddressBook/Sources`
  - container/group container fallback paths in provider
- Pick most recent `AddressBook-v*.abcddb`.
- Query person/group rows, then hydrate email/phone fields.

### Writes (mac backend)

- Use `osascript` with `Contacts.app` AppleScript API.
- Do not write directly to SQLite for mutating operations.
- Current write operations:
  - create contact
  - add email to contact
  - add phone to contact

### JSON backend

- Source is a user-provided JSON file (`--backend json --source <path>`).
- Supports same command surface as mac backend for list/search/get/groups/add/add-email/add-phone/export.
- Missing file is treated as empty store; first write creates it.

## Config resolution

- Config file default: `~/.config/contacts/config.json`
- Override path via `--config <path>` or `CONTACTS_CONFIG`
- Resolution precedence:
  1. CLI flags (`--backend`, `--source`)
  2. persisted config file
  3. fallback backend: `mac`

The `backend` command writes/reads persisted defaults:

- `contacts backend set <backend> [--default-source <path>] [--clear-source]`
- `contacts backend show`

## Type boundaries

- CLI-facing models/types live in `src/domain/types.ts`.
- Provider-internal row/query option shapes stay private to provider modules.
- Shared command option types live in `src/commands/types.ts`.

## Provider switching

- `createContactsProvider()` in `src/providers/factory.ts` is the only backend selection point.
- Commands should depend on the abstract `ContactsProvider` API (via factory), not backend-specific modules.
- If a new backend is added, implement `ContactsProvider` and register it in the factory.

## Development commands

```bash
# run CLI
bun run src/cli.ts --help

# run tests
bun test

# compile binary
bun build src/cli.ts --compile --outfile bin/contacts
```

## Testing strategy

- Unit tests for parser/format logic under `src/__tests__/commands`.
- Provider tests with fixture SQLite DB under `src/__tests__/providers`.
- Avoid tests that mutate a real user Contacts DB.

## Release process

Workflow file: `.github/workflows/release.yml`

Trigger:

- push a tag matching `v*` (example: `v0.1.0`)

Pipeline behavior:

1. `verify` job on `ubuntu-latest`
   - `bun install --frozen-lockfile`
   - `bun test`
2. `build` matrix on macOS
   - `macos-13` -> `macos-x64`
   - `macos-14` -> `macos-arm64`
   - compiles binary with Bun
   - packages each binary as `.tar.gz`
3. `release` job
   - downloads artifacts
   - generates `checksums.txt` (SHA-256)
   - creates/updates GitHub Release for the tag
   - uploads both tarballs + checksum file

Pre-release behavior:

- tags containing `-` (for example `v0.2.0-rc.1`) are published as GitHub pre-releases.

### Local release flow

```bash
# make sure main is green and pushed
git tag v0.1.0
git push origin v0.1.0
```

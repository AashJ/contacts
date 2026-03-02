# DEV.md

Developer notes for `mac-contacts`.

## Scope and constraints

- Runtime/build tool: Bun only
- External dependency budget: one CLI library only (`commander`)
- No ORM, no extra data libraries, no extra runtime dependencies
- Output target: compiled single binary via `bun build --compile`

## Architecture

```txt
src/
  cli.ts
  commands/
    add.ts
    add-email.ts
    add-phone.ts
    export.ts
    get.ts
    groups.ts
    list.ts
    search.ts
    types.ts
  providers/
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

### Reads

- Read local Contacts SQLite DB via `bun:sqlite`.
- Discovery path candidates include:
  - `~/Library/Application Support/AddressBook/Sources`
  - container/group container fallback paths in provider
- Pick most recent `AddressBook-v*.abcddb`.
- Query person/group rows, then hydrate email/phone fields.

### Writes

- Use `osascript` with `Contacts.app` AppleScript API.
- Do not write directly to SQLite for mutating operations.
- Current write operations:
  - create contact
  - add email to contact
  - add phone to contact

## Type boundaries

- CLI-facing models/types live in `src/domain/types.ts`.
- Provider-internal row/query option shapes stay private to provider modules.
- Shared command option types live in `src/commands/types.ts`.

## Development commands

```bash
# run CLI
bun run src/cli.ts --help

# run tests
bun test

# compile binary
bun build src/cli.ts --compile --outfile bin/mac-contacts
```

## Testing strategy

- Unit tests for parser/format logic under `src/__tests__/commands`.
- Provider tests with fixture SQLite DB under `src/__tests__/providers`.
- Avoid tests that mutate a real user Contacts DB.

## Release notes (plan)

- Tag format: `vX.Y.Z`
- CI should:
  - install Bun
  - run `bun install --frozen-lockfile`
  - run tests
  - build binary artifact
  - attach artifact to GitHub Release

Potential post-v1 improvement:

- build/upload separate `arm64` and `x64` macOS binaries.

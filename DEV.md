# DEV.md

Developer notes for `contacts`.

## Scope and constraints

- Runtime/build tool: Bun only
- CLI dependency: `commander`
- Output target: compiled single binary via `bun build --compile`

## Architecture

```txt
src/
  cli.ts
  config/
    store.ts                  # config load/save/path resolution
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
    types.ts                  # shared command/global option resolution
  providers/
    factory.ts                # backend parsing + platform guard + provider selection
    provider.ts               # abstract provider contract
    json-file-provider.ts     # JSON backend
    mac-provider.ts           # mac backend adapter
    macos-address-book.ts     # read from sqlite contacts DB
    macos-contacts-writer.ts  # write via AppleScript / Contacts.app
  domain/
    types.ts                  # CLI/domain output contracts
  output/
    json.ts
    table.ts
  __tests__/
    commands/
    config/
    providers/
```

## Backend model

- `ContactsProvider` (abstract class) defines the command-facing contract.
- `createContactsProvider()` is the only backend selection point.
- Current backends:
  - `mac`: macOS-only
  - `json`: cross-platform

Platform defaults:

- `darwin` -> `mac`
- all other platforms -> `json`

The factory enforces the macOS guard for `mac`.

## Data access strategy

### Reads (`mac`)

- Read local Contacts SQLite DB via `bun:sqlite`.
- Source discovery checks common AddressBook source directories.
- Chooses most recent `AddressBook-v*.abcddb`.

### Writes (`mac`)

- Use `osascript` / Contacts.app AppleScript API.
- Do not mutate SQLite DB directly.

### Reads/Writes (`json`)

- Source is a JSON file path.
- Missing file is treated as empty store.
- First write creates file + parent directory.

## Config resolution

Config file precedence:

1. `--config <path>`
2. `CONTACTS_CONFIG`
3. `$XDG_CONFIG_HOME/contacts/config.json`
4. Windows: `%APPDATA%\contacts\config.json`
5. Windows fallback: `%USERPROFILE%\AppData\Roaming\contacts\config.json`
6. `$HOME/.config/contacts/config.json` (or `%USERPROFILE%/.config/...` fallback)

Runtime option precedence:

1. CLI flags (`--backend`, `--source`)
2. persisted config (`backend`, `source`)
3. platform default backend
4. if backend is `json` and source still unset: `<config-dir>/contacts.json`

Backend persistence commands:

- `contacts backend show`
- `contacts backend set <backend> [--default-source <path>] [--clear-source]`

## Type boundaries

- Stable CLI/domain output types: `src/domain/types.ts`
- Provider-specific query/input types: `src/providers/provider.ts`
- Command parsing/global option types: `src/commands/types.ts`

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

- Unit tests in `src/__tests__/...`.
- Provider tests avoid touching real Contacts DB.
- Cross-platform behavior is validated in CI on macOS/Linux/Windows.

## GitHub workflows

### CI

File: `.github/workflows/ci.yml`

- Triggers: PRs and pushes to `main`
- Matrix: `ubuntu-latest`, `macos-latest`, `windows-latest`
- Runs: install, test, compile sanity build

### Release

File: `.github/workflows/release.yml`

Trigger:

- push tag matching `v*` (example: `v0.1.0`)

Pipeline:

1. `verify` on Ubuntu: install + tests
2. `build` matrix:
   - `macos-13` -> `contacts-<tag>-macos-x64.tar.gz`
   - `macos-14` -> `contacts-<tag>-macos-arm64.tar.gz`
   - `ubuntu-latest` -> `contacts-<tag>-linux-x64.tar.gz`
   - `windows-latest` -> `contacts-<tag>-windows-x64.exe.zip`
3. `release` job:
   - downloads artifacts
   - generates `checksums.txt` (SHA-256)
   - publishes GitHub release assets

Pre-release behavior:

- Tags containing `-` (for example `v0.2.0-rc.1`) publish as pre-releases.

## Local release flow

```bash
# ensure main is green and pushed
git tag v0.1.0
git push origin v0.1.0
```

## Homebrew flow

Homebrew formula lives in a separate tap repo (`homebrew-tap`), not this source repo.

Generate/update formula from a release checksum file:

```bash
bun run homebrew:formula -- \
  --owner <github-owner> \
  --repo <repo-name> \
  --tag v0.1.0 \
  --checksums /path/to/checksums.txt \
  --out /path/to/homebrew-tap/Formula/contacts.rb
```

Script location:

- `scripts/generate-homebrew-formula.ts`

It expects checksums for:

- `contacts-<tag>-macos-arm64.tar.gz`
- `contacts-<tag>-macos-x64.tar.gz`
- `contacts-<tag>-linux-x64.tar.gz`

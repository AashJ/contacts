#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

interface Args {
  owner: string;
  repo: string;
  tag: string;
  checksums: string;
  out: string;
  className: string;
}

const DEFAULT_OUTPUT_PATH = "Formula/contacts.rb";
const DEFAULT_CLASS_NAME = "Contacts";

const RELEASE_ARCHIVES = {
  macosArm64: (tag: string) => `contacts-${tag}-macos-arm64.tar.gz`,
  macosX64: (tag: string) => `contacts-${tag}-macos-x64.tar.gz`,
  linuxX64: (tag: string) => `contacts-${tag}-linux-x64.tar.gz`,
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const checksumsPath = resolve(args.checksums);
  const outputPath = resolve(args.out);
  const version = normalizeVersion(args.tag);

  const checksumsRaw = await Bun.file(checksumsPath).text();
  const checksumMap = parseChecksums(checksumsRaw);

  const macosArm64Archive = RELEASE_ARCHIVES.macosArm64(args.tag);
  const macosX64Archive = RELEASE_ARCHIVES.macosX64(args.tag);
  const linuxX64Archive = RELEASE_ARCHIVES.linuxX64(args.tag);

  const macosArm64Sha = requireChecksum(checksumMap, macosArm64Archive);
  const macosX64Sha = requireChecksum(checksumMap, macosX64Archive);
  const linuxX64Sha = requireChecksum(checksumMap, linuxX64Archive);

  const releaseBaseUrl = `https://github.com/${args.owner}/${args.repo}/releases/download/${args.tag}`;

  const formula = renderFormula({
    className: args.className,
    version,
    owner: args.owner,
    repo: args.repo,
    releaseBaseUrl,
    macosArm64Archive,
    macosX64Archive,
    linuxX64Archive,
    macosArm64Sha,
    macosX64Sha,
    linuxX64Sha,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await Bun.write(outputPath, formula);

  process.stdout.write(`Wrote Homebrew formula: ${outputPath}\n`);
}

function parseArgs(argv: string[]): Args {
  const parsed: Partial<Args> = {
    out: DEFAULT_OUTPUT_PATH,
    className: DEFAULT_CLASS_NAME,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const key = argument.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    if (key === "owner") {
      parsed.owner = value;
    } else if (key === "repo") {
      parsed.repo = value;
    } else if (key === "tag") {
      parsed.tag = value;
    } else if (key === "checksums") {
      parsed.checksums = value;
    } else if (key === "out") {
      parsed.out = value;
    } else if (key === "class-name") {
      parsed.className = value;
    } else {
      throw new Error(`Unknown argument: --${key}`);
    }

    index += 1;
  }

  if (!parsed.owner) {
    throw new Error("Missing required argument: --owner <github-owner>");
  }

  if (!parsed.repo) {
    throw new Error("Missing required argument: --repo <github-repo>");
  }

  if (!parsed.tag) {
    throw new Error("Missing required argument: --tag <release-tag>");
  }

  if (!parsed.checksums) {
    throw new Error("Missing required argument: --checksums <checksums.txt>");
  }

  return parsed as Args;
}

function normalizeVersion(tag: string): string {
  const trimmed = tag.trim();
  if (trimmed.length === 0) {
    throw new Error("Tag cannot be empty.");
  }

  return trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
}

function parseChecksums(input: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = input.split(/\r?\n/);

  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) {
      continue;
    }

    const match = normalized.match(/^([A-Fa-f0-9]{64})\s+\*?(.+)$/);
    if (!match) {
      continue;
    }

    const sha = match[1].toLowerCase();
    const filePath = match[2].trim();
    const fileName = basename(filePath.replace(/^\.\//, ""));
    map.set(fileName, sha);
  }

  return map;
}

function requireChecksum(checksums: Map<string, string>, fileName: string): string {
  const sha = checksums.get(fileName);
  if (!sha) {
    throw new Error(`Could not find checksum for ${fileName} in checksums file.`);
  }

  return sha;
}

function renderFormula(input: {
  className: string;
  version: string;
  owner: string;
  repo: string;
  releaseBaseUrl: string;
  macosArm64Archive: string;
  macosX64Archive: string;
  linuxX64Archive: string;
  macosArm64Sha: string;
  macosX64Sha: string;
  linuxX64Sha: string;
}): string {
  return `class ${input.className} < Formula
  desc "Cross-platform contacts CLI"
  homepage "https://github.com/${input.owner}/${input.repo}"
  license "MIT"
  version "${input.version}"

  on_macos do
    if Hardware::CPU.arm?
      url "${input.releaseBaseUrl}/${input.macosArm64Archive}"
      sha256 "${input.macosArm64Sha}"
    else
      url "${input.releaseBaseUrl}/${input.macosX64Archive}"
      sha256 "${input.macosX64Sha}"
    end
  end

  on_linux do
    url "${input.releaseBaseUrl}/${input.linuxX64Archive}"
    sha256 "${input.linuxX64Sha}"
  end

  def install
    if OS.mac?
      if Hardware::CPU.arm?
        bin.install "contacts-v#{version}-macos-arm64" => "contacts"
      else
        bin.install "contacts-v#{version}-macos-x64" => "contacts"
      end
    else
      bin.install "contacts-v#{version}-linux-x64" => "contacts"
    end
  end

  test do
    assert_match "contacts", shell_output("#{bin}/contacts --help")
  end
end
`;
}

await main();

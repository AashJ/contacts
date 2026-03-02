export function writeJson(value: unknown): void {
  const shouldPrettyPrint = Boolean(process.stdout.isTTY);
  const spacing = shouldPrettyPrint ? 2 : 0;
  const payload = `${JSON.stringify(value, null, spacing)}\n`;
  process.stdout.write(payload);
}

export function writeNdjson(values: unknown[]): void {
  for (const value of values) {
    process.stdout.write(`${JSON.stringify(value)}\n`);
  }
}

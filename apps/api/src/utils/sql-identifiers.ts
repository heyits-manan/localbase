const SQL_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function sanitizeIdentifier(value: string): string {
  if (!SQL_IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  return value;
}

export function assertSafeTableName(value: string): string {
  return sanitizeIdentifier(value);
}

export function assertSafeColumnName(value: string): string {
  return sanitizeIdentifier(value);
}

export function quoteIdentifier(value: string): string {
  return `"${sanitizeIdentifier(value)}"`;
}

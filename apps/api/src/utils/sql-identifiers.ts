/**
 * SQL Identifier Utilities
 *
 * Provides functions to sanitize and quote SQL identifiers (table names, column names)
 * to prevent SQL injection attacks. All identifiers must match the pattern of
 * a valid SQL identifier: starting with a letter or underscore, followed by
 * alphanumeric characters or underscores.
 */

/** Regular expression pattern for a valid SQL identifier. */
const SQL_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validates and returns a safe SQL identifier.
 * @param value - The identifier string to validate.
 * @returns The sanitized identifier.
 * @throws Error if the identifier contains invalid characters.
 */
export function sanitizeIdentifier(value: string): string {
  if (!SQL_IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  return value;
}

/**
 * Asserts that a string is a safe table name.
 * Alias for sanitizeIdentifier for semantic clarity.
 * @param value - The table name to validate.
 * @returns The sanitized table name.
 */
export function assertSafeTableName(value: string): string {
  return sanitizeIdentifier(value);
}

/**
 * Asserts that a string is a safe column name.
 * Alias for sanitizeIdentifier for semantic clarity.
 * @param value - The column name to validate.
 * @returns The sanitized column name.
 */
export function assertSafeColumnName(value: string): string {
  return sanitizeIdentifier(value);
}

/**
 * Quotes a validated SQL identifier with double quotes for use in SQL queries.
 * Always calls sanitizeIdentifier first to ensure the value is safe.
 * @param value - The identifier to quote.
 * @returns The double-quoted, sanitized identifier.
 */
export function quoteIdentifier(value: string): string {
  return `"${sanitizeIdentifier(value)}"`;
}

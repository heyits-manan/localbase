/**
 * Authentication Service
 *
 * Handles email/password authentication with scrypt password hashing.
 * Provides user registration, sign-in, session management, and token validation.
 * Passwords are hashed with scrypt and a random salt, and session tokens are hashed with SHA-256.
 */

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { AuthSession, AuthUser } from "@localbase/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { authSessions, authUsers } from "../db/schema/forge.js";

/** Promisified scrypt for asynchronous password hashing. */
const scrypt = promisify(scryptCallback);

/** Session duration: 30 days in milliseconds. */
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;

/** Custom error class for authentication failures with HTTP status codes. */
class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Normalizes an email address by trimming whitespace and converting to lowercase.
 * @param email - The raw email input.
 * @returns The normalized email.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Converts a database user row to the public AuthUser type.
 * @param row - The database user row.
 * @returns The public AuthUser representation.
 */
function toAuthUser(row: typeof authUsers.$inferSelect): AuthUser {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.createdAt.toISOString()
  };
}

/**
 * Hashes a plaintext password using scrypt with a random salt.
 * @param password - The plaintext password.
 * @returns The formatted hash string: "scrypt:salt:key".
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString("base64url")}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash.
 * Uses timing-safe comparison to prevent timing attacks.
 * @param password - The plaintext password.
 * @param storedHash - The stored hash string.
 * @returns True if the password matches, false otherwise.
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, key] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !key) {
    return false;
  }

  const expected = Buffer.from(key, "base64url");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Hashes a bearer token using SHA-256 for storage in the database.
 * @param token - The raw bearer token.
 * @returns The hex-encoded SHA-256 hash.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a new session for a user and stores it in the database.
 * @param user - The authenticated user database row.
 * @returns The session token and user information.
 */
async function createSession(user: typeof authUsers.$inferSelect): Promise<AuthSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  await db.insert(authSessions).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt
  });

  return {
    token,
    user: toAuthUser(user)
  };
}

/**
 * Registers a new user with email and password.
 * @param email - The user's email address.
 * @param password - The user's password (minimum 8 characters).
 * @returns The new session for the created user.
 * @throws AuthError if the email is invalid, password is too short, or the email is already registered.
 */
export async function signUp(email: string, password: string): Promise<AuthSession> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || password.length < 8) {
    throw new AuthError("Email and password with at least 8 characters are required");
  }

  const passwordHash = await hashPassword(password);

  try {
    const created = await db.insert(authUsers).values({ email: normalizedEmail, passwordHash }).returning();
    return createSession(created[0]);
  } catch (error) {
    // Handle unique constraint violation (duplicate email)
    if (error instanceof Error && "code" in error && error.code === "23505") {
      throw new AuthError("Email is already registered", 409);
    }
    throw error;
  }
}

/**
 * Authenticates a user with email and password.
 * @param email - The user's email address.
 * @param password - The user's password.
 * @returns The session for the authenticated user.
 * @throws AuthError if the credentials are invalid.
 */
export async function signIn(email: string, password: string): Promise<AuthSession> {
  const normalizedEmail = normalizeEmail(email);
  const rows = await db.select().from(authUsers).where(eq(authUsers.email, normalizedEmail)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthError("Invalid email or password", 401);
  }

  return createSession(user);
}

/**
 * Retrieves the user associated with a bearer token.
 * @param token - The raw bearer token.
 * @returns The user object if the token is valid and not expired, null otherwise.
 */
export async function getUserForToken(token: string): Promise<AuthUser | null> {
  const rows = await db
    .select({ session: authSessions, user: authUsers })
    .from(authSessions)
    .innerJoin(authUsers, eq(authUsers.id, authSessions.userId))
    .where(eq(authSessions.tokenHash, hashToken(token)))
    .limit(1);

  const row = rows[0];
  if (!row || row.session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return toAuthUser(row.user);
}

/**
 * Revokes a session by deleting it from the database.
 * @param token - The raw bearer token to sign out.
 */
export async function signOut(token: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
}

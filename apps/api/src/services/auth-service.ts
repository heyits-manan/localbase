import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { AuthSession, AuthUser } from "@backforge/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { authSessions, authUsers } from "../db/schema/forge.js";

const scrypt = promisify(scryptCallback);
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;

class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toAuthUser(row: typeof authUsers.$inferSelect): AuthUser {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.createdAt.toISOString()
  };
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString("base64url")}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, key] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !key) {
    return false;
  }

  const expected = Buffer.from(key, "base64url");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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
    if (error instanceof Error && "code" in error && error.code === "23505") {
      throw new AuthError("Email is already registered", 409);
    }
    throw error;
  }
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const normalizedEmail = normalizeEmail(email);
  const rows = await db.select().from(authUsers).where(eq(authUsers.email, normalizedEmail)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthError("Invalid email or password", 401);
  }

  return createSession(user);
}

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

export async function signOut(token: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
}

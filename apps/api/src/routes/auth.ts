/**
 * Authentication Routes
 *
 * Defines Express routes for email/password authentication:
 * - POST /auth/signup: User registration
 * - POST /auth/login: User sign-in
 * - POST /auth/logout: Session revocation
 * - GET /auth/me: Current user retrieval
 */

import { Router } from "express";
import { z } from "zod";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { signIn, signOut, signUp } from "../services/auth-service.js";

export const authRouter: Router = Router();

/** Zod schema for validating email and password credentials. */
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

/**
 * Handles Zod validation errors by converting them to a user-friendly error message.
 * @param error - The error object to check.
 * @param next - The Express next function to pass the error to.
 * @returns True if the error was a ZodError and was handled, false otherwise.
 */
function handleZodError(error: unknown, next: (error: unknown) => void): boolean {
  if (error instanceof z.ZodError) {
    next(new Error(error.issues.map((issue) => issue.message).join("; ")));
    return true;
  }
  return false;
}

// Register a new user with email and password
authRouter.post("/auth/signup", async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    res.status(201).json(await signUp(input.email, input.password));
  } catch (error) {
    if (!handleZodError(error, next)) {
      next(error);
    }
  }
});

// Sign in an existing user with email and password
authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    res.json(await signIn(input.email, input.password));
  } catch (error) {
    if (!handleZodError(error, next)) {
      next(error);
    }
  }
});

// Sign out the current user (requires authentication)
authRouter.post("/auth/logout", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await signOut(req.auth?.token ?? "");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Get the current authenticated user (optional auth)
authRouter.get("/auth/me", optionalAuth, async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.auth?.user ?? null });
});

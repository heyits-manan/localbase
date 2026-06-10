/**
 * Authentication Middleware
 *
 * Provides Express middleware for authentication and authorization:
 * - requireAdmin: Protects admin endpoints with a bearer token
 * - optionalAuth: Attaches user info to the request if a valid token is provided
 * - requireAuth: Ensures a valid authentication token is present
 */

import type { AuthUser } from "@localbase/shared";
import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";
import { getUserForToken } from "../services/auth-service.js";

/** Express request type augmented with authentication data. */
export type AuthenticatedRequest = Request & {
  auth?: {
    token: string;
    user: AuthUser;
  };
};

/** Error thrown when authentication is required but missing. */
class AuthRequiredError extends Error {
  statusCode = 401;

  constructor() {
    super("Authentication required");
  }
}

/** Error thrown when admin authentication is required but missing. */
class AdminAuthRequiredError extends Error {
  statusCode = 401;

  constructor() {
    super("Admin authentication required");
  }
}

/**
 * Extracts the bearer token from the Authorization header.
 * @param req - The Express request object.
 * @returns The token string, or null if the header is missing or malformed.
 */
function getBearerToken(req: Request): string | null {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim() || null;
}

/**
 * Middleware that requires an admin bearer token for access.
 * If no admin token is configured in the environment, the middleware allows all requests.
 * @param req - The Express request object.
 * @param _res - The Express response object (unused).
 * @param next - The Express next function.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  // If no admin token is configured, skip the check entirely
  if (!env.API_ADMIN_TOKEN) {
    next();
    return;
  }

  if (getBearerToken(req) !== env.API_ADMIN_TOKEN) {
    next(new AdminAuthRequiredError());
    return;
  }

  next();
}

/**
 * Middleware that optionally authenticates the user if a valid bearer token is present.
 * Attaches the token and user to the request if valid, otherwise proceeds without authentication.
 * @param req - The Express request object.
 * @param _res - The Express response object (unused).
 * @param next - The Express next function.
 */
export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getBearerToken(req);
    if (!token) {
      next();
      return;
    }

    const user = await getUserForToken(token);
    if (user) {
      req.auth = { token, user };
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware that requires a valid authentication token for access.
 * Delegates to optionalAuth and then checks if authentication was successful.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  await optionalAuth(req, res, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }
    if (!req.auth) {
      next(new AuthRequiredError());
      return;
    }
    next();
  });
}

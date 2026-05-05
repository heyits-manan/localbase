import type { AuthUser } from "@localbase/shared";
import type { NextFunction, Request, Response } from "express";
import { getUserForToken } from "../services/auth-service.js";

export type AuthenticatedRequest = Request & {
  auth?: {
    token: string;
    user: AuthUser;
  };
};

class AuthRequiredError extends Error {
  statusCode = 401;

  constructor() {
    super("Authentication required");
  }
}

function getBearerToken(req: Request): string | null {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim() || null;
}

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

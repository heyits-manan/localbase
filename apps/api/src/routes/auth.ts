import { Router } from "express";
import { z } from "zod";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { signIn, signOut, signUp } from "../services/auth-service.js";

export const authRouter: Router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function handleZodError(error: unknown, next: (error: unknown) => void): boolean {
  if (error instanceof z.ZodError) {
    next(new Error(error.issues.map((issue) => issue.message).join("; ")));
    return true;
  }
  return false;
}

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

authRouter.post("/auth/logout", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await signOut(req.auth?.token ?? "");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/auth/me", optionalAuth, async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.auth?.user ?? null });
});

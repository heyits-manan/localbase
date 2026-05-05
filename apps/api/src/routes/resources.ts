import {
  addResourceFieldInputSchema,
  addResourceIndexInputSchema,
  createResourceInputSchema,
  updateResourceFieldInputSchema
} from "@localbase/shared";
import { Router } from "express";
import { z } from "zod";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  deleteResourceRow,
  getResourceRow,
  insertResourceRow,
  listResourceRows,
  updateResourceRow
} from "../services/resource-row-service.js";
import {
  addResourceField,
  addResourceIndex,
  createResource,
  deleteResource,
  deleteResourceField,
  describeResource,
  listResources,
  updateResourceField
} from "../services/schema-service.js";

export const resourcesRouter: Router = Router();

function handleZodError(error: unknown, next: (error: unknown) => void): boolean {
  if (error instanceof z.ZodError) {
    next(new Error(error.issues.map((issue) => issue.message).join("; ")));
    return true;
  }
  return false;
}

resourcesRouter.get("/resources", async (_req, res, next) => {
  try {
    res.json(await listResources());
  } catch (error) {
    next(error);
  }
});

resourcesRouter.post("/resources", async (req, res, next) => {
  try {
    const input = createResourceInputSchema.parse(req.body);
    res.status(201).json(await createResource(input));
  } catch (error) {
    if (!handleZodError(error, next)) {
      next(error);
    }
  }
});

resourcesRouter.get("/resources/:name", async (req, res, next) => {
  try {
    res.json(await describeResource(req.params.name));
  } catch (error) {
    next(error);
  }
});

resourcesRouter.delete("/resources/:name", async (req, res, next) => {
  try {
    res.json(await deleteResource(req.params.name));
  } catch (error) {
    next(error);
  }
});

resourcesRouter.post("/resources/:name/fields", async (req, res, next) => {
  try {
    const input = addResourceFieldInputSchema.parse(req.body);
    res.json(await addResourceField(req.params.name, input));
  } catch (error) {
    if (!handleZodError(error, next)) {
      next(error);
    }
  }
});

resourcesRouter.patch("/resources/:name/fields/:field", async (req, res, next) => {
  try {
    const input = updateResourceFieldInputSchema.parse(req.body);
    res.json(await updateResourceField(req.params.name, req.params.field, input));
  } catch (error) {
    if (!handleZodError(error, next)) {
      next(error);
    }
  }
});

resourcesRouter.delete("/resources/:name/fields/:field", async (req, res, next) => {
  try {
    res.json(await deleteResourceField(req.params.name, req.params.field));
  } catch (error) {
    next(error);
  }
});

resourcesRouter.post("/resources/:name/indexes", async (req, res, next) => {
  try {
    const input = addResourceIndexInputSchema.parse(req.body);
    res.json(await addResourceIndex(req.params.name, input));
  } catch (error) {
    if (!handleZodError(error, next)) {
      next(error);
    }
  }
});

resourcesRouter.get("/resources/:name/rows", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await listResourceRows(req.params.name, { query: req.query, user: req.auth?.user }));
  } catch (error) {
    next(error);
  }
});

resourcesRouter.post("/resources/:name/rows", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.status(201).json(await insertResourceRow(req.params.name, req.body, { user: req.auth?.user }));
  } catch (error) {
    next(error);
  }
});

resourcesRouter.get("/resources/:name/rows/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await getResourceRow(req.params.name, req.params.id, { user: req.auth?.user }));
  } catch (error) {
    next(error);
  }
});

resourcesRouter.patch("/resources/:name/rows/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await updateResourceRow(req.params.name, req.params.id, req.body, { user: req.auth?.user }));
  } catch (error) {
    next(error);
  }
});

resourcesRouter.delete("/resources/:name/rows/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await deleteResourceRow(req.params.name, req.params.id, { user: req.auth?.user }));
  } catch (error) {
    next(error);
  }
});

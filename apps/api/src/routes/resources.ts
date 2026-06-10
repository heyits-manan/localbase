/**
 * Resources Routes
 *
 * Defines Express routes for managing Localbase resources and their rows.
 * Includes endpoints for schema operations (admin-only) and CRUD operations on resource rows.
 * Schema mutations require admin authentication; row operations use optional authentication.
 */

import {
  addResourceFieldInputSchema,
  addResourceIndexInputSchema,
  createResourceRelationshipInputSchema,
  createResourceInputSchema,
  updateResourceFieldInputSchema
} from "@localbase/shared";
import { Router } from "express";
import { z } from "zod";
import { optionalAuth, requireAdmin, type AuthenticatedRequest } from "../middleware/auth.js";
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
  createResourceRelationship,
  deleteResource,
  deleteResourceField,
  describeResource,
  listResources,
  updateResourceField
} from "../services/schema-service.js";

export const resourcesRouter: Router = Router();

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

// List all resources
resourcesRouter.get("/resources", async (_req, res, next) => {
  try {
    res.json(await listResources());
  } catch (error) {
    next(error);
  }
});

// Create a new resource (admin only)
resourcesRouter.post("/resources", requireAdmin, async (req, res, next) => {
  try {
    const input = createResourceInputSchema.parse(req.body);
    res.status(201).json(await createResource(input));
  } catch (error) {
    if (!handleZodError(error, next)) {
      next(error);
    }
  }
});

// Describe a specific resource
resourcesRouter.get("/resources/:name", async (req, res, next) => {
  try {
    res.json(await describeResource(req.params.name));
  } catch (error) {
    next(error);
  }
});

// Delete a resource (admin only)
resourcesRouter.delete("/resources/:name", requireAdmin, async (req, res, next) => {
  try {
    res.json(await deleteResource(req.params.name));
  } catch (error) {
    next(error);
  }
});

// Add a field to a resource (admin only)
resourcesRouter.post("/resources/:name/fields", requireAdmin, async (req, res, next) => {
  try {
    const input = addResourceFieldInputSchema.parse(req.body);
    res.json(await addResourceField(req.params.name, input));
  } catch (error) {
    if (!handleZodError(error, next)) {
      next(error);
    }
  }
});

// Update a field on a resource (admin only)
resourcesRouter.patch("/resources/:name/fields/:field", requireAdmin, async (req, res, next) => {
  try {
    const input = updateResourceFieldInputSchema.parse(req.body);
    res.json(await updateResourceField(req.params.name, req.params.field, input));
  } catch (error) {
    if (!handleZodError(error, next)) {
      next(error);
    }
  }
});

// Delete a field from a resource (admin only)
resourcesRouter.delete("/resources/:name/fields/:field", requireAdmin, async (req, res, next) => {
  try {
    res.json(await deleteResourceField(req.params.name, req.params.field));
  } catch (error) {
    next(error);
  }
});

// Add an index to a resource field (admin only)
resourcesRouter.post("/resources/:name/indexes", requireAdmin, async (req, res, next) => {
  try {
    const input = addResourceIndexInputSchema.parse(req.body);
    res.json(await addResourceIndex(req.params.name, input));
  } catch (error) {
    if (!handleZodError(error, next)) {
      next(error);
    }
  }
});

// Create a relationship between resources (admin only)
resourcesRouter.post("/resources/:name/relationships", requireAdmin, async (req, res, next) => {
  try {
    const input = createResourceRelationshipInputSchema.parse(req.body);
    res.json(await createResourceRelationship(req.params.name, input));
  } catch (error) {
    if (!handleZodError(error, next)) {
      next(error);
    }
  }
});

// List rows for a resource with optional auth
resourcesRouter.get("/resources/:name/rows", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await listResourceRows(req.params.name, { query: req.query, user: req.auth?.user }));
  } catch (error) {
    next(error);
  }
});

// Insert a row into a resource with optional auth
resourcesRouter.post("/resources/:name/rows", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.status(201).json(await insertResourceRow(req.params.name, req.body, { user: req.auth?.user }));
  } catch (error) {
    next(error);
  }
});

// Get a single row by ID with optional auth
resourcesRouter.get("/resources/:name/rows/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await getResourceRow(req.params.name, req.params.id, { user: req.auth?.user }));
  } catch (error) {
    next(error);
  }
});

// Update a single row by ID with optional auth
resourcesRouter.patch("/resources/:name/rows/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await updateResourceRow(req.params.name, req.params.id, req.body, { user: req.auth?.user }));
  } catch (error) {
    next(error);
  }
});

// Delete a single row by ID with optional auth
resourcesRouter.delete("/resources/:name/rows/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await deleteResourceRow(req.params.name, req.params.id, { user: req.auth?.user }));
  } catch (error) {
    next(error);
  }
});

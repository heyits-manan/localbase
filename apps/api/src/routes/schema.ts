import { Router } from "express";
import { z } from "zod";
import { createTable, createTableInputSchema, describeTable, listTables } from "../services/schema-service.js";

export const schemaRouter: Router = Router();

schemaRouter.get("/schema/tables", async (_req, res, next) => {
  try {
    res.json(await listTables());
  } catch (error) {
    next(error);
  }
});

schemaRouter.get("/schema/tables/:tableName", async (req, res, next) => {
  try {
    res.json(await describeTable(req.params.tableName));
  } catch (error) {
    next(error);
  }
});

schemaRouter.post("/schema/tables", async (req, res, next) => {
  try {
    const input = createTableInputSchema.parse(req.body);
    res.status(201).json(await createTable(input));
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new Error(error.issues.map((issue) => issue.message).join("; ")));
      return;
    }
    next(error);
  }
});

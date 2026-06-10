/**
 * Express Application Setup
 *
 * Configures the Express application with middleware (CORS, JSON parsing, logging)
 * and mounts all route handlers. Also defines a centralized error handler that
 * extracts status codes from custom errors and returns JSON error responses.
 */

import cors from "cors";
import express, { type ErrorRequestHandler, type Express } from "express";
import morgan from "morgan";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { resourcesRouter } from "./routes/resources.js";

// Create the Express application instance
export const app: Express = express();

// Enable CORS for all origins
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Log HTTP requests to the console in development format
app.use(morgan("dev"));

// Mount route handlers
app.use(healthRouter);
app.use(authRouter);
app.use(resourcesRouter);

/**
 * Centralized error handler middleware.
 * Extracts the status code from error objects (if available) and returns a JSON error response.
 * @param error - The error object caught by Express.
 * @param _req - The Express request object (unused).
 * @param res - The Express response object.
 * @param _next - The Express next function (unused).
 */
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
      ? error.statusCode
      : 400;

  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(statusCode).json({ error: { message } });
};

// Register the error handler as the last middleware
app.use(errorHandler);

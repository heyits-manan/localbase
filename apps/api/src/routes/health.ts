/**
 * Health Check Route
 *
 * Provides a simple health check endpoint for monitoring and load balancer checks.
 * Returns a standard JSON response indicating the API is running.
 */

import { Router } from "express";

export const healthRouter: Router = Router();

/**
 * GET /health - Health check endpoint.
 * Returns a JSON object with status and service name.
 */
healthRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "localbase-api"
  });
});

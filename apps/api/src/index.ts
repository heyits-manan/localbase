/**
 * API Entry Point
 *
 * Starts the Express application server on the configured port.
 * Handles server startup errors, specifically detecting if the port is already in use.
 */

import { app } from "./app.js";
import { env } from "./env.js";

// Start the server and listen on the configured port
const server = app.listen(env.API_PORT, () => {
  console.log(`localbase-api listening on http://localhost:${env.API_PORT}`);
});

/**
 * Handle server startup errors.
 * Specifically catches EADDRINUSE (port already in use) and provides a helpful message.
 */
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`localbase-api could not start: port ${env.API_PORT} is already in use.`);
    console.error(`Stop the process using port ${env.API_PORT}, or run with API_PORT set to another port.`);
    process.exit(1);
  }

  console.error("localbase-api could not start.", error);
  process.exit(1);
});

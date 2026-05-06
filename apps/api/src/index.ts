import { app } from "./app.js";
import { env } from "./env.js";

const server = app.listen(env.API_PORT, () => {
  console.log(`localbase-api listening on http://localhost:${env.API_PORT}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`localbase-api could not start: port ${env.API_PORT} is already in use.`);
    console.error(`Stop the process using port ${env.API_PORT}, or run with API_PORT set to another port.`);
    process.exit(1);
  }

  console.error("localbase-api could not start.", error);
  process.exit(1);
});

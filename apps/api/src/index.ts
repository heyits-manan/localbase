import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import morgan from "morgan";
import { env } from "./env.js";
import { crudRouter } from "./routes/crud.js";
import { healthRouter } from "./routes/health.js";
import { schemaRouter } from "./routes/schema.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use(healthRouter);
app.use(schemaRouter);
app.use(crudRouter);

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

app.use(errorHandler);

app.listen(env.API_PORT, () => {
  console.log(`backforge-api listening on http://localhost:${env.API_PORT}`);
});

import cors from "cors";
import express, { type ErrorRequestHandler, type Express } from "express";
import morgan from "morgan";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { resourcesRouter } from "./routes/resources.js";

export const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use(healthRouter);
app.use(authRouter);
app.use(resourcesRouter);

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

import { app } from "./app.js";
import { env } from "./env.js";

app.listen(env.API_PORT, () => {
  console.log(`backforge-api listening on http://localhost:${env.API_PORT}`);
});

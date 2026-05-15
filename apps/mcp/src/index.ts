import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLocalbaseMcpServer } from "./server.js";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
const adminToken = process.env.API_ADMIN_TOKEN;

const server = createLocalbaseMcpServer({ apiBaseUrl, adminToken });
const transport = new StdioServerTransport();
await server.connect(transport);

/**
 * MCP (Model Context Protocol) Entry Point
 *
 * Initializes the MCP server using stdio transport and connects it.
 * Reads the API base URL and optional admin token from environment variables.
 * This is the entry point for the Localbase MCP server, which exposes backend functionality to AI assistants.
 */

import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLocalbaseMcpServer } from "./server.js";

// Read configuration from environment variables with sensible defaults
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
const adminToken = process.env.API_ADMIN_TOKEN;

// Create the MCP server instance with the configured options
const server = createLocalbaseMcpServer({ apiBaseUrl, adminToken });

// Create a stdio transport for communication with the MCP host
const transport = new StdioServerTransport();

// Connect the server to the transport to start handling requests
await server.connect(transport);

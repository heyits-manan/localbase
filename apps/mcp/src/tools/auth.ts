/**
 * MCP Authentication Tools
 *
 * Registers authentication-related tools on the MCP server.
 * Provides tools for: describing auth configuration, signing up, signing in,
 * getting the current user, and signing out.
 * All tools communicate with the Localbase API via HTTP requests.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Makes an HTTP request to the Localbase API and formats the response for MCP.
 * @param apiBaseUrl - The base URL for the Localbase API.
 * @param path - The API endpoint path.
 * @param authToken - Optional bearer token for authenticated requests.
 * @param init - Additional fetch options.
 * @returns Formatted MCP tool response content.
 * @throws Error if the response status is not OK.
 */
async function request(apiBaseUrl: string, path: string, authToken?: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...init?.headers
    }
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

/**
 * Registers all authentication tools on the MCP server.
 * @param server - The MCP server instance.
 * @param apiBaseUrl - The base URL for the Localbase API.
 */
export function registerAuthTools(server: McpServer, apiBaseUrl: string): void {
  // Tool to describe the authentication configuration
  server.registerTool(
    "describe_auth_config",
    {
      description: "Describe the local Localbase authentication configuration.",
      inputSchema: {}
    },
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              enabled: true,
              providers: ["email_password"],
              session: {
                type: "bearer_token",
                durationDays: 30
              },
              endpoints: {
                signUp: "POST /auth/signup",
                login: "POST /auth/login",
                logout: "POST /auth/logout",
                currentUser: "GET /auth/me"
              },
              ownedResources: {
                enabled: true,
                createWith: { ownedByUser: true },
                ownershipField: "user_id"
              }
            },
            null,
            2
          )
        }
      ]
    })
  );

  // Tool to sign up a new user
  server.registerTool(
    "sign_up",
    {
      description: "Create a Localbase email/password user and return a bearer token.",
      inputSchema: {
        email: z.string().email(),
        password: z.string().min(8)
      }
    },
    async (input) =>
      request(apiBaseUrl, "/auth/signup", undefined, {
        method: "POST",
        body: JSON.stringify(input)
      })
  );

  // Tool to sign in an existing user
  server.registerTool(
    "sign_in",
    {
      description: "Sign in a Localbase email/password user and return a bearer token.",
      inputSchema: {
        email: z.string().email(),
        password: z.string().min(8)
      }
    },
    async (input) =>
      request(apiBaseUrl, "/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify(input)
      })
  );

  // Tool to get the current user for a given token
  server.registerTool(
    "get_current_user",
    {
      description: "Return the Localbase user for a bearer token.",
      inputSchema: {
        authToken: z.string().min(1)
      }
    },
    async ({ authToken }) => request(apiBaseUrl, "/auth/me", authToken)
  );

  // Tool to sign out a user
  server.registerTool(
    "sign_out",
    {
      description: "Sign out a Localbase bearer token.",
      inputSchema: {
        authToken: z.string().min(1)
      }
    },
    async ({ authToken }) =>
      request(apiBaseUrl, "/auth/logout", authToken, {
        method: "POST"
      })
  );
}

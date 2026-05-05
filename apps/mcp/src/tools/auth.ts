import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerAuthTools(server: McpServer): void {
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
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { expectedLocalbaseToolNames } from "../src/server.js";
import { registerAuthTools } from "../src/tools/auth.js";
import { registerBackendSummaryTool } from "../src/tools/backend-summary.js";
import { registerResourceTools } from "../src/tools/resources.js";

type ToolHandler = (input?: any) => Promise<{ content: Array<{ type: string; text: string }> }>;

function createToolRegistry() {
  const tools = new Map<string, ToolHandler>();
  const server = {
    registerTool(name: string, _config: unknown, handler: ToolHandler) {
      tools.set(name, handler);
    }
  };

  registerResourceTools(server as never, "http://localhost:4000", "admin-token");
  registerAuthTools(server as never, "http://localhost:4000");
  registerBackendSummaryTool(server as never, "http://localhost:4000");

  return tools;
}

function mockJsonFetch() {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    requests.push({ url, init });
    const path = new URL(url).pathname;
    const body =
      path === "/health"
        ? { ok: true }
        : path === "/resources"
          ? [{ name: "memories" }]
          : { ok: true, path };

    return {
      ok: true,
      json: async () => body
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return requests;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Localbase MCP tools", () => {
  it("registers the expected public tool surface", () => {
    const tools = createToolRegistry();

    expect([...tools.keys()].sort()).toEqual([...expectedLocalbaseToolNames].sort());
  });

  it("get_backend_summary reads health and resources", async () => {
    const requests = mockJsonFetch();
    const tools = createToolRegistry();

    const result = await tools.get("get_backend_summary")?.();
    const summary = JSON.parse(result?.content[0]?.text ?? "{}");

    expect(requests.map((request) => new URL(request.url).pathname).sort()).toEqual(["/health", "/resources"]);
    expect(summary.health).toEqual({ ok: true });
    expect(summary.resources).toEqual([{ name: "memories" }]);
    expect(summary.preferredTools).toContain("create_resource");
  });

  it("create_resource sends the admin token", async () => {
    const requests = mockJsonFetch();
    const tools = createToolRegistry();

    await tools.get("create_resource")?.({
      name: "memories",
      ownedByUser: true,
      fields: [{ name: "title", type: "text", required: true }]
    });

    expect(requests[0]).toMatchObject({
      url: "http://localhost:4000/resources"
    });
    expect(requests[0]?.init?.method).toBe("POST");
    expect(requests[0]?.init?.headers).toMatchObject({ Authorization: "Bearer admin-token" });
  });

  it("list_rows serializes filters, pagination, and sort", async () => {
    const requests = mockJsonFetch();
    const tools = createToolRegistry();

    await tools.get("list_rows")?.({
      resource: "memories",
      authToken: "user-token",
      where: {
        title: { contains: "agent" },
        archived: false,
        importance: { gte: 3 }
      },
      limit: 25,
      offset: 10,
      orderBy: "created_at",
      orderDirection: "desc"
    });

    const url = new URL(requests[0]?.url ?? "");
    expect(url.pathname).toBe("/resources/memories/rows");
    expect(url.searchParams.get("where[title][contains]")).toBe("agent");
    expect(url.searchParams.get("where[archived]")).toBe("false");
    expect(url.searchParams.get("where[importance][gte]")).toBe("3");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("offset")).toBe("10");
    expect(url.searchParams.get("orderBy")).toBe("created_at");
    expect(url.searchParams.get("orderDirection")).toBe("desc");
    expect(requests[0]?.init?.headers).toMatchObject({ Authorization: "Bearer user-token" });
  });

  it("auth-owned row tools accept authToken", async () => {
    const requests = mockJsonFetch();
    const tools = createToolRegistry();

    await tools.get("insert_row")?.({ resource: "memories", authToken: "user-token", data: { title: "One" } });
    await tools.get("get_row")?.({ resource: "memories", id: "row-1", authToken: "user-token" });
    await tools.get("update_row")?.({ resource: "memories", id: "row-1", authToken: "user-token", data: { title: "Two" } });
    await tools.get("delete_row")?.({ resource: "memories", id: "row-1", authToken: "user-token" });

    expect(requests).toHaveLength(4);
    for (const request of requests) {
      expect(request.init?.headers).toMatchObject({ Authorization: "Bearer user-token" });
    }
  });
});

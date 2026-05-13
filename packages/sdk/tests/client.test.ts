import { afterEach, describe, expect, test, vi } from "vitest";
import { createLocalbaseClient } from "../src/client.js";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function mockFetch(responseData: unknown = { ok: true }) {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => responseData
      };
    })
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createLocalbaseClient", () => {
  test("builds resource lifecycle requests", async () => {
    const calls = mockFetch();
    const client = createLocalbaseClient({ baseUrl: "http://localhost:4000/", adminToken: "admin-secret" });

    await client.resources.delete("todos");
    await client.resources.updateField("todos", "done", { name: "is_done", indexed: true });
    await client.resources.deleteField("todos", "is_done");
    await client.resources.createRelationship("orders", {
      field: "customer_id",
      references: { resource: "customers", field: "id", onDelete: "cascade" }
    });

    expect(calls[0]).toMatchObject({
      url: "http://localhost:4000/resources/todos",
      init: expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ Authorization: "Bearer admin-secret" })
      })
    });
    expect(calls[1]).toMatchObject({
      url: "http://localhost:4000/resources/todos/fields/done",
      init: expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name: "is_done", indexed: true }) })
    });
    expect(calls[2]).toMatchObject({
      url: "http://localhost:4000/resources/todos/fields/is_done",
      init: expect.objectContaining({ method: "DELETE" })
    });
    expect(calls[3]).toMatchObject({
      url: "http://localhost:4000/resources/orders/relationships",
      init: expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          field: "customer_id",
          references: { resource: "customers", field: "id", onDelete: "cascade" }
        })
      })
    });
  });

  test("serializes row list operators, pagination, and sorting", async () => {
    const calls = mockFetch([]);
    const client = createLocalbaseClient({ baseUrl: "http://localhost:4000" });

    await client.resources.rows("todos").list({
      where: {
        title: { contains: "ship" },
        priority: { gte: 2 },
        done: false
      },
      limit: 10,
      offset: 20,
      orderBy: "priority",
      orderDirection: "asc"
    });

    const url = new URL(calls[0].url);
    expect(url.pathname).toBe("/resources/todos/rows");
    expect(url.searchParams.get("where[title][contains]")).toBe("ship");
    expect(url.searchParams.get("where[priority][gte]")).toBe("2");
    expect(url.searchParams.get("where[done]")).toBe("false");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("offset")).toBe("20");
    expect(url.searchParams.get("orderBy")).toBe("priority");
    expect(url.searchParams.get("orderDirection")).toBe("asc");
  });
});

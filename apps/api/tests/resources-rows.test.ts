import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../src/app.js";
import { pool } from "../src/db/client.js";
import { quoteIdentifier } from "../src/utils/sql-identifiers.js";

const createdResources: string[] = [];
const createdEmails: string[] = [];

function resourceName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function createResource(name: string, ownedByUser = false): Promise<void> {
  createdResources.push(name);
  const response = await request(app)
    .post("/resources")
    .send({
      name,
      ownedByUser,
      fields: [
        { name: "title", type: "text", required: true },
        { name: "done", type: "boolean", defaultValue: false }
      ]
    })
    .expect(201);

  expect(response.body.name).toBe(name);
}

async function signUp(emailPrefix: string): Promise<string> {
  const email = `${emailPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
  createdEmails.push(email);
  const response = await request(app)
    .post("/auth/signup")
    .send({
      email,
      password: "password123"
    })
    .expect(201);

  return response.body.token as string;
}

beforeAll(async () => {
  await pool.query("SELECT 1");
});

afterAll(async () => {
  for (const name of [...createdResources].reverse()) {
    await pool.query(`DROP TABLE IF EXISTS ${quoteIdentifier(name)}`);
    await pool.query(
      "DELETE FROM forge_columns WHERE table_id IN (SELECT id FROM forge_tables WHERE table_name = $1)",
      [name]
    );
    await pool.query("DELETE FROM forge_tables WHERE table_name = $1", [name]);
  }

  if (createdEmails.length > 0) {
    await pool.query("DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM auth_users WHERE email = ANY($1))", [
      createdEmails
    ]);
    await pool.query("DELETE FROM auth_users WHERE email = ANY($1)", [createdEmails]);
  }

  await pool.end();
});

describe("resource row CRUD", () => {
  test("describes resources with field vocabulary", async () => {
    const name = resourceName("resource_fields");
    await createResource(name);

    const response = await request(app).get(`/resources/${name}`).expect(200);
    expect(response.body).toMatchObject({
      name,
      ownedByUser: false
    });
    expect(response.body).not.toHaveProperty("tableName");
    expect(response.body.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "title", type: "text", required: true }),
        expect.objectContaining({ name: "done", type: "boolean", required: false })
      ])
    );
    expect(response.body.fields[0]).not.toHaveProperty("columnName");
    expect(response.body.fields[0]).not.toHaveProperty("columnType");
  });

  test("gets, updates, and deletes a row through the resource routes", async () => {
    const name = resourceName("resource_rows");
    await createResource(name);

    const inserted = await request(app)
      .post(`/resources/${name}/rows`)
      .send({ title: "Ship CRUD" })
      .expect(201);
    const rowId = inserted.body.id as string;

    const fetched = await request(app).get(`/resources/${name}/rows/${rowId}`).expect(200);
    expect(fetched.body).toMatchObject({ id: rowId, title: "Ship CRUD", done: false });

    const updated = await request(app)
      .patch(`/resources/${name}/rows/${rowId}`)
      .send({ title: "Ship resource CRUD", done: true })
      .expect(200);
    expect(updated.body).toMatchObject({ id: rowId, title: "Ship resource CRUD", done: true });
    expect(new Date(updated.body.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(inserted.body.updated_at).getTime()
    );

    await request(app).delete(`/resources/${name}/rows/${rowId}`).expect(200, { ok: true });
    await request(app).get(`/resources/${name}/rows/${rowId}`).expect(404);
  });

  test("filters, sorts, and paginates listed rows", async () => {
    const name = resourceName("resource_listing");
    createdResources.push(name);
    await request(app)
      .post("/resources")
      .send({
        name,
        fields: [
          { name: "title", type: "text", required: true },
          { name: "priority", type: "integer", defaultValue: 0, indexed: true },
          { name: "done", type: "boolean", defaultValue: false }
        ]
      })
      .expect(201);

    await request(app).post(`/resources/${name}/rows`).send({ title: "Alpha task", priority: 1 }).expect(201);
    await request(app).post(`/resources/${name}/rows`).send({ title: "Beta task", priority: 3, done: true }).expect(201);
    await request(app).post(`/resources/${name}/rows`).send({ title: "Gamma note", priority: 2 }).expect(201);

    const filtered = await request(app)
      .get(`/resources/${name}/rows`)
      .query({
        "where[title][contains]": "task",
        "where[priority][gte]": "2",
        orderBy: "priority",
        orderDirection: "asc"
      })
      .expect(200);
    expect(filtered.body.map((row: { title: string }) => row.title)).toEqual(["Beta task"]);

    const paged = await request(app)
      .get(`/resources/${name}/rows`)
      .query({ orderBy: "priority", orderDirection: "asc", limit: "1", offset: "1" })
      .expect(200);
    expect(paged.body).toHaveLength(1);
    expect(paged.body[0]).toMatchObject({ title: "Gamma note", priority: 2 });
  });

  test("renames, updates, deletes fields, and deletes resources", async () => {
    const name = resourceName("resource_lifecycle");
    await createResource(name);

    await request(app)
      .patch(`/resources/${name}/fields/done`)
      .send({ name: "is_done", defaultValue: true, indexed: true })
      .expect(200);

    const renamedInsert = await request(app)
      .post(`/resources/${name}/rows`)
      .send({ title: "Renamed field", is_done: false })
      .expect(201);
    expect(renamedInsert.body).toMatchObject({ title: "Renamed field", is_done: false });
    expect(renamedInsert.body).not.toHaveProperty("done");

    const description = await request(app).get(`/resources/${name}`).expect(200);
    expect(description.body.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "is_done", isIndexed: true, defaultValue: "true" })])
    );

    await request(app).delete(`/resources/${name}/fields/is_done`).expect(200);
    const afterDeleteField = await request(app).get(`/resources/${name}`).expect(200);
    expect(afterDeleteField.body.fields).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "is_done" })])
    );

    await request(app).delete(`/resources/${name}`).expect(200, { ok: true });
    await request(app).get(`/resources/${name}`).expect(404);
    await request(app).post(`/resources/${name}/rows`).send({ title: "Gone" }).expect(404);
  });

  test("creates and enforces relationship fields", async () => {
    const customers = resourceName("relationship_customers");
    const orders = resourceName("relationship_orders");
    createdResources.push(customers, orders);

    await request(app)
      .post("/resources")
      .send({
        name: customers,
        fields: [{ name: "email", type: "text", required: true, unique: true }]
      })
      .expect(201);

    await request(app)
      .post("/resources")
      .send({
        name: orders,
        fields: [{ name: "total", type: "integer", defaultValue: 0 }]
      })
      .expect(201);

    const relationship = await request(app)
      .post(`/resources/${orders}/relationships`)
      .send({
        field: "customer_id",
        references: { resource: customers }
      })
      .expect(200);
    expect(relationship.body.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "customer_id",
          type: "uuid",
          isIndexed: true,
          references: { resource: customers, field: "id", onDelete: "restrict" }
        })
      ])
    );

    const customer = await request(app)
      .post(`/resources/${customers}/rows`)
      .send({ email: "relationship@example.com" })
      .expect(201);

    await request(app)
      .post(`/resources/${orders}/rows`)
      .send({ total: 2500, customer_id: customer.body.id })
      .expect(201);

    await request(app)
      .post(`/resources/${orders}/rows`)
      .send({ total: 1000, customer_id: "00000000-0000-0000-0000-000000000000" })
      .expect(400);
  });

  test("rejects unknown and system fields when updating rows", async () => {
    const name = resourceName("resource_validation");
    await createResource(name);

    const inserted = await request(app).post(`/resources/${name}/rows`).send({ title: "Validate" }).expect(201);
    const rowId = inserted.body.id as string;

    const unknown = await request(app)
      .patch(`/resources/${name}/rows/${rowId}`)
      .send({ missing_field: "nope" })
      .expect(400);
    expect(unknown.body.error.message).toContain("Unknown field");

    const system = await request(app)
      .patch(`/resources/${name}/rows/${rowId}`)
      .send({ id: "00000000-0000-0000-0000-000000000000" })
      .expect(400);
    expect(system.body.error.message).toContain("Field cannot be modified");
  });

  test("requires auth and scopes owned resource row access to the owner", async () => {
    const name = resourceName("owned_resource_rows");
    await createResource(name, true);
    const ownerToken = await signUp("owner");
    const otherToken = await signUp("other");

    await request(app).post(`/resources/${name}/rows`).send({ title: "Private" }).expect(401);

    const inserted = await request(app)
      .post(`/resources/${name}/rows`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Private" })
      .expect(201);
    const rowId = inserted.body.id as string;

    await request(app).get(`/resources/${name}/rows/${rowId}`).expect(401);
    await request(app).get(`/resources/${name}/rows/${rowId}`).set("Authorization", `Bearer ${otherToken}`).expect(404);
    await request(app)
      .patch(`/resources/${name}/rows/${rowId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Stolen" })
      .expect(404);
    await request(app)
      .delete(`/resources/${name}/rows/${rowId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(404);

    await request(app)
      .get(`/resources/${name}/rows/${rowId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    await request(app)
      .patch(`/resources/${name}/rows/${rowId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Still private" })
      .expect(200);
    await request(app)
      .delete(`/resources/${name}/rows/${rowId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200, { ok: true });
  });

  test("does not expose legacy table routes", async () => {
    await request(app).get("/schema/tables").expect(404);
    await request(app)
      .post("/schema/tables")
      .send({ tableName: resourceName("legacy_schema"), columns: [] })
      .expect(404);
    await request(app).get("/api/legacy_resource").expect(404);
  });
});

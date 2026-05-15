import { createLocalbaseClient } from "../../../packages/sdk/src/index.js";

const localbase = createLocalbaseClient({
  baseUrl: process.env.LOCALBASE_API_URL ?? "http://localhost:4000",
  adminToken: process.env.API_ADMIN_TOKEN
});

async function signInOrSignUp(email: string, password: string) {
  try {
    return await localbase.auth.signIn(email, password);
  } catch {
    return localbase.auth.signUp(email, password);
  }
}

async function ensureDemoResources() {
  const existing = await localbase.resources.list();
  const names = new Set(existing.map((resource) => resource.name));

  if (!names.has("memories")) {
    await localbase.resources.create({
      name: "memories",
      ownedByUser: true,
      fields: [
        { name: "title", type: "text", required: true },
        { name: "content", type: "text", required: true },
        { name: "source", type: "text", indexed: true },
        { name: "importance", type: "integer", defaultValue: 1, indexed: true }
      ]
    });
  }

  if (!names.has("outputs")) {
    await localbase.resources.create({
      name: "outputs",
      ownedByUser: true,
      fields: [
        { name: "title", type: "text", required: true },
        { name: "kind", type: "text", required: true, indexed: true },
        { name: "content", type: "text", required: true }
      ]
    });
  }
}

async function main() {
  await ensureDemoResources();
  const session = await signInOrSignUp("ada@example.com", "password123");

  const memory = await localbase.resources.rows("memories").insert({
    title: "Research preference",
    content: "Prefer primary sources and quote exact URLs.",
    source: "example-app",
    importance: 5
  });

  const memories = await localbase.resources.rows("memories").list({
    where: { source: "example-app" },
    orderBy: "created_at",
    orderDirection: "desc",
    limit: 10
  });

  const output = await localbase.resources.rows("outputs").insert({
    title: "Source policy",
    kind: "note",
    content: "Use primary sources for product claims."
  });

  const outputs = await localbase.resources.rows("outputs").list({
    where: { kind: "note" },
    limit: 10
  });

  console.log(
    JSON.stringify(
      {
        signedInAs: session.user.email,
        insertedMemory: memory,
        memoryCount: memories.length,
        insertedOutput: output,
        outputCount: outputs.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

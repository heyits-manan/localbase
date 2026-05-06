# Starter Backend Smoke Test

This walkthrough verifies the next Localbase steps after Codex MCP is connected.

## Resources Created

The starter store schema contains:

- `products`: `name`, `price`, `in_stock`
- `customers`: `email`, `name`, `phone`, `active`
- `categories`: `name`, `slug`, `description`
- `orders`: `customer_id`, `status`, `total`, `paid`
- `saved_items`: auth-owned rows with `product_name`, `quantity`, `purchased`

Create them through MCP from Codex:

```text
Use the localbase MCP server. Call get_backend_summary, then create customers, categories, orders, and an auth-owned saved_items resource for a small store backend. Then list resources.
```

## Auth-Owned Data

Use this prompt to verify per-user data:

```text
Use the localbase MCP server. Sign up a test user, insert a saved_items row with product_name "Keyboard" and quantity 1 using that auth token, then list rows for saved_items using the same token.
```

Expected behavior:

- `saved_items` has `ownedByUser: true`.
- The API automatically writes `user_id`.
- Listing rows with the user's token returns that user's row.
- Client input should not provide `user_id`.

## SDK Smoke Check

App code can use the SDK after MCP creates the schema:

```ts
import { createLocalbaseClient } from "@localbase/sdk";

const localbase = createLocalbaseClient({ baseUrl: "http://localhost:4000" });

const resources = await localbase.resources.list();
const product = await localbase.resources.rows("products").insert({
  name: "SDK Mouse",
  price: 2999
});
const inStock = await localbase.resources.rows("products").list({
  where: { in_stock: true },
  limit: 10
});

console.log(resources.map((resource) => resource.name));
console.log(product);
console.log(inStock);
```

Run a local one-off check from this repository:

```bash
pnpm --dir /media/manan/27c2ac5b-0083-4cea-a027-e77fa8c01f85/Computer_Science/localbase --silent exec tsx --eval 'import { createLocalbaseClient } from "./packages/sdk/src/index.ts"; async function main() { const localbase = createLocalbaseClient({ baseUrl: "http://localhost:4000" }); const resources = await localbase.resources.list(); const product = await localbase.resources.rows("products").insert({ name: "SDK Mouse", price: 2999 }); const inStock = await localbase.resources.rows("products").list({ where: { in_stock: true }, limit: 10 }); console.log(JSON.stringify({ resources: resources.map((resource) => resource.name).sort(), insertedProduct: product, inStockCount: inStock.length }, null, 2)); } main();'
```

## Working Codex MCP Command

If Codex starts with an MCP handshake error, re-register the server:

```bash
codex mcp remove localbase
codex mcp add localbase --env API_BASE_URL=http://localhost:4000 -- pnpm --dir /media/manan/27c2ac5b-0083-4cea-a027-e77fa8c01f85/Computer_Science/localbase --silent mcp
```

Then restart Codex. There should be no `MCP client for localbase failed to start` warning.

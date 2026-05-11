# Releasing Localbase

Localbase's npm package starts Docker images from Docker Hub. Publish the runtime images before publishing the npm package so `localbase start` works without platform flags on macOS, Windows, and Linux.

## Runtime Images

Log in to Docker Hub, then publish both runtime images as multi-platform Linux images:

```bash
docker login
pnpm docker:publish
```

The publish command creates or reuses a Buildx builder and pushes:

- `mananchataut/localbase-api:latest` for `linux/amd64` and `linux/arm64`
- `mananchataut/localbase-mcp:latest` for `linux/amd64` and `linux/arm64`

Verify the manifests before publishing npm:

```bash
docker buildx imagetools inspect mananchataut/localbase-api:latest
docker buildx imagetools inspect mananchataut/localbase-mcp:latest
```

Both outputs must include `linux/amd64` and `linux/arm64`.

## npm Package

After the runtime images are published and verified:

```bash
pnpm --filter @mrace07/localbase lint
pnpm --filter @mrace07/localbase publish --access public
```

Smoke-test the public install on a clean machine or directory:

```bash
npx @mrace07/localbase init my-backend
cd my-backend
localbase start
localbase doctor
```

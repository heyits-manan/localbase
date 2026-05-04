export type BackforgeClientOptions = {
  baseUrl: string;
};

type JsonRecord = Record<string, unknown>;

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  const data = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: { message?: unknown } }).error?.message === "string"
        ? (data as { error: { message: string } }).error.message
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function createBackforgeClient(options: BackforgeClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  return {
    from(table: string) {
      const path = `/api/${encodeURIComponent(table)}`;

      return {
        select: () => request<unknown[]>(baseUrl, path),
        get: (id: string) => request<unknown>(baseUrl, `${path}/${encodeURIComponent(id)}`),
        insert: (data: JsonRecord) =>
          request<unknown>(baseUrl, path, {
            method: "POST",
            body: JSON.stringify(data)
          }),
        update: (id: string, data: JsonRecord) =>
          request<unknown>(baseUrl, `${path}/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: JSON.stringify(data)
          }),
        delete: (id: string) =>
          request<{ ok: true }>(baseUrl, `${path}/${encodeURIComponent(id)}`, {
            method: "DELETE"
          })
      };
    }
  };
}

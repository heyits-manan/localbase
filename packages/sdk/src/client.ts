import type {
  AddResourceFieldInput,
  AddResourceIndexInput,
  AuthSession,
  AuthUser,
  CreateResourceInput,
  LocalbaseResource
} from "@localbase/shared";

export type LocalbaseClientOptions = {
  baseUrl: string;
  token?: string;
};

type JsonRecord = Record<string, unknown>;
type RowListOptions = {
  where?: Record<string, string | number | boolean>;
};

function buildQuery(options?: RowListOptions): string {
  const params = new URLSearchParams();
  for (const [field, value] of Object.entries(options?.where ?? {})) {
    params.set(`where[${field}]`, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function request<T>(baseUrl: string, path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export function createLocalbaseClient(options: LocalbaseClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  let authToken = options.token;

  return {
    auth: {
      setToken: (token: string | undefined) => {
        authToken = token;
      },
      signUp: async (email: string, password: string) => {
        const session = await request<AuthSession>(baseUrl, "/auth/signup", authToken, {
          method: "POST",
          body: JSON.stringify({ email, password })
        });
        authToken = session.token;
        return session;
      },
      signIn: async (email: string, password: string) => {
        const session = await request<AuthSession>(baseUrl, "/auth/login", authToken, {
          method: "POST",
          body: JSON.stringify({ email, password })
        });
        authToken = session.token;
        return session;
      },
      signOut: async () => {
        const result = await request<{ ok: true }>(baseUrl, "/auth/logout", authToken, { method: "POST" });
        authToken = undefined;
        return result;
      },
      getUser: async () => {
        const result = await request<{ user: AuthUser | null }>(baseUrl, "/auth/me", authToken);
        return result.user;
      }
    },
    resources: {
      list: () => request<LocalbaseResource[]>(baseUrl, "/resources", authToken),
      describe: (name: string) => request<LocalbaseResource>(baseUrl, `/resources/${encodeURIComponent(name)}`, authToken),
      create: (data: CreateResourceInput) =>
        request<LocalbaseResource>(baseUrl, "/resources", authToken, {
          method: "POST",
          body: JSON.stringify(data)
        }),
      addField: (name: string, data: AddResourceFieldInput) =>
        request<LocalbaseResource>(baseUrl, `/resources/${encodeURIComponent(name)}/fields`, authToken, {
          method: "POST",
          body: JSON.stringify(data)
        }),
      addIndex: (name: string, field: string) =>
        request<LocalbaseResource>(baseUrl, `/resources/${encodeURIComponent(name)}/indexes`, authToken, {
          method: "POST",
          body: JSON.stringify({ field } satisfies AddResourceIndexInput)
        }),
      rows(name: string) {
        const path = `/resources/${encodeURIComponent(name)}/rows`;
        return {
          list: (options?: RowListOptions) => request<unknown[]>(baseUrl, `${path}${buildQuery(options)}`, authToken),
          get: (id: string) => request<unknown>(baseUrl, `${path}/${encodeURIComponent(id)}`, authToken),
          insert: (data: JsonRecord) =>
            request<unknown>(baseUrl, path, authToken, {
              method: "POST",
              body: JSON.stringify(data)
            }),
          update: (id: string, data: JsonRecord) =>
            request<unknown>(baseUrl, `${path}/${encodeURIComponent(id)}`, authToken, {
              method: "PATCH",
              body: JSON.stringify(data)
            }),
          delete: (id: string) =>
            request<{ ok: true }>(baseUrl, `${path}/${encodeURIComponent(id)}`, authToken, {
              method: "DELETE"
          })
        };
      }
    }
  };
}

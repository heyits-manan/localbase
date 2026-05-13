import type {
  AddResourceFieldInput,
  AddResourceIndexInput,
  AuthSession,
  AuthUser,
  CreateResourceRelationshipInput,
  CreateResourceInput,
  LocalbaseResource,
  UpdateResourceFieldInput
} from "@localbase/shared";

export type LocalbaseClientOptions = {
  baseUrl: string;
  token?: string;
  adminToken?: string;
};

type JsonRecord = Record<string, unknown>;
type RowFilterValue =
  | string
  | number
  | boolean
  | {
      eq?: string | number | boolean;
      ne?: string | number | boolean;
      contains?: string | number | boolean;
      gt?: string | number | boolean;
      gte?: string | number | boolean;
      lt?: string | number | boolean;
      lte?: string | number | boolean;
      isNull?: boolean;
    };
type RowListOptions = {
  where?: Record<string, RowFilterValue>;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
};

function buildQuery(options?: RowListOptions): string {
  const params = new URLSearchParams();
  for (const [field, value] of Object.entries(options?.where ?? {})) {
    if (typeof value === "object" && value !== null) {
      for (const [operator, operatorValue] of Object.entries(value)) {
        if (operatorValue !== undefined) {
          params.set(`where[${field}][${operator}]`, String(operatorValue));
        }
      }
    } else {
      params.set(`where[${field}]`, String(value));
    }
  }
  if (options?.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  if (options?.offset !== undefined) {
    params.set("offset", String(options.offset));
  }
  if (options?.orderBy !== undefined) {
    params.set("orderBy", options.orderBy);
  }
  if (options?.orderDirection !== undefined) {
    params.set("orderDirection", options.orderDirection);
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
  let adminToken = options.adminToken;

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
      setAdminToken: (token: string | undefined) => {
        adminToken = token;
      },
      list: () => request<LocalbaseResource[]>(baseUrl, "/resources", authToken),
      describe: (name: string) => request<LocalbaseResource>(baseUrl, `/resources/${encodeURIComponent(name)}`, authToken),
      create: (data: CreateResourceInput) =>
        request<LocalbaseResource>(baseUrl, "/resources", adminToken, {
          method: "POST",
          body: JSON.stringify(data)
        }),
      delete: (name: string) =>
        request<{ ok: true }>(baseUrl, `/resources/${encodeURIComponent(name)}`, adminToken, {
          method: "DELETE"
        }),
      addField: (name: string, data: AddResourceFieldInput) =>
        request<LocalbaseResource>(baseUrl, `/resources/${encodeURIComponent(name)}/fields`, adminToken, {
          method: "POST",
          body: JSON.stringify(data)
        }),
      createRelationship: (name: string, data: CreateResourceRelationshipInput) =>
        request<LocalbaseResource>(baseUrl, `/resources/${encodeURIComponent(name)}/relationships`, adminToken, {
          method: "POST",
          body: JSON.stringify(data)
        }),
      updateField: (name: string, field: string, data: UpdateResourceFieldInput) =>
        request<LocalbaseResource>(
          baseUrl,
          `/resources/${encodeURIComponent(name)}/fields/${encodeURIComponent(field)}`,
          adminToken,
          {
            method: "PATCH",
            body: JSON.stringify(data)
          }
        ),
      deleteField: (name: string, field: string) =>
        request<LocalbaseResource>(
          baseUrl,
          `/resources/${encodeURIComponent(name)}/fields/${encodeURIComponent(field)}`,
          adminToken,
          {
            method: "DELETE"
          }
        ),
      addIndex: (name: string, field: string) =>
        request<LocalbaseResource>(baseUrl, `/resources/${encodeURIComponent(name)}/indexes`, adminToken, {
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

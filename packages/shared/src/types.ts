export type ColumnType = "text" | "integer" | "boolean" | "timestamp" | "uuid" | "jsonb";

export type CreateTableInput = {
  tableName: string;
  ownedByUser?: boolean;
  columns: Array<{
    name: string;
    type: ColumnType;
    nullable?: boolean;
    unique?: boolean;
    defaultValue?: string | number | boolean | null;
    indexed?: boolean;
  }>;
};

export type CreateResourceInput = {
  name: string;
  ownedByUser?: boolean;
  fields: Array<{
    name: string;
    type: ColumnType;
    required?: boolean;
    unique?: boolean;
    defaultValue?: string | number | boolean | null;
    indexed?: boolean;
  }>;
};

export type ForgeColumn = {
  id: string;
  tableId: string;
  columnName: string;
  columnType: ColumnType;
  nullable: boolean;
  isUnique: boolean;
  defaultValue: string | null;
  isIndexed: boolean;
  createdAt: string;
};

export type ForgeTable = {
  id: string;
  projectId: string;
  tableName: string;
  ownedByUser: boolean;
  createdAt: string;
  columns?: ForgeColumn[];
};

export type ForgeResource = {
  id: string;
  projectId: string;
  name: string;
  tableName: string;
  ownedByUser: boolean;
  createdAt: string;
  fields?: ForgeColumn[];
};

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

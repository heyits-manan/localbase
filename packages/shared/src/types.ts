export type ColumnType = "text" | "integer" | "boolean" | "timestamp" | "uuid" | "jsonb";

export type CreateTableInput = {
  tableName: string;
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
  createdAt: string;
  columns?: ForgeColumn[];
};

export type ForgeResource = {
  id: string;
  projectId: string;
  name: string;
  tableName: string;
  createdAt: string;
  fields?: ForgeColumn[];
};

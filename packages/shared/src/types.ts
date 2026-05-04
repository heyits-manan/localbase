export type ColumnType = "text" | "integer" | "boolean" | "timestamp" | "uuid" | "jsonb";

export type CreateTableInput = {
  tableName: string;
  columns: Array<{
    name: string;
    type: ColumnType;
    nullable?: boolean;
    unique?: boolean;
  }>;
};

export type ForgeColumn = {
  id: string;
  tableId: string;
  columnName: string;
  columnType: ColumnType;
  nullable: boolean;
  isUnique: boolean;
  createdAt: string;
};

export type ForgeTable = {
  id: string;
  projectId: string;
  tableName: string;
  createdAt: string;
  columns?: ForgeColumn[];
};

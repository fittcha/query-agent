import sql from "mssql";

// ============================================
// 타입 정의
// ============================================

export interface ColumnInfo {
  name: string;
  dataType: string;
  maxLength: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: string; // "schema.table.column"
}

export interface TableInfo {
  schema: string;
  name: string;
  fullName: string;
  columns: ColumnInfo[];
  rowCount?: number;
}

export interface ParameterInfo {
  name: string;
  dataType: string;
  maxLength: number | null;
  isOutput: boolean;
}

export interface StoredProcedureInfo {
  schema: string;
  name: string;
  fullName: string;
  parameters: ParameterInfo[];
  description?: string;
}

export interface ViewInfo {
  schema: string;
  name: string;
  fullName: string;
  columns: ColumnInfo[];
}

export interface SchemaCache {
  tables: Map<string, TableInfo>;
  storedProcedures: Map<string, StoredProcedureInfo>;
  views: Map<string, ViewInfo>;
  lastUpdated: Date;
  checksum: string;
}

// ============================================
// 캐시 저장소
// ============================================

let schemaCache: SchemaCache | null = null;
let pool: sql.ConnectionPool | null = null;

const config: sql.config = {
  server: process.env.MSSQL_HOST || "localhost",
  database: process.env.MSSQL_DATABASE || "master",
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  port: parseInt(process.env.MSSQL_PORT || "1433"),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === "true",
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

// ============================================
// 스키마 변경 감지
// ============================================

async function getSchemaChecksum(): Promise<string> {
  const p = await getPool();

  // 테이블/컬럼 변경 시간, SP 수정 시간 등을 종합하여 체크섬 생성
  const result = await p.request().query(`
    SELECT
      CHECKSUM_AGG(CHECKSUM(
        t.TABLE_SCHEMA,
        t.TABLE_NAME,
        c.COLUMN_NAME,
        c.DATA_TYPE,
        ISNULL(c.CHARACTER_MAXIMUM_LENGTH, 0)
      )) AS tables_checksum,
      (SELECT CHECKSUM_AGG(CHECKSUM(OBJECT_NAME(object_id), modify_date))
       FROM sys.procedures) AS sp_checksum,
      (SELECT MAX(modify_date) FROM sys.objects
       WHERE type IN ('U', 'P', 'V')) AS last_modified
    FROM INFORMATION_SCHEMA.TABLES t
    JOIN INFORMATION_SCHEMA.COLUMNS c
      ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
    WHERE t.TABLE_TYPE = 'BASE TABLE'
  `);

  const row = result.recordset[0];
  return `${row.tables_checksum}-${row.sp_checksum}-${row.last_modified}`;
}

export async function hasSchemaChanged(): Promise<boolean> {
  if (!schemaCache) return true;

  const currentChecksum = await getSchemaChecksum();
  return currentChecksum !== schemaCache.checksum;
}

// ============================================
// 테이블 정보 조회
// ============================================

async function loadTables(): Promise<Map<string, TableInfo>> {
  const p = await getPool();
  const tables = new Map<string, TableInfo>();

  // 컬럼 정보 조회
  const columnsResult = await p.request().query(`
    SELECT
      t.TABLE_SCHEMA,
      t.TABLE_NAME,
      c.COLUMN_NAME,
      c.DATA_TYPE,
      c.IS_NULLABLE,
      c.CHARACTER_MAXIMUM_LENGTH,
      CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS IS_PRIMARY,
      fk.REFERENCED_TABLE_SCHEMA,
      fk.REFERENCED_TABLE_NAME,
      fk.REFERENCED_COLUMN_NAME
    FROM INFORMATION_SCHEMA.TABLES t
    JOIN INFORMATION_SCHEMA.COLUMNS c
      ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
    LEFT JOIN (
      SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
        ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
      WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
    ) pk ON c.TABLE_SCHEMA = pk.TABLE_SCHEMA
      AND c.TABLE_NAME = pk.TABLE_NAME
      AND c.COLUMN_NAME = pk.COLUMN_NAME
    LEFT JOIN (
      SELECT
        cu.TABLE_SCHEMA,
        cu.TABLE_NAME,
        cu.COLUMN_NAME,
        ku.TABLE_SCHEMA AS REFERENCED_TABLE_SCHEMA,
        ku.TABLE_NAME AS REFERENCED_TABLE_NAME,
        ku.COLUMN_NAME AS REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
      JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE cu
        ON rc.CONSTRAINT_NAME = cu.CONSTRAINT_NAME
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
        ON rc.UNIQUE_CONSTRAINT_NAME = ku.CONSTRAINT_NAME
    ) fk ON c.TABLE_SCHEMA = fk.TABLE_SCHEMA
      AND c.TABLE_NAME = fk.TABLE_NAME
      AND c.COLUMN_NAME = fk.COLUMN_NAME
    WHERE t.TABLE_TYPE = 'BASE TABLE'
    ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME, c.ORDINAL_POSITION
  `);

  for (const row of columnsResult.recordset) {
    const fullName = `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`;

    if (!tables.has(fullName)) {
      tables.set(fullName, {
        schema: row.TABLE_SCHEMA,
        name: row.TABLE_NAME,
        fullName,
        columns: [],
      });
    }

    const table = tables.get(fullName)!;
    table.columns.push({
      name: row.COLUMN_NAME,
      dataType: row.DATA_TYPE,
      maxLength: row.CHARACTER_MAXIMUM_LENGTH,
      isNullable: row.IS_NULLABLE === "YES",
      isPrimaryKey: row.IS_PRIMARY === 1,
      isForeignKey: !!row.REFERENCED_TABLE_NAME,
      foreignKeyRef: row.REFERENCED_TABLE_NAME
        ? `${row.REFERENCED_TABLE_SCHEMA}.${row.REFERENCED_TABLE_NAME}.${row.REFERENCED_COLUMN_NAME}`
        : undefined,
    });
  }

  return tables;
}

// ============================================
// Stored Procedure 정보 조회
// ============================================

async function loadStoredProcedures(): Promise<Map<string, StoredProcedureInfo>> {
  const p = await getPool();
  const procedures = new Map<string, StoredProcedureInfo>();

  // SP 목록 조회
  const spResult = await p.request().query(`
    SELECT
      SCHEMA_NAME(p.schema_id) AS SCHEMA_NAME,
      p.name AS PROCEDURE_NAME,
      par.name AS PARAMETER_NAME,
      TYPE_NAME(par.user_type_id) AS DATA_TYPE,
      par.max_length,
      par.is_output,
      ep.value AS DESCRIPTION
    FROM sys.procedures p
    LEFT JOIN sys.parameters par ON p.object_id = par.object_id
    LEFT JOIN sys.extended_properties ep
      ON p.object_id = ep.major_id AND ep.name = 'MS_Description' AND ep.minor_id = 0
    WHERE p.is_ms_shipped = 0
    ORDER BY SCHEMA_NAME(p.schema_id), p.name, par.parameter_id
  `);

  for (const row of spResult.recordset) {
    const fullName = `${row.SCHEMA_NAME}.${row.PROCEDURE_NAME}`;

    if (!procedures.has(fullName)) {
      procedures.set(fullName, {
        schema: row.SCHEMA_NAME,
        name: row.PROCEDURE_NAME,
        fullName,
        parameters: [],
        description: row.DESCRIPTION || undefined,
      });
    }

    if (row.PARAMETER_NAME) {
      const sp = procedures.get(fullName)!;
      sp.parameters.push({
        name: row.PARAMETER_NAME,
        dataType: row.DATA_TYPE,
        maxLength: row.max_length,
        isOutput: row.is_output,
      });
    }
  }

  return procedures;
}

// ============================================
// View 정보 조회
// ============================================

async function loadViews(): Promise<Map<string, ViewInfo>> {
  const p = await getPool();
  const views = new Map<string, ViewInfo>();

  const viewsResult = await p.request().query(`
    SELECT
      v.TABLE_SCHEMA,
      v.TABLE_NAME,
      c.COLUMN_NAME,
      c.DATA_TYPE,
      c.IS_NULLABLE,
      c.CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.VIEWS v
    JOIN INFORMATION_SCHEMA.COLUMNS c
      ON v.TABLE_NAME = c.TABLE_NAME AND v.TABLE_SCHEMA = c.TABLE_SCHEMA
    ORDER BY v.TABLE_SCHEMA, v.TABLE_NAME, c.ORDINAL_POSITION
  `);

  for (const row of viewsResult.recordset) {
    const fullName = `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`;

    if (!views.has(fullName)) {
      views.set(fullName, {
        schema: row.TABLE_SCHEMA,
        name: row.TABLE_NAME,
        fullName,
        columns: [],
      });
    }

    const view = views.get(fullName)!;
    view.columns.push({
      name: row.COLUMN_NAME,
      dataType: row.DATA_TYPE,
      maxLength: row.CHARACTER_MAXIMUM_LENGTH,
      isNullable: row.IS_NULLABLE === "YES",
      isPrimaryKey: false,
      isForeignKey: false,
    });
  }

  return views;
}

// ============================================
// 캐시 로드 및 갱신
// ============================================

export async function loadSchemaCache(force = false): Promise<SchemaCache> {
  // 캐시가 있고 강제 갱신이 아니면 변경 여부 확인
  if (schemaCache && !force) {
    const changed = await hasSchemaChanged();
    if (!changed) {
      console.log("[SchemaCache] Using cached schema (no changes detected)");
      return schemaCache;
    }
    console.log("[SchemaCache] Schema changed, reloading...");
  }

  console.log("[SchemaCache] Loading schema...");
  const startTime = Date.now();

  const [tables, storedProcedures, views, checksum] = await Promise.all([
    loadTables(),
    loadStoredProcedures(),
    loadViews(),
    getSchemaChecksum(),
  ]);

  schemaCache = {
    tables,
    storedProcedures,
    views,
    lastUpdated: new Date(),
    checksum,
  };

  console.log(
    `[SchemaCache] Loaded ${tables.size} tables, ${storedProcedures.size} SPs, ${views.size} views in ${Date.now() - startTime}ms`
  );

  return schemaCache;
}

export function getCache(): SchemaCache | null {
  return schemaCache;
}

export function clearCache(): void {
  schemaCache = null;
}

// ============================================
// AI용 스키마 문자열 생성
// ============================================

export async function getSchemaForAI(options?: {
  includeTables?: boolean;
  includeSPs?: boolean;
  includeViews?: boolean;
  tableFilter?: string[]; // 특정 테이블만
}): Promise<string> {
  const cache = await loadSchemaCache();
  const opts = {
    includeTables: true,
    includeSPs: true,
    includeViews: true,
    ...options,
  };

  let result = "";

  // 테이블 정보
  if (opts.includeTables) {
    result += "=== DATABASE TABLES ===\n\n";

    const tablesToInclude = opts.tableFilter
      ? [...cache.tables.values()].filter(
          (t) => opts.tableFilter!.some((f) => t.fullName.toLowerCase().includes(f.toLowerCase()))
        )
      : [...cache.tables.values()];

    for (const table of tablesToInclude) {
      result += `${table.fullName}:\n`;
      for (const col of table.columns) {
        const pk = col.isPrimaryKey ? " [PK]" : "";
        const fk = col.foreignKeyRef ? ` [FK → ${col.foreignKeyRef}]` : "";
        const nullable = col.isNullable ? " NULL" : " NOT NULL";
        const length = col.maxLength ? `(${col.maxLength})` : "";
        result += `  - ${col.name}: ${col.dataType}${length}${nullable}${pk}${fk}\n`;
      }
      result += "\n";
    }
  }

  // Stored Procedure 정보
  if (opts.includeSPs && cache.storedProcedures.size > 0) {
    result += "=== STORED PROCEDURES ===\n\n";

    for (const sp of cache.storedProcedures.values()) {
      result += `${sp.fullName}(`;
      result += sp.parameters
        .map((p) => {
          const out = p.isOutput ? " OUTPUT" : "";
          return `${p.name} ${p.dataType}${out}`;
        })
        .join(", ");
      result += ")\n";
      if (sp.description) {
        result += `  -- ${sp.description}\n`;
      }
      result += "\n";
    }
  }

  // View 정보
  if (opts.includeViews && cache.views.size > 0) {
    result += "=== VIEWS ===\n\n";

    for (const view of cache.views.values()) {
      result += `${view.fullName}:\n`;
      for (const col of view.columns) {
        const length = col.maxLength ? `(${col.maxLength})` : "";
        result += `  - ${col.name}: ${col.dataType}${length}\n`;
      }
      result += "\n";
    }
  }

  return result;
}

// ============================================
// 특정 테이블/SP 정보 조회 (AI가 필요할 때)
// ============================================

export async function getTableInfo(tableName: string): Promise<TableInfo | undefined> {
  const cache = await loadSchemaCache();

  // 정확한 매칭
  if (cache.tables.has(tableName)) {
    return cache.tables.get(tableName);
  }

  // 부분 매칭 (테이블 이름만으로 검색)
  for (const [key, table] of cache.tables) {
    if (table.name.toLowerCase() === tableName.toLowerCase()) {
      return table;
    }
  }

  return undefined;
}

export async function getSPInfo(spName: string): Promise<StoredProcedureInfo | undefined> {
  const cache = await loadSchemaCache();

  if (cache.storedProcedures.has(spName)) {
    return cache.storedProcedures.get(spName);
  }

  for (const [key, sp] of cache.storedProcedures) {
    if (sp.name.toLowerCase() === spName.toLowerCase()) {
      return sp;
    }
  }

  return undefined;
}

// ============================================
// 테이블 관계 분석 (AI 참고용)
// ============================================

export async function getTableRelationships(): Promise<string> {
  const cache = await loadSchemaCache();
  let result = "=== TABLE RELATIONSHIPS ===\n\n";

  for (const table of cache.tables.values()) {
    const fkColumns = table.columns.filter((c) => c.isForeignKey);
    if (fkColumns.length > 0) {
      result += `${table.fullName}:\n`;
      for (const col of fkColumns) {
        result += `  ${col.name} → ${col.foreignKeyRef}\n`;
      }
      result += "\n";
    }
  }

  return result;
}

// ============================================
// 내보내기
// ============================================

export { getPool };

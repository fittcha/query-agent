import sql from "mssql";

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

let pool: sql.ConnectionPool | null = null;

async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

export interface QueryResult {
  recordset: Record<string, unknown>[];
  rowsAffected: number[];
}

export async function executeQuery(query: string): Promise<QueryResult> {
  const p = await getPool();

  // 위험한 명령어 체크 (기본 보호)
  // EXEC은 SP 호출용으로 허용하되, 위험한 시스템 프로시저는 차단
  const dangerousPatterns = /\b(DROP|TRUNCATE|DELETE\s+FROM\s+\w+\s*$|ALTER|CREATE)\b/i;
  const dangerousSPs = /\bEXEC(UTE)?\s+(master\.|xp_|sp_addlogin|sp_droplogin|sp_password)/i;

  if (dangerousPatterns.test(query)) {
    throw new Error("Potentially dangerous query detected. Please review and confirm.");
  }

  if (dangerousSPs.test(query)) {
    throw new Error("System stored procedure calls are not allowed.");
  }

  const result = await p.request().query(query);

  return {
    recordset: result.recordset || [],
    rowsAffected: result.rowsAffected,
  };
}

export async function testConnection(): Promise<boolean> {
  try {
    const p = await getPool();
    await p.request().query("SELECT 1 AS test");
    return true;
  } catch (error) {
    console.error("DB connection test failed:", error);
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

// 기존 getSchema는 schema-cache.ts의 getSchemaForAI로 대체됨
// 하위 호환성을 위해 유지
export async function getSchema(): Promise<string> {
  const { getSchemaForAI } = await import("./schema-cache.js");
  return getSchemaForAI();
}

#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as sql from "mssql";

// ============================================
// MSSQL 연결 설정
// ============================================

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

// ============================================
// MCP 서버 생성
// ============================================

const server = new McpServer({
  name: "query-agent-mcp",
  version: "1.0.0",
});

// ============================================
// 도구 1: 스키마 조회
// ============================================

server.tool(
  "get_schema",
  "데이터베이스의 테이블, 컬럼, 관계 정보를 조회합니다. 어떤 테이블이 있는지, 각 테이블의 구조가 어떻게 되는지 확인할 때 사용합니다.",
  {},
  async () => {
    try {
      const p = await getPool();

      // 테이블 및 컬럼 정보 조회
      const result = await p.request().query(`
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

      // 결과를 테이블별로 그룹화
      const tables: Record<string, { columns: string[] }> = {};

      for (const row of result.recordset) {
        const fullName = `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`;
        if (!tables[fullName]) {
          tables[fullName] = { columns: [] };
        }

        const pk = row.IS_PRIMARY === 1 ? " [PK]" : "";
        const fk = row.REFERENCED_TABLE_NAME
          ? ` [FK → ${row.REFERENCED_TABLE_SCHEMA}.${row.REFERENCED_TABLE_NAME}.${row.REFERENCED_COLUMN_NAME}]`
          : "";
        const nullable = row.IS_NULLABLE === "YES" ? " NULL" : " NOT NULL";
        const length = row.CHARACTER_MAXIMUM_LENGTH ? `(${row.CHARACTER_MAXIMUM_LENGTH})` : "";

        tables[fullName].columns.push(
          `  - ${row.COLUMN_NAME}: ${row.DATA_TYPE}${length}${nullable}${pk}${fk}`
        );
      }

      // 문자열로 포맷팅
      let schemaText = "=== DATABASE TABLES ===\n\n";
      for (const [tableName, info] of Object.entries(tables)) {
        schemaText += `${tableName}:\n`;
        schemaText += info.columns.join("\n") + "\n\n";
      }

      return {
        content: [{ type: "text", text: schemaText }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `스키마 조회 실패: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================
// 도구 2: SQL 쿼리 실행
// ============================================

server.tool(
  "execute_query",
  "SQL SELECT 쿼리를 실행하고 결과를 반환합니다. 데이터를 조회할 때 사용합니다. DROP, TRUNCATE, DELETE 등 위험한 명령은 차단됩니다.",
  {
    query: z.string().describe("실행할 SQL SELECT 쿼리"),
  },
  async ({ query }) => {
    try {
      const p = await getPool();

      // 위험한 명령어 체크
      const dangerousPatterns = /\b(DROP|TRUNCATE|DELETE\s+FROM\s+\w+\s*$|ALTER|CREATE)\b/i;
      const dangerousSPs = /\bEXEC(UTE)?\s+(master\.|xp_|sp_addlogin|sp_droplogin|sp_password)/i;

      if (dangerousPatterns.test(query)) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️ 위험한 쿼리가 감지되었습니다. DROP, TRUNCATE, DELETE, ALTER, CREATE 명령은 실행할 수 없습니다.",
            },
          ],
          isError: true,
        };
      }

      if (dangerousSPs.test(query)) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️ 시스템 저장 프로시저 호출은 허용되지 않습니다.",
            },
          ],
          isError: true,
        };
      }

      const result = await p.request().query(query);

      if (!result.recordset || result.recordset.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "쿼리가 실행되었지만 결과가 없습니다. (0 rows)",
            },
          ],
        };
      }

      // 결과를 테이블 형식으로 포맷팅
      const columns = Object.keys(result.recordset[0]);
      let resultText = `결과: ${result.recordset.length}개 행\n\n`;

      // 헤더
      resultText += columns.join(" | ") + "\n";
      resultText += columns.map(() => "---").join(" | ") + "\n";

      // 데이터 (최대 100행)
      const rows = result.recordset.slice(0, 100);
      for (const row of rows) {
        resultText +=
          columns
            .map((col) => {
              const val = row[col];
              if (val === null) return "NULL";
              if (val instanceof Date) return val.toISOString();
              return String(val);
            })
            .join(" | ") + "\n";
      }

      if (result.recordset.length > 100) {
        resultText += `\n... 외 ${result.recordset.length - 100}개 행 (생략)`;
      }

      return {
        content: [{ type: "text", text: resultText }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `쿼리 실행 실패: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================
// 도구 3: 저장 프로시저 목록 조회
// ============================================

server.tool(
  "get_stored_procedures",
  "데이터베이스의 저장 프로시저(SP) 목록과 파라미터 정보를 조회합니다.",
  {},
  async () => {
    try {
      const p = await getPool();

      const result = await p.request().query(`
        SELECT
          SCHEMA_NAME(p.schema_id) AS SCHEMA_NAME,
          p.name AS PROCEDURE_NAME,
          par.name AS PARAMETER_NAME,
          TYPE_NAME(par.user_type_id) AS DATA_TYPE,
          par.max_length,
          par.is_output
        FROM sys.procedures p
        LEFT JOIN sys.parameters par ON p.object_id = par.object_id
        WHERE p.is_ms_shipped = 0
        ORDER BY SCHEMA_NAME(p.schema_id), p.name, par.parameter_id
      `);

      const procedures: Record<string, string[]> = {};

      for (const row of result.recordset) {
        const fullName = `${row.SCHEMA_NAME}.${row.PROCEDURE_NAME}`;
        if (!procedures[fullName]) {
          procedures[fullName] = [];
        }
        if (row.PARAMETER_NAME) {
          const out = row.is_output ? " OUTPUT" : "";
          procedures[fullName].push(`${row.PARAMETER_NAME} ${row.DATA_TYPE}${out}`);
        }
      }

      let spText = "=== STORED PROCEDURES ===\n\n";
      for (const [spName, params] of Object.entries(procedures)) {
        spText += `${spName}(${params.join(", ")})\n\n`;
      }

      if (Object.keys(procedures).length === 0) {
        spText += "(저장 프로시저가 없습니다)\n";
      }

      return {
        content: [{ type: "text", text: spText }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `SP 목록 조회 실패: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================
// 도구 4: 저장 프로시저 실행
// ============================================

server.tool(
  "execute_stored_procedure",
  "저장 프로시저를 실행합니다. 프로시저 이름과 파라미터를 전달하면 실행 결과를 반환합니다.",
  {
    procedure: z.string().describe("저장 프로시저 이름 (예: dbo.GetUsers)"),
    params: z
      .record(z.union([z.string(), z.number(), z.null()]))
      .optional()
      .describe("파라미터 객체 (예: { userId: 1, status: 'active' })"),
  },
  async ({ procedure, params }) => {
    try {
      const p = await getPool();

      // 시스템 프로시저 차단
      const dangerousSPs = /^(master\.|xp_|sp_addlogin|sp_droplogin|sp_password)/i;
      if (dangerousSPs.test(procedure)) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️ 시스템 저장 프로시저 호출은 허용되지 않습니다.",
            },
          ],
          isError: true,
        };
      }

      // EXEC 쿼리 생성
      let execQuery = `EXEC ${procedure}`;
      if (params && Object.keys(params).length > 0) {
        const paramList = Object.entries(params)
          .map(([key, value]) => {
            if (value === null) return `@${key} = NULL`;
            if (typeof value === "string") return `@${key} = '${value.replace(/'/g, "''")}'`;
            return `@${key} = ${value}`;
          })
          .join(", ");
        execQuery += ` ${paramList}`;
      }

      const result = await p.request().query(execQuery);

      if (!result.recordset || result.recordset.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `${procedure} 실행 완료 (결과 없음)`,
            },
          ],
        };
      }

      // 결과 포맷팅
      const columns = Object.keys(result.recordset[0]);
      let resultText = `${procedure} 실행 결과: ${result.recordset.length}개 행\n\n`;

      resultText += columns.join(" | ") + "\n";
      resultText += columns.map(() => "---").join(" | ") + "\n";

      const rows = result.recordset.slice(0, 100);
      for (const row of rows) {
        resultText +=
          columns
            .map((col) => {
              const val = row[col];
              if (val === null) return "NULL";
              if (val instanceof Date) return val.toISOString();
              return String(val);
            })
            .join(" | ") + "\n";
      }

      return {
        content: [{ type: "text", text: resultText }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `SP 실행 실패: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================
// 도구 5: 테이블 데이터 미리보기
// ============================================

server.tool(
  "preview_table",
  "특정 테이블의 데이터를 미리봅니다. 테이블 구조와 샘플 데이터를 확인할 때 유용합니다.",
  {
    table: z.string().describe("테이블 이름 (예: dbo.Users)"),
    limit: z.number().optional().default(10).describe("조회할 행 수 (기본값: 10, 최대: 100)"),
  },
  async ({ table, limit }) => {
    try {
      const p = await getPool();

      const rowLimit = Math.min(Math.max(1, limit || 10), 100);
      const query = `SELECT TOP ${rowLimit} * FROM ${table}`;

      const result = await p.request().query(query);

      if (!result.recordset || result.recordset.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `${table} 테이블에 데이터가 없습니다.`,
            },
          ],
        };
      }

      const columns = Object.keys(result.recordset[0]);
      let resultText = `${table} 미리보기 (${result.recordset.length}개 행)\n\n`;

      resultText += columns.join(" | ") + "\n";
      resultText += columns.map(() => "---").join(" | ") + "\n";

      for (const row of result.recordset) {
        resultText +=
          columns
            .map((col) => {
              const val = row[col];
              if (val === null) return "NULL";
              if (val instanceof Date) return val.toISOString();
              const str = String(val);
              return str.length > 50 ? str.substring(0, 47) + "..." : str;
            })
            .join(" | ") + "\n";
      }

      return {
        content: [{ type: "text", text: resultText }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `테이블 미리보기 실패: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================
// 서버 시작
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Query Agent MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

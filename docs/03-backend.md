# 3. 백엔드 가이드

## 개요

백엔드는 **Express.js**로 구축되며, TypeScript를 사용합니다.

주요 역할:
- REST API 제공
- MSSQL 데이터베이스 연결
- Claude AI API 연동

---

## 서버 진입점 (`server/index.ts`)

```typescript
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat.js";
import { dbRouter } from "./routes/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors());           // CORS 허용 (프론트엔드 연동)
app.use(express.json());   // JSON 파싱

// 라우터 등록
app.use("/api/chat", chatRouter);  // AI 채팅
app.use("/api/db", dbRouter);      // DB 직접 조회

// 헬스 체크
app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### 코드 설명

| 코드 | 설명 |
|------|------|
| `dotenv.config()` | `.env` 파일의 환경변수를 로드 |
| `app.use(cors())` | Cross-Origin 요청 허용. 프론트(5173)에서 백엔드(3001) 호출 가능 |
| `app.use(express.json())` | `req.body`를 JSON으로 파싱 |
| `app.use("/api/chat", chatRouter)` | `/api/chat/*` 요청을 chatRouter에서 처리 |

---

## MSSQL 연결 모듈 (`server/db/mssql.ts`)

### 설정

```typescript
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
    max: 10,      // 최대 연결 수
    min: 0,       // 최소 연결 수
    idleTimeoutMillis: 30000,  // 유휴 연결 타임아웃
  },
};
```

### 연결 풀 (Connection Pool)

```typescript
let pool: sql.ConnectionPool | null = null;

async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}
```

**연결 풀이란?**

DB 연결을 미리 여러 개 만들어두고 재사용하는 기법입니다.

- 매 요청마다 연결을 새로 만들면 느림 (약 100ms)
- 풀에서 기존 연결을 가져오면 빠름 (약 1ms)

### `getSchema()` - 스키마 조회

```typescript
export async function getSchema(): Promise<string> {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      t.TABLE_SCHEMA,
      t.TABLE_NAME,
      c.COLUMN_NAME,
      c.DATA_TYPE,
      c.IS_NULLABLE
    FROM INFORMATION_SCHEMA.TABLES t
    JOIN INFORMATION_SCHEMA.COLUMNS c
      ON t.TABLE_NAME = c.TABLE_NAME
    WHERE t.TABLE_TYPE = 'BASE TABLE'
    ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
  `);

  // 결과를 문자열로 변환
  // "dbo.users: id (int), name (varchar), email (varchar)..."
}
```

**INFORMATION_SCHEMA란?**

SQL Server의 메타데이터를 저장하는 시스템 뷰입니다.

- `INFORMATION_SCHEMA.TABLES` - 테이블 목록
- `INFORMATION_SCHEMA.COLUMNS` - 컬럼 목록

AI에게 스키마 정보를 알려주면 정확한 테이블/컬럼명으로 SQL을 생성합니다.

### `executeQuery()` - 쿼리 실행

```typescript
export async function executeQuery(query: string): Promise<QueryResult> {
  const pool = await getPool();

  // 위험한 명령어 체크
  const dangerousPatterns = /\b(DROP|TRUNCATE|DELETE\s+FROM\s+\w+\s*$|ALTER|CREATE)\b/i;
  if (dangerousPatterns.test(query)) {
    throw new Error("Potentially dangerous query detected.");
  }

  const result = await pool.request().query(query);

  return {
    recordset: result.recordset || [],
    rowsAffected: result.rowsAffected,
  };
}
```

**보안 체크**

정규식으로 위험한 SQL 명령을 차단합니다:

| 패턴 | 설명 |
|------|------|
| `DROP` | 테이블/DB 삭제 |
| `TRUNCATE` | 테이블 데이터 전체 삭제 |
| `DELETE FROM table$` | WHERE 없는 전체 삭제 |
| `ALTER` | 테이블 구조 변경 |
| `CREATE` | 새 객체 생성 |

---

## 채팅 API (`server/routes/chat.ts`)

### 엔드포인트

```
POST /api/chat
```

### 요청

```json
{
  "message": "users 테이블에서 최근 10명 보여줘",
  "provider": "claude",
  "dbType": "mssql"
}
```

### 처리 과정

```typescript
router.post("/", async (req, res) => {
  const { message } = req.body;

  // 1. 스키마 정보 가져오기
  const schema = await getSchema();

  // 2. Claude API 호출
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Database Schema:\n${schema}\n\nUser Question: ${message}`,
      },
    ],
  });

  // 3. 응답에서 SQL 추출
  const parsed = JSON.parse(response.content[0].text);

  // 4. SQL 실행 (필요시)
  let queryResult = null;
  if (parsed.sql && parsed.action === "query") {
    queryResult = await executeQuery(parsed.sql);
  }

  // 5. 결과 반환
  res.json({
    message: parsed.message,
    sql: parsed.sql,
    result: queryResult,
  });
});
```

### 시스템 프롬프트

```typescript
const SYSTEM_PROMPT = `You are a database assistant.

When generating SQL:
- Always use safe practices
- For SELECT queries, add TOP 100 by default
- Never generate DROP, TRUNCATE, or destructive commands

Respond in JSON format:
{
  "message": "Your explanation",
  "sql": "SELECT query or null",
  "action": "query" | "execute" | "explain" | "none"
}`;
```

AI에게 역할과 응답 형식을 지정합니다.

---

## DB API (`server/routes/db.ts`)

프론트엔드에서 직접 DB를 조회할 때 사용합니다.

### 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/db/health` | 연결 상태 확인 |
| GET | `/api/db/schema` | 스키마 조회 |
| POST | `/api/db/query` | SQL 직접 실행 |

### 예시

```typescript
// GET /api/db/health
router.get("/health", async (_, res) => {
  const connected = await testConnection();
  res.json({ connected });
});

// POST /api/db/query
router.post("/query", async (req, res) => {
  const { sql } = req.body;
  const result = await executeQuery(sql);
  res.json({ data: result.recordset });
});
```

---

## 에러 처리

```typescript
try {
  const result = await executeQuery(sql);
  res.json({ success: true, data: result });
} catch (error) {
  res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
  });
}
```

- `try-catch`로 예외 처리
- 에러 메시지를 클라이언트에 전달
- HTTP 500 상태 코드 반환

---

## 환경변수

`.env` 파일에 설정:

```bash
# API Keys
ANTHROPIC_API_KEY=sk-ant-...

# Database
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=YourPassword
MSSQL_DATABASE=master
MSSQL_ENCRYPT=false

# Server
PORT=3001
```

---

## 다음 단계

[4. 프론트엔드 가이드](./04-frontend.md)에서 React UI를 알아봅니다.

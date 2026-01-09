# 6. API 레퍼런스

## 기본 정보

| 항목 | 값 |
|------|------|
| Base URL | `http://localhost:3001` |
| Content-Type | `application/json` |

---

## 엔드포인트 목록

### 기본

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/health` | 서버 상태 확인 |

### 채팅

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/chat` | AI 채팅 (자연어 → SQL) |
| GET | `/api/chat/table/:name` | 특정 테이블 정보 |
| GET | `/api/chat/sp/:name` | 특정 SP 정보 |
| DELETE | `/api/chat/history/:sessionId` | 대화 히스토리 삭제 |

### 데이터베이스

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/db/health` | DB 연결 상태 |
| GET | `/api/db/schema` | 스키마 조회 |
| POST | `/api/db/schema/refresh` | 스키마 캐시 갱신 |
| GET | `/api/db/schema/check` | 스키마 변경 확인 |
| GET | `/api/db/tables` | 테이블 목록 |
| GET | `/api/db/tables/:name` | 특정 테이블 정보 |
| GET | `/api/db/procedures` | SP 목록 |
| GET | `/api/db/procedures/:name` | 특정 SP 정보 |
| GET | `/api/db/relationships` | 테이블 관계 |
| POST | `/api/db/query` | SQL 직접 실행 |
| DELETE | `/api/db/cache` | 캐시 초기화 |

---

## `GET /api/health`

서버가 정상 작동 중인지 확인합니다.

### 요청

```bash
curl http://localhost:3001/api/health
```

### 응답

```json
{
  "status": "ok"
}
```

---

## `POST /api/chat`

자연어 질문을 받아 SQL을 생성하고 실행합니다.

### 요청

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "users 테이블에서 최근 10명 보여줘", "sessionId": "user123"}'
```

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `message` | string | O | 자연어 질문 |
| `sessionId` | string | X | 세션 ID (대화 히스토리 유지용, 기본: `"default"`) |
| `provider` | string | X | AI 제공자 (기본: `"claude"`) |
| `dbType` | string | X | DB 타입 (기본: `"mssql"`) |

### 응답

```json
{
  "message": "users 테이블에서 최근 가입한 10명을 조회하겠습니다.",
  "sql": "SELECT TOP 10 * FROM users ORDER BY created_at DESC",
  "action": "query",
  "result": [
    { "id": 3, "name": "이영희", "email": "lee@example.com" }
  ],
  "provider": "claude",
  "sessionId": "user123",
  "schemaRefreshed": false
}
```

### 응답 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `message` | string | AI의 설명 (한국어) |
| `sql` | string \| null | 생성된 SQL 또는 EXEC 문 |
| `action` | string | `"query"`, `"execute"`, `"explain"`, `"none"` |
| `result` | array \| null | 쿼리 실행 결과 |
| `provider` | string | 사용된 AI 제공자 |
| `sessionId` | string | 세션 ID |
| `schemaRefreshed` | boolean | 스키마가 갱신되었는지 여부 |

---

## `DELETE /api/chat/history/:sessionId`

특정 세션의 대화 히스토리를 삭제합니다.

### 요청

```bash
curl -X DELETE http://localhost:3001/api/chat/history/user123
```

### 응답

```json
{
  "success": true,
  "message": "Conversation history cleared"
}
```

---

## `GET /api/db/health`

데이터베이스 연결 상태를 확인합니다.

### 요청

```bash
curl http://localhost:3001/api/db/health
```

### 응답 (성공)

```json
{
  "connected": true,
  "message": "Database connected"
}
```

### 응답 (실패)

```json
{
  "connected": false,
  "error": "ConnectionError: Failed to connect to localhost:1433"
}
```

---

## `GET /api/db/schema`

스키마 정보를 조회합니다 (캐시 사용).

### 요청

```bash
# 텍스트 형식 (AI용)
curl http://localhost:3001/api/db/schema

# JSON 형식
curl "http://localhost:3001/api/db/schema?format=json"

# 강제 갱신 후 조회
curl "http://localhost:3001/api/db/schema?refresh=true"
```

### 쿼리 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `format` | string | `json`이면 구조화된 JSON, 없으면 텍스트 |
| `refresh` | boolean | `true`면 캐시 강제 갱신 |

### 응답 (텍스트 형식)

```json
{
  "schema": "=== DATABASE TABLES ===\n\ndbo.users:\n  - id: int NOT NULL [PK]\n..."
}
```

### 응답 (JSON 형식)

```json
{
  "tables": {
    "dbo.users": {
      "schema": "dbo",
      "name": "users",
      "fullName": "dbo.users",
      "columns": [
        {
          "name": "id",
          "dataType": "int",
          "isNullable": false,
          "isPrimaryKey": true
        }
      ]
    }
  },
  "storedProcedures": { ... },
  "views": { ... },
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

---

## `POST /api/db/schema/refresh`

스키마 캐시를 강제로 갱신합니다.

### 요청

```bash
curl -X POST http://localhost:3001/api/db/schema/refresh
```

### 응답

```json
{
  "success": true,
  "message": "Schema cache refreshed",
  "stats": {
    "tables": 15,
    "storedProcedures": 8,
    "views": 3,
    "duration": 234
  },
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

---

## `GET /api/db/schema/check`

스키마 변경 여부를 확인합니다.

### 요청

```bash
curl http://localhost:3001/api/db/schema/check
```

### 응답

```json
{
  "changed": false,
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "cached": true
}
```

---

## `GET /api/db/tables`

테이블 목록을 조회합니다.

### 요청

```bash
curl http://localhost:3001/api/db/tables
```

### 응답

```json
{
  "tables": [
    {
      "schema": "dbo",
      "name": "users",
      "fullName": "dbo.users",
      "columnCount": 5
    },
    {
      "schema": "dbo",
      "name": "orders",
      "fullName": "dbo.orders",
      "columnCount": 4
    }
  ]
}
```

---

## `GET /api/db/tables/:name`

특정 테이블의 상세 정보를 조회합니다.

### 요청

```bash
curl http://localhost:3001/api/db/tables/users
# 또는
curl http://localhost:3001/api/db/tables/dbo.users
```

### 응답

```json
{
  "schema": "dbo",
  "name": "users",
  "fullName": "dbo.users",
  "columns": [
    {
      "name": "id",
      "dataType": "int",
      "maxLength": null,
      "isNullable": false,
      "isPrimaryKey": true,
      "isForeignKey": false
    },
    {
      "name": "email",
      "dataType": "nvarchar",
      "maxLength": 255,
      "isNullable": true,
      "isPrimaryKey": false,
      "isForeignKey": false
    }
  ]
}
```

---

## `GET /api/db/procedures`

Stored Procedure 목록을 조회합니다.

### 요청

```bash
curl http://localhost:3001/api/db/procedures
```

### 응답

```json
{
  "procedures": [
    {
      "schema": "dbo",
      "name": "GetUserOrders",
      "fullName": "dbo.GetUserOrders",
      "parameterCount": 2,
      "description": "사용자별 주문 조회"
    }
  ]
}
```

---

## `GET /api/db/procedures/:name`

특정 SP의 상세 정보를 조회합니다.

### 요청

```bash
curl http://localhost:3001/api/db/procedures/GetUserOrders
```

### 응답

```json
{
  "schema": "dbo",
  "name": "GetUserOrders",
  "fullName": "dbo.GetUserOrders",
  "parameters": [
    {
      "name": "@userId",
      "dataType": "int",
      "maxLength": 4,
      "isOutput": false
    },
    {
      "name": "@startDate",
      "dataType": "datetime",
      "maxLength": 8,
      "isOutput": false
    }
  ],
  "description": "사용자별 주문 조회"
}
```

---

## `GET /api/db/relationships`

테이블 간 FK 관계를 조회합니다.

### 요청

```bash
curl http://localhost:3001/api/db/relationships
```

### 응답

```json
{
  "relationships": "=== TABLE RELATIONSHIPS ===\n\ndbo.orders:\n  user_id → dbo.users.id\n  product_id → dbo.products.id\n"
}
```

---

## `POST /api/db/query`

SQL 쿼리를 직접 실행합니다.

### 요청

```bash
curl -X POST http://localhost:3001/api/db/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users"}'
```

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `sql` | string | O | 실행할 SQL 쿼리 |

### 응답 (성공)

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "홍길동", "email": "hong@example.com" }
  ],
  "rowsAffected": [1]
}
```

### 응답 (실패)

```json
{
  "success": false,
  "error": "Potentially dangerous query detected. Please review and confirm."
}
```

### 차단되는 쿼리

| 패턴 | 예시 |
|------|------|
| DROP | `DROP TABLE users` |
| TRUNCATE | `TRUNCATE TABLE users` |
| DELETE (전체) | `DELETE FROM users` |
| ALTER | `ALTER TABLE users ADD column` |
| CREATE | `CREATE TABLE new_table` |
| 위험한 SP | `EXEC xp_cmdshell`, `EXEC master.dbo.sp_*` |

---

## `DELETE /api/db/cache`

스키마 캐시를 초기화합니다.

### 요청

```bash
curl -X DELETE http://localhost:3001/api/db/cache
```

### 응답

```json
{
  "success": true,
  "message": "Schema cache cleared"
}
```

---

## 에러 코드

| HTTP 코드 | 설명 |
|-----------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 (필수 파라미터 누락) |
| 404 | 리소스를 찾을 수 없음 (테이블/SP 없음) |
| 500 | 서버 에러 (DB 연결 실패, API 에러 등) |

### 에러 응답 형식

```json
{
  "error": "에러 메시지"
}
```

---

## JavaScript 사용 예시

```javascript
// 세션별 채팅
async function chat(message, sessionId = 'default') {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  });
  return response.json();
}

// 대화 (컨텍스트 유지)
let result = await chat('users 테이블 보여줘', 'session1');
result = await chat('그 중에서 이메일이 gmail인 사람만', 'session1');

// 대화 초기화
await fetch('/api/chat/history/session1', { method: 'DELETE' });
```

```javascript
// 스키마 캐시 관리
async function refreshSchema() {
  const response = await fetch('/api/db/schema/refresh', { method: 'POST' });
  return response.json();
}

// 스키마 변경 확인
async function checkSchemaChanged() {
  const response = await fetch('/api/db/schema/check');
  const data = await response.json();
  return data.changed;
}
```

---

## cURL 예시 모음

```bash
# 서버 상태 확인
curl http://localhost:3001/api/health

# DB 연결 확인
curl http://localhost:3001/api/db/health

# 스키마 조회 (텍스트)
curl http://localhost:3001/api/db/schema

# 스키마 조회 (JSON)
curl "http://localhost:3001/api/db/schema?format=json"

# 스키마 강제 갱신
curl -X POST http://localhost:3001/api/db/schema/refresh

# 스키마 변경 확인
curl http://localhost:3001/api/db/schema/check

# 테이블 목록
curl http://localhost:3001/api/db/tables

# 특정 테이블 정보
curl http://localhost:3001/api/db/tables/users

# SP 목록
curl http://localhost:3001/api/db/procedures

# 특정 SP 정보
curl http://localhost:3001/api/db/procedures/GetUserOrders

# 테이블 관계
curl http://localhost:3001/api/db/relationships

# AI 채팅 (세션 지정)
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "모든 테이블 목록 보여줘", "sessionId": "user123"}'

# 대화 히스토리 삭제
curl -X DELETE http://localhost:3001/api/chat/history/user123

# SQL 직접 실행
curl -X POST http://localhost:3001/api/db/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT TOP 5 * FROM users"}'

# 캐시 초기화
curl -X DELETE http://localhost:3001/api/db/cache
```

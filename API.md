# API 명세

## Base URL

```
http://localhost:3001/api
```

---

## Health Check

### `GET /health`

서버 상태 확인

**Response**
```json
{
  "status": "ok"
}
```

---

## Chat API

### `POST /chat`

자연어 질문을 SQL로 변환하고 실행

**Request Body**
```json
{
  "message": "2024년 12월 취소된 주문 보여줘",
  "provider": "claude",
  "dbType": "mssql",
  "sessionId": "user-session-123"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| message | string | ✅ | 자연어 질문 |
| provider | string | ❌ | AI 모델 (claude, groq, gemini) - default: "claude" |
| dbType | string | ❌ | DB 타입 (mssql) - default: "mssql" |
| sessionId | string | ❌ | 세션 ID (대화 컨텍스트 유지용) - default: "default" |

**Response (성공)**
```json
{
  "message": "2024년 12월에 취소된 주문을 조회합니다.",
  "sql": "SELECT TOP 100 * FROM Orders WHERE Status = 'CANCEL' AND OrderDate BETWEEN '2024-12-01' AND '2024-12-31'",
  "action": "query",
  "result": {
    "recordset": [...],
    "rowsAffected": [100]
  },
  "provider": "claude",
  "sessionId": "user-session-123",
  "schemaRefreshed": false
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| message | string | AI 응답 메시지 (한국어) |
| sql | string \| null | 생성된 SQL 쿼리 |
| action | string | 수행 액션 (query, execute, explain, none) |
| result | object \| null | 쿼리 실행 결과 |
| provider | string | 사용된 AI 모델 |
| sessionId | string | 세션 ID |
| schemaRefreshed | boolean | 스키마 캐시 갱신 여부 |

### `GET /chat/table/:name`

특정 테이블 정보 조회 (AI 컨텍스트용)

**Response**
```json
{
  "schema": "dbo",
  "name": "Orders",
  "fullName": "dbo.Orders",
  "columns": [
    {
      "name": "OrderId",
      "dataType": "int",
      "maxLength": null,
      "isNullable": false,
      "isPrimaryKey": true,
      "isForeignKey": false
    }
  ]
}
```

### `GET /chat/sp/:name`

특정 Stored Procedure 정보 조회 (AI 컨텍스트용)

**Response**
```json
{
  "schema": "dbo",
  "name": "sp_GetOrders",
  "fullName": "dbo.sp_GetOrders",
  "parameters": [
    {
      "name": "@StartDate",
      "dataType": "datetime",
      "maxLength": 8,
      "isOutput": false
    }
  ],
  "description": "주문 조회 프로시저"
}
```

### `DELETE /chat/history/:sessionId`

대화 히스토리 삭제

**Response**
```json
{
  "success": true,
  "message": "Conversation history cleared"
}
```

---

## DB API

### `GET /db/schema`

현재 연결된 DB의 스키마 정보 조회

**Query Parameters**

| 파라미터 | 설명 |
|----------|------|
| format=json | JSON 형식으로 반환 (기본: 텍스트) |

**Response (format=json)**
```json
{
  "tables": [
    {
      "schema": "dbo",
      "name": "Orders",
      "fullName": "dbo.Orders",
      "columns": [
        {
          "name": "OrderId",
          "dataType": "int",
          "maxLength": null,
          "isNullable": false,
          "isPrimaryKey": true,
          "isForeignKey": false
        }
      ]
    }
  ],
  "storedProcedures": [
    {
      "schema": "dbo",
      "name": "sp_GetOrders",
      "fullName": "dbo.sp_GetOrders",
      "parameters": [...]
    }
  ],
  "views": [
    {
      "schema": "dbo",
      "name": "vw_OrderSummary",
      "fullName": "dbo.vw_OrderSummary",
      "columns": [...]
    }
  ],
  "lastUpdated": "2025-01-10T12:00:00.000Z"
}
```

### `POST /db/schema/refresh`

스키마 캐시 강제 갱신

**Response**
```json
{
  "success": true,
  "tables": 25,
  "storedProcedures": 10,
  "views": 5,
  "lastUpdated": "2025-01-10T12:00:00.000Z"
}
```

### `GET /db/schema/check`

스키마 변경 여부 확인

**Response**
```json
{
  "changed": false,
  "currentChecksum": "123456-789-2025-01-10",
  "cachedChecksum": "123456-789-2025-01-10"
}
```

### `GET /db/tables`

테이블 목록 조회

**Response**
```json
{
  "tables": [
    {
      "schema": "dbo",
      "name": "Orders",
      "fullName": "dbo.Orders",
      "columnCount": 15
    }
  ],
  "count": 25
}
```

### `GET /db/tables/:name`

특정 테이블 상세 정보

**Response**
```json
{
  "schema": "dbo",
  "name": "Orders",
  "fullName": "dbo.Orders",
  "columns": [...],
  "rowCount": 15000
}
```

### `GET /db/procedures`

Stored Procedure 목록 조회

**Response**
```json
{
  "procedures": [
    {
      "schema": "dbo",
      "name": "sp_GetOrders",
      "fullName": "dbo.sp_GetOrders",
      "parameterCount": 3
    }
  ],
  "count": 10
}
```

### `GET /db/procedures/:name`

특정 SP 상세 정보

**Response**
```json
{
  "schema": "dbo",
  "name": "sp_GetOrders",
  "fullName": "dbo.sp_GetOrders",
  "parameters": [
    {
      "name": "@StartDate",
      "dataType": "datetime",
      "maxLength": 8,
      "isOutput": false
    }
  ],
  "description": "주문 조회"
}
```

### `GET /db/relationships`

테이블 관계 (FK) 정보 조회

**Response**
```json
{
  "relationships": "=== TABLE RELATIONSHIPS ===\n\ndbo.Orders:\n  CustomerId → dbo.Customers.Id\n  ProductId → dbo.Products.Id\n"
}
```

### `POST /db/query`

SQL 직접 실행 (개발/테스트용)

**Request Body**
```json
{
  "sql": "SELECT TOP 10 * FROM Orders"
}
```

**Response**
```json
{
  "recordset": [...],
  "rowsAffected": [10]
}
```

### `GET /db/health`

DB 연결 상태 확인

**Response (성공)**
```json
{
  "connected": true,
  "database": "MyDatabase",
  "server": "localhost",
  "responseTime": 15
}
```

**Response (실패)**
```json
{
  "connected": false,
  "error": "Connection refused"
}
```

### `DELETE /db/cache`

스키마 캐시 초기화

**Response**
```json
{
  "success": true,
  "message": "Cache cleared"
}
```

---

## 에러 코드

| 상태 코드 | 설명 |
|-----------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 (파라미터 오류) |
| 401 | 인증 실패 (API 키 오류) |
| 404 | 리소스를 찾을 수 없음 |
| 500 | 서버 오류 |

---

## 지원 예정 API

| 엔드포인트 | 설명 | 상태 |
|------------|------|------|
| `GET /ai/providers` | 사용 가능한 AI 모델 목록 | 개발 예정 |
| `GET /db/connections` | 저장된 DB 연결 목록 | 개발 예정 |
| `POST /db/connections` | DB 연결 추가 | 개발 예정 |
| `DELETE /db/connections/:id` | DB 연결 삭제 | 개발 예정 |

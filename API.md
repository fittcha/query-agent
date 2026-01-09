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
  "provider": "claude",    // optional, default: "claude"
  "dbType": "mssql"        // optional, default: "mssql"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| message | string | ✅ | 자연어 질문 |
| provider | string | ❌ | AI 모델 (claude, gpt, gemini) |
| dbType | string | ❌ | DB 타입 (mssql, postgresql, mysql) |

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
  "provider": "claude"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| message | string | AI 응답 메시지 |
| sql | string \| null | 생성된 SQL 쿼리 |
| action | string | 수행 액션 (query, execute, explain, none) |
| result | object \| null | 쿼리 실행 결과 |
| provider | string | 사용된 AI 모델 |

**Response (에러)**
```json
{
  "error": "에러 메시지"
}
```

---

## DB API (예정)

### `GET /db/schema`

현재 연결된 DB의 스키마 정보 조회

**Response**
```json
{
  "tables": [
    {
      "name": "Orders",
      "columns": [
        { "name": "OrderId", "type": "int", "nullable": false },
        { "name": "Status", "type": "varchar(20)", "nullable": true }
      ],
      "indexes": [
        { "name": "PK_Orders", "columns": ["OrderId"], "unique": true }
      ]
    }
  ]
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

### `GET /db/test`

DB 연결 테스트

**Response**
```json
{
  "connected": true,
  "database": "MyDatabase",
  "server": "localhost"
}
```

---

## 에러 코드

| 상태 코드 | 설명 |
|-----------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 (파라미터 오류) |
| 401 | 인증 실패 (API 키 오류) |
| 500 | 서버 오류 |

---

## 예정된 API

| 엔드포인트 | 설명 |
|------------|------|
| `GET /db/connections` | 저장된 DB 연결 목록 |
| `POST /db/connections` | DB 연결 추가 |
| `DELETE /db/connections/:id` | DB 연결 삭제 |
| `GET /ai/providers` | 사용 가능한 AI 모델 목록 |

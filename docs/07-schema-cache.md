# 7. 스키마 캐싱 시스템

## 개요

Query Agent는 데이터베이스 스키마를 메모리에 캐싱하여 성능을 최적화합니다.
매 요청마다 DB 스키마를 조회하지 않고, 변경이 감지될 때만 갱신합니다.

---

## 왜 캐싱이 필요한가?

### 문제

```
사용자 질문 → 스키마 조회 (200ms) → AI 호출 → SQL 실행
사용자 질문 → 스키마 조회 (200ms) → AI 호출 → SQL 실행
사용자 질문 → 스키마 조회 (200ms) → AI 호출 → SQL 실행
```

매 요청마다 스키마 조회가 발생하면:
- 불필요한 DB 부하
- 응답 시간 증가
- 동일한 데이터 반복 조회

### 해결

```
첫 요청 → 스키마 조회 (200ms) → 캐시 저장 → AI 호출 → SQL 실행
이후 요청 → 캐시 사용 (1ms) → AI 호출 → SQL 실행
스키마 변경 감지 시 → 캐시 갱신 (200ms) → AI 호출 → SQL 실행
```

---

## 캐싱 구조

### 저장되는 정보

```typescript
interface SchemaCache {
  tables: Map<string, TableInfo>;           // 테이블 정보
  storedProcedures: Map<string, SPInfo>;    // SP 정보
  views: Map<string, ViewInfo>;             // 뷰 정보
  lastUpdated: Date;                        // 마지막 갱신 시간
  checksum: string;                         // 변경 감지용 체크섬
}
```

### 테이블 정보 (`TableInfo`)

```typescript
interface TableInfo {
  schema: string;        // "dbo"
  name: string;          // "users"
  fullName: string;      // "dbo.users"
  columns: ColumnInfo[];
}

interface ColumnInfo {
  name: string;          // "id"
  dataType: string;      // "int"
  maxLength: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: string; // "dbo.orders.user_id"
}
```

### SP 정보 (`StoredProcedureInfo`)

```typescript
interface StoredProcedureInfo {
  schema: string;            // "dbo"
  name: string;              // "GetUserOrders"
  fullName: string;          // "dbo.GetUserOrders"
  parameters: ParameterInfo[];
  description?: string;      // SP 설명 (있는 경우)
}

interface ParameterInfo {
  name: string;      // "@userId"
  dataType: string;  // "int"
  maxLength: number | null;
  isOutput: boolean; // OUTPUT 파라미터 여부
}
```

---

## 변경 감지 방식

### Checksum 생성

```sql
SELECT
  CHECKSUM_AGG(CHECKSUM(
    TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE
  )) AS tables_checksum,
  (SELECT CHECKSUM_AGG(CHECKSUM(name, modify_date))
   FROM sys.procedures) AS sp_checksum,
  (SELECT MAX(modify_date) FROM sys.objects
   WHERE type IN ('U', 'P', 'V')) AS last_modified
```

- 테이블/컬럼 구조의 체크섬
- SP의 수정 날짜 체크섬
- 마지막 수정 시간

### 감지 흐름

```
1. 요청 수신
2. 현재 DB checksum 조회 (가벼운 쿼리)
3. 캐시된 checksum과 비교
4. 다르면 → 캐시 전체 갱신
5. 같으면 → 캐시 사용
```

---

## 코드 상세

### 파일 위치

```
server/db/schema-cache.ts
```

### 주요 함수

#### `loadSchemaCache(force?: boolean)`

스키마를 로드하고 캐시합니다.

```typescript
// 일반 호출 (변경 있을 때만 갱신)
const cache = await loadSchemaCache();

// 강제 갱신
const cache = await loadSchemaCache(true);
```

#### `hasSchemaChanged()`

스키마 변경 여부를 확인합니다.

```typescript
const changed = await hasSchemaChanged();
if (changed) {
  console.log("스키마가 변경되었습니다!");
}
```

#### `getSchemaForAI(options?)`

AI에게 전달할 스키마 문자열을 생성합니다.

```typescript
// 전체 스키마
const schema = await getSchemaForAI();

// 테이블만
const schema = await getSchemaForAI({
  includeTables: true,
  includeSPs: false,
  includeViews: false,
});

// 특정 테이블만
const schema = await getSchemaForAI({
  tableFilter: ["users", "orders"],
});
```

#### `getTableInfo(name)`

특정 테이블 정보를 조회합니다.

```typescript
const table = await getTableInfo("users");
// 또는
const table = await getTableInfo("dbo.users");
```

#### `getSPInfo(name)`

특정 SP 정보를 조회합니다.

```typescript
const sp = await getSPInfo("GetUserOrders");
```

#### `getTableRelationships()`

FK 기반 테이블 관계를 문자열로 반환합니다.

```typescript
const relationships = await getTableRelationships();
// 결과:
// dbo.orders:
//   user_id → dbo.users.id
//   product_id → dbo.products.id
```

---

## AI 프롬프트 구조

### 첫 메시지

```
Database Schema:
=== DATABASE TABLES ===

dbo.users:
  - id: int NOT NULL [PK]
  - name: nvarchar(100) NULL
  - email: nvarchar(255) NULL

dbo.orders:
  - id: int NOT NULL [PK]
  - user_id: int NULL [FK → dbo.users.id]
  - total: decimal NULL

=== STORED PROCEDURES ===

dbo.GetUserOrders(@userId int, @startDate datetime)

=== VIEWS ===

dbo.vw_OrderSummary:
  - user_name: nvarchar
  - order_count: int
  - total_amount: decimal

Table Relationships:
dbo.orders:
  user_id → dbo.users.id

User Question: users 테이블에서 최근 가입자 10명 보여줘
```

### 이후 메시지

```
User Question: 그 사람들의 주문 내역도 보여줘
```

첫 메시지에만 스키마를 포함하여 토큰을 절약합니다.

---

## API 엔드포인트

### 스키마 조회

```bash
# 텍스트 형식 (AI용)
GET /api/db/schema

# JSON 형식
GET /api/db/schema?format=json

# 강제 갱신 후 조회
GET /api/db/schema?refresh=true
```

### 스키마 갱신

```bash
POST /api/db/schema/refresh
```

응답:
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

### 변경 확인

```bash
GET /api/db/schema/check
```

응답:
```json
{
  "changed": false,
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "cached": true
}
```

### 테이블 목록

```bash
GET /api/db/tables
```

### 특정 테이블

```bash
GET /api/db/tables/users
```

### SP 목록

```bash
GET /api/db/procedures
```

### 특정 SP

```bash
GET /api/db/procedures/GetUserOrders
```

### 테이블 관계

```bash
GET /api/db/relationships
```

### 캐시 초기화

```bash
DELETE /api/db/cache
```

---

## 성능 비교

| 시나리오 | 캐싱 없음 | 캐싱 사용 |
|---------|----------|----------|
| 첫 요청 | 250ms | 250ms |
| 이후 요청 | 250ms | 5ms |
| 10회 요청 총합 | 2500ms | 295ms |

---

## 주의사항

### 1. 메모리 사용

대규모 DB의 경우 캐시가 메모리를 많이 사용할 수 있습니다.
- 테이블 100개, 컬럼 1000개 기준: 약 1-2MB

### 2. 서버 재시작

서버 재시작 시 캐시가 초기화됩니다.
첫 요청에서 다시 로드됩니다.

### 3. 실시간 변경

스키마 변경 후 즉시 반영이 필요하면:
```bash
POST /api/db/schema/refresh
```

### 4. 여러 인스턴스

여러 서버 인스턴스 운영 시 각 인스턴스가 개별 캐시를 가집니다.
Redis 등 공유 캐시 도입을 고려하세요. (향후 구현 예정)

---

## 다음 단계

스키마 캐싱 시스템이 구현되었습니다.
[TASK.md](../TASK.md)에서 다음 개발 항목을 확인하세요.

# 2. 아키텍처

## 시스템 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 브라우저                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   React Frontend                         │   │
│  │  - 채팅 UI (메시지 입력/표시)                              │   │
│  │  - 결과 테이블 렌더링                                      │   │
│  │  - DB/AI 선택 UI                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                         HTTP 요청                                │
│                              ▼                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express Backend (Node.js)                    │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  /api/chat   │   │  /api/db/*   │   │ /api/health  │        │
│  │  AI 채팅     │   │  DB 직접     │   │ 상태 체크    │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                  │                                     │
│         ▼                  ▼                                     │
│  ┌──────────────┐   ┌──────────────┐                            │
│  │ Claude API   │   │   MSSQL      │                            │
│  │ (AI 모델)    │   │ (데이터베이스)│                            │
│  └──────────────┘   └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 폴더 구조

```
query-agent/
├── server/                 # 백엔드 (Express)
│   ├── index.ts           # 서버 진입점
│   ├── routes/            # API 라우트
│   │   ├── chat.ts        # AI 채팅 API
│   │   └── db.ts          # DB 직접 조회 API
│   └── db/                # 데이터베이스 연결
│       └── mssql.ts       # MSSQL 연결 모듈
│
├── src/                    # 프론트엔드 (React)
│   ├── main.tsx           # React 진입점
│   ├── App.tsx            # 메인 컴포넌트
│   ├── index.css          # 전역 스타일
│   └── components/        # UI 컴포넌트 (예정)
│
├── docs/                   # 문서
├── index.html             # HTML 템플릿
├── package.json           # 의존성 및 스크립트
├── tsconfig.json          # TypeScript 설정
├── vite.config.ts         # Vite 설정
├── tailwind.config.js     # Tailwind 설정
├── postcss.config.js      # PostCSS 설정
├── .env.example           # 환경변수 예시
└── .env                   # 환경변수 (gitignore)
```

---

## 데이터 흐름

### 1. 사용자가 자연어로 질문

```
"모든 주문에서 총 매출 합계 구해줘"
```

### 2. 프론트엔드 → 백엔드 요청

```javascript
// 프론트엔드
fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({ message: "모든 주문에서 총 매출 합계 구해줘" })
})
```

### 3. 백엔드가 스키마 정보 조회

```typescript
// server/routes/chat.ts
const schema = await getSchema();
// 결과: "dbo.orders: id, customer_id, total_amount, created_at..."
```

### 4. 백엔드가 Claude API 호출

```typescript
// Claude에게 보내는 프롬프트
`Database Schema:
dbo.orders: id, customer_id, total_amount, created_at...

User Question: 모든 주문에서 총 매출 합계 구해줘`
```

### 5. Claude가 SQL 생성

```json
{
  "message": "전체 주문의 매출 합계를 조회하겠습니다.",
  "sql": "SELECT SUM(total_amount) AS total_revenue FROM orders",
  "action": "query"
}
```

### 6. 백엔드가 SQL 실행

```typescript
const result = await executeQuery("SELECT SUM(total_amount) AS total_revenue FROM orders");
// 결과: [{ total_revenue: 1234567 }]
```

### 7. 프론트엔드에 결과 반환

```json
{
  "message": "전체 주문의 매출 합계를 조회하겠습니다.",
  "sql": "SELECT SUM(total_amount) AS total_revenue FROM orders",
  "result": [{ "total_revenue": 1234567 }]
}
```

### 8. UI에 결과 표시

채팅 메시지와 함께 SQL, 결과 테이블이 화면에 표시됩니다.

---

## 핵심 모듈 역할

### `server/db/mssql.ts`

| 함수 | 역할 |
|------|------|
| `getPool()` | 연결 풀 관리 (싱글톤) |
| `getSchema()` | 테이블/컬럼 정보를 문자열로 반환 |
| `executeQuery()` | SQL 실행 및 결과 반환 |
| `testConnection()` | DB 연결 상태 확인 |

### `server/routes/chat.ts`

1. 사용자 메시지 수신
2. 스키마 정보 조회
3. Claude API 호출
4. 응답에서 SQL 추출
5. SQL 실행 (필요시)
6. 결과 반환

### `server/routes/db.ts`

- `/api/db/health` - 연결 테스트
- `/api/db/schema` - 스키마 조회
- `/api/db/query` - SQL 직접 실행

### `src/App.tsx`

- 채팅 메시지 상태 관리
- API 호출 및 결과 표시
- 로딩/에러 처리

---

## 다음 단계

[3. 백엔드 가이드](./03-backend.md)에서 서버 코드를 자세히 알아봅니다.

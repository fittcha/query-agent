# Query Agent

AI-powered query agent with multi-database and multi-LLM support

자연어로 데이터베이스를 조회하고 관리할 수 있는 웹 애플리케이션

## 주요 기능

- **자연어 → SQL 변환**: 자연어 질문을 SQL 쿼리로 자동 생성
- **Multi-Database**: MSSQL, PostgreSQL, MySQL 지원 (예정)
- **Multi-LLM**: Claude, GPT, Gemini 선택 가능 (예정)
- **스키마 인식**: DB 스키마 기반 최적화된 쿼리 생성
- **안전한 실행**: 위험한 쿼리 자동 필터링

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React, TypeScript, Vite, TailwindCSS |
| Backend | Express, TypeScript |
| Database | MSSQL (PostgreSQL, MySQL 확장 예정) |
| AI | Claude API (GPT, Gemini 확장 예정) |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 실제 값으로 수정:

```env
ANTHROPIC_API_KEY=your-api-key
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=your-password
MSSQL_DATABASE=your-database
```

### 3. 개발 서버 실행

```bash
# 프론트 + 백엔드 동시
npm run dev

# 백엔드만
npm run dev:server

# 프론트만
npm run dev:client
```

## 프로젝트 구조

```
query-agent/
├── server/               # Express 백엔드
│   ├── index.ts          # 서버 진입점
│   ├── routes/
│   │   └── chat.ts       # AI 채팅 API
│   └── db/
│       └── mssql.ts      # MSSQL 연결 모듈
├── src/                  # React 프론트엔드 (예정)
├── package.json
├── tsconfig.json
└── .env.example
```

## API 명세

[API.md](./API.md) 참조

## 로드맵

[TASK.md](./TASK.md) 참조

## 라이센스

MIT

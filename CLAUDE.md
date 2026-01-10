# Query Agent

AI 기반 데이터베이스 쿼리 에이전트

## 프로젝트 개요

자연어로 데이터베이스를 조회하고 관리할 수 있는 웹 애플리케이션.
여러 DB와 여러 AI 모델을 선택해서 사용할 수 있는 구조.
Claude Desktop MCP 서버도 지원하여 API 키 없이 사용 가능.

## 기술 스택

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Express + TypeScript
- **Database**: MSSQL (추후 PostgreSQL, MySQL 확장)
- **AI**: Claude, Groq (Llama), Gemini
- **MCP**: @modelcontextprotocol/sdk

## 프로젝트 구조

```
query-agent/
├── server/                  # Express 백엔드 (웹앱용)
│   ├── index.ts             # 서버 진입점
│   ├── routes/              # API 라우트
│   │   ├── chat.ts          # AI 채팅 API
│   │   └── db.ts            # DB 직접 조회 API
│   ├── db/                  # DB 연결 모듈
│   │   ├── mssql.ts         # MSSQL 연결
│   │   └── schema-cache.ts  # 스키마 캐싱/변경 감지
│   └── llm/                 # LLM 프로바이더
│       └── providers.ts     # Claude, Groq, Gemini 연동
├── mcp-server/              # MCP 서버 (Claude Desktop용)
│   ├── index.ts             # MCP 서버 진입점
│   ├── README.md            # MCP 설정 가이드
│   └── claude-desktop-config.example.json
├── src/                     # React 프론트엔드
│   ├── App.tsx              # 메인 앱 (4개 메뉴 화면)
│   ├── main.tsx             # React 진입점
│   └── index.css            # Tailwind 스타일
├── docs/                    # 상세 문서
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env                     # 환경변수 (gitignore)
```

## 개발 명령어

```bash
npm install          # 의존성 설치
npm run dev          # 개발 서버 (프론트 + 백엔드 동시)
npm run dev:server   # 백엔드만
npm run dev:client   # 프론트만
npm run mcp          # MCP 서버 실행
npm run build        # 프로덕션 빌드
```

## 환경변수

`.env.example` 참고해서 `.env` 파일 생성

```env
# AI API Keys (웹앱 사용 시)
ANTHROPIC_API_KEY=your-claude-api-key
GROQ_API_KEY=your-groq-api-key
GOOGLE_API_KEY=your-google-api-key

# Database
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=your-password
MSSQL_DATABASE=your-database
```

## 사용 방법

### 웹앱 (API 키 필요)

```bash
npm run dev
# http://localhost:5173
```

### MCP (Claude Max 플랜, API 키 불필요)

1. Claude Desktop 설정 파일에 MCP 서버 추가
2. Claude Desktop 앱에서 자연어로 DB 조회

자세한 내용: `mcp-server/README.md`

## 프론트엔드 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│  [Query Agent]        │ AI Model: [▼]  Database: [▼]       │
├───────────────────────┼─────────────────────────────────────┤
│  🔍 쿼리              │                                     │
│  🗂️ 스키마            │    ┌──────────┬──────────────┐      │
│  📋 히스토리          │    │ 명령 입력 │    응답      │      │
│  ⚙️ 설정              │    │  (44%)   │   (56%)      │      │
│                       │    └──────────┴──────────────┘      │
│  (10%)                │             (90%)                   │
└───────────────────────┴─────────────────────────────────────┘
```

### 메뉴별 화면

1. **쿼리**: 자연어 명령 입력 + 응답 결과 표시 (2단 레이아웃)
2. **스키마**: 테이블/저장 프로시저/뷰 탭, 컬럼 정보 확인
3. **히스토리**: 실행한 쿼리 목록, 클릭 시 재사용
4. **설정**: DB 연결 상태, 현재 설정, AI 모델/DB 정보

## 지원 AI 모델

| 모델 | 프로바이더 | 비용 |
|------|------------|------|
| Claude Opus 4.5 | Anthropic | 유료 |
| Claude Sonnet 4 | Anthropic | 유료 |
| Llama 3.3 70B | Groq | 무료 |
| Gemini 2.5 Flash | Google | 무료 티어 |

## MCP 도구

| 도구 | 설명 |
|------|------|
| `get_schema` | DB 스키마 조회 |
| `execute_query` | SQL 쿼리 실행 |
| `get_stored_procedures` | SP 목록 조회 |
| `execute_stored_procedure` | SP 실행 |
| `preview_table` | 테이블 미리보기 |

## 코딩 컨벤션

- TypeScript strict 모드 사용
- 함수형 컴포넌트 + hooks 사용
- 에러는 try-catch로 처리하고 사용자에게 명확한 메시지 제공
- SQL 인젝션 방지 필수
- 위험한 쿼리 (DROP, TRUNCATE 등) 차단

# Query Agent

AI 기반 데이터베이스 쿼리 에이전트

자연어로 데이터베이스를 조회하고 관리할 수 있는 웹 애플리케이션 + MCP 서버

## 주요 기능

- **자연어 → SQL 변환**: 자연어 질문을 SQL 쿼리로 자동 생성
- **스키마 캐싱**: DB 스키마를 캐시하여 빠른 응답, 변경 시 자동 갱신
- **SP 지원**: Stored Procedure 파악 및 호출 쿼리 생성
- **테이블 관계 인식**: FK 기반 JOIN 쿼리 자동 생성
- **대화 컨텍스트 유지**: 세션별 대화 히스토리 관리
- **안전한 실행**: 위험한 쿼리 자동 필터링
- **Multi-LLM**: Claude, Groq (Llama), Gemini 지원
- **MCP 서버**: Claude Desktop 앱에서 API 키 없이 사용 가능

## 사용 방법

### 방법 1: 웹앱 (API 키 필요)

브라우저에서 사용하는 웹 인터페이스

```bash
npm install
npm run dev
# http://localhost:5173 접속
```

### 방법 2: Claude Desktop MCP (API 키 불필요)

Claude Max 플랜 사용자는 API 키 없이 Claude Desktop 앱에서 직접 DB 조회 가능

```bash
# Claude Desktop 설정 파일 열기 (macOS)
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

설정 추가:
```json
{
  "mcpServers": {
    "query-agent": {
      "command": "npx",
      "args": ["tsx", "/절대경로/query-agent/mcp-server/index.ts"],
      "env": {
        "MSSQL_HOST": "localhost",
        "MSSQL_PORT": "1433",
        "MSSQL_USER": "sa",
        "MSSQL_PASSWORD": "your-password",
        "MSSQL_DATABASE": "your-database"
      }
    }
  }
}
```

Claude Desktop 재시작 후 대화에서 자연어로 DB 조회

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React, TypeScript, Vite, TailwindCSS |
| Backend | Express, TypeScript |
| Database | MSSQL (PostgreSQL, MySQL 확장 예정) |
| AI | Claude API, Groq SDK, Google Generative AI |
| MCP | @modelcontextprotocol/sdk |

## 지원 AI 모델

| 모델 | 프로바이더 | 비용 |
|------|------------|------|
| Claude Opus 4.5 | Anthropic | 유료 |
| Claude Sonnet 4 | Anthropic | 유료 |
| Llama 3.3 70B | Groq | 무료 |
| Gemini 2.5 Flash | Google | 무료 티어 |

## 프로젝트 구조

```
query-agent/
├── server/                  # Express 백엔드 (웹앱용)
│   ├── index.ts             # 서버 진입점
│   ├── routes/
│   │   ├── chat.ts          # AI 채팅 API
│   │   └── db.ts            # DB 조회 API
│   ├── db/
│   │   ├── mssql.ts         # MSSQL 연결/쿼리 실행
│   │   └── schema-cache.ts  # 스키마 캐싱/변경 감지
│   └── llm/
│       └── providers.ts     # LLM 프로바이더 (Claude, Groq, Gemini)
├── mcp-server/              # MCP 서버 (Claude Desktop용)
│   ├── index.ts             # MCP 서버 진입점
│   ├── README.md            # MCP 설정 가이드
│   └── claude-desktop-config.example.json
├── src/                     # React 프론트엔드
│   ├── App.tsx              # 메인 앱 (4개 메뉴 화면)
│   ├── main.tsx             # React 진입점
│   └── index.css            # Tailwind 스타일
├── docs/                    # 상세 문서
└── .env.example             # 환경변수 예시
```

## 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일:
```env
# AI API Keys (웹앱 사용 시 하나 이상 필수, MCP 사용 시 불필요)
ANTHROPIC_API_KEY=your-claude-api-key
GROQ_API_KEY=your-groq-api-key         # 무료
GOOGLE_API_KEY=your-google-api-key     # 무료 티어

# Database - MSSQL (필수)
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=your-password
MSSQL_DATABASE=your-database
```

## 개발 명령어

```bash
npm install          # 의존성 설치
npm run dev          # 개발 서버 (프론트 + 백엔드 동시)
npm run dev:server   # 백엔드만
npm run dev:client   # 프론트만
npm run mcp          # MCP 서버 실행 (테스트용)
npm run build        # 프로덕션 빌드
```

## 화면 구성

### 레이아웃
- **좌측 사이드바 (10%)**: 메뉴 네비게이션
- **상단 바**: AI 모델, 데이터베이스 선택
- **메인 영역 (90%)**: 메뉴별 콘텐츠

### 메뉴
1. **쿼리**: 자연어 명령 입력 (44%) + 응답 결과 (56%) 2단 레이아웃
2. **스키마**: 테이블/저장 프로시저/뷰 구조 확인
3. **히스토리**: 실행한 쿼리 목록, 클릭 시 재사용
4. **설정**: DB 연결 상태, AI 모델 정보

## MCP 도구

Claude Desktop에서 사용 가능한 도구:

| 도구 | 설명 |
|------|------|
| `get_schema` | DB 스키마 (테이블, 컬럼, 관계) 조회 |
| `execute_query` | SQL SELECT 쿼리 실행 |
| `get_stored_procedures` | 저장 프로시저 목록 조회 |
| `execute_stored_procedure` | 저장 프로시저 실행 |
| `preview_table` | 테이블 데이터 미리보기 |

## 보안

- `DROP`, `TRUNCATE`, `DELETE`, `ALTER`, `CREATE` 명령 차단
- 시스템 저장 프로시저 (`xp_`, `sp_addlogin` 등) 차단
- 결과는 최대 100행으로 제한

## 문서

- [상세 문서](./docs/README.md) - 아키텍처, 백엔드, 프론트엔드 가이드
- [API 명세](./API.md) - REST API 상세 명세
- [MCP 가이드](./mcp-server/README.md) - Claude Desktop 설정 방법
- [로드맵](./TASK.md) - 개발 진행 상황

## 라이센스

MIT

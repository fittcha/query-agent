# Query Agent

AI-powered query agent with multi-database and multi-LLM support

자연어로 데이터베이스를 조회하고 관리할 수 있는 웹 애플리케이션

## 주요 기능

- **자연어 → SQL 변환**: 자연어 질문을 SQL 쿼리로 자동 생성
- **스키마 캐싱**: DB 스키마를 캐시하여 빠른 응답, 변경 시 자동 갱신
- **SP 지원**: Stored Procedure 파악 및 호출 쿼리 생성
- **테이블 관계 인식**: FK 기반 JOIN 쿼리 자동 생성
- **대화 컨텍스트 유지**: 세션별 대화 히스토리 관리
- **안전한 실행**: 위험한 쿼리 자동 필터링
- **Multi-Database**: MSSQL, PostgreSQL, MySQL 지원 (예정)
- **Multi-LLM**: Claude, GPT, Gemini 선택 가능 (예정)

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

### 4. 접속

- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3001

## 프로젝트 구조

```
query-agent/
├── server/                  # Express 백엔드
│   ├── index.ts             # 서버 진입점
│   ├── routes/
│   │   ├── chat.ts          # AI 채팅 API
│   │   └── db.ts            # DB 조회 API
│   └── db/
│       ├── mssql.ts         # MSSQL 연결/쿼리 실행
│       └── schema-cache.ts  # 스키마 캐싱/변경 감지
├── src/                     # React 프론트엔드
│   ├── App.tsx              # 메인 채팅 UI
│   ├── main.tsx             # React 진입점
│   └── index.css            # Tailwind 스타일
├── docs/                    # 상세 문서
├── vite.config.ts           # Vite 설정
├── tailwind.config.js       # Tailwind 설정
└── .env.example             # 환경변수 예시
```

## 스키마 캐싱 동작 방식

```
1. 첫 요청 시 DB에서 스키마 전체 로드 (테이블, SP, View)
2. 메모리에 캐시 저장
3. 이후 요청은 캐시 사용 (DB 조회 없음)
4. 매 요청마다 checksum 비교로 변경 감지
5. 변경 감지 시 자동으로 캐시 갱신
```

## 문서

- [상세 문서](./docs/README.md) - 아키텍처, 백엔드, 프론트엔드 가이드
- [API 명세](./API.md) - REST API 상세 명세
- [로드맵](./TASK.md) - 개발 진행 상황

## 라이센스

MIT

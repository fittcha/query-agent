# Task: Query Agent 개발

## 목표

자연어로 DB를 조회/관리할 수 있는 웹 앱 개발

---

## Phase 1: MVP ✅ 완료

### 백엔드

- [x] 프로젝트 구조 생성
- [x] Express 서버 기본 구조
- [x] 채팅 API 라우트 (`POST /api/chat`)
- [x] MSSQL 연결 모듈 (`server/db/mssql.ts`)
  - [x] 연결 풀 설정
  - [x] `getSchema()` - 테이블/컬럼 정보 조회
  - [x] `executeQuery()` - 쿼리 실행
  - [x] `testConnection()` - 연결 테스트
- [x] DB API 라우트 (`/api/db/*`)
  - [x] `GET /schema` - 스키마 조회 (텍스트/JSON)
  - [x] `POST /query` - 쿼리 직접 실행
  - [x] `GET /health` - 연결 테스트
  - [x] `GET /tables` - 테이블 목록
  - [x] `GET /tables/:name` - 테이블 상세
  - [x] `GET /procedures` - SP 목록
  - [x] `GET /procedures/:name` - SP 상세
  - [x] `GET /relationships` - FK 관계
- [x] 스키마 캐싱 시스템 (`server/db/schema-cache.ts`)
  - [x] 테이블/컬럼/PK/FK 정보 캐싱
  - [x] Stored Procedure 정보 캐싱
  - [x] View 정보 캐싱
  - [x] Checksum 기반 변경 감지
  - [x] 자동 캐시 갱신
- [x] 대화 히스토리 관리 (세션별 메모리 저장)

### 프론트엔드

- [x] Vite + React + TypeScript 설정
- [x] TailwindCSS 스타일링
- [x] 4개 메뉴 화면 구현
  - [x] **쿼리**: 자연어 입력 (44%) + 응답 표시 (56%)
  - [x] **스키마**: 테이블/SP/뷰 목록 및 상세 정보
  - [x] **히스토리**: 실행 쿼리 목록, 성공/실패 표시, 재사용
  - [x] **설정**: DB 연결 상태, 현재 설정 정보
- [x] 좌측 사이드바 (10%) - 메뉴 네비게이션
- [x] 상단 바 - AI 모델/DB 선택
- [x] 결과 테이블 표시
- [x] 쿼리 실행 후 입력 유지
- [x] 초기화 버튼

### 인프라

- [x] `.gitignore` 설정
- [x] `.env.example` 설정
- [x] GitHub 레포 생성
- [x] README 작성
- [x] 상세 문서 작성 (`/docs`)
- [x] API 명세 작성 (`API.md`)

---

## Phase 2: Multi-LLM 지원 ✅ 완료

- [x] SDK 설치 (groq-sdk, @google/generative-ai)
- [x] LLM 프로바이더 추상화 (`server/llm/providers.ts`)
  - [x] Claude Opus 4.5 (Anthropic) - 유료
  - [x] Claude Sonnet 4 (Anthropic) - 유료
  - [x] Groq (Llama 3.3 70B) - 무료
  - [x] Gemini 2.5 Flash (Google) - 무료 티어
- [x] 프론트엔드 AI 모델 선택 연동
- [x] 동적 프로바이더 전환

---

## Phase 2.5: MCP 서버 지원 ✅ 완료

Claude Desktop 앱에서 API 키 없이 Max 플랜으로 DB 조회 가능

- [x] MCP SDK 설치 (@modelcontextprotocol/sdk)
- [x] MCP 서버 구현 (`mcp-server/index.ts`)
  - [x] `get_schema` - DB 스키마 조회
  - [x] `execute_query` - SQL 쿼리 실행
  - [x] `get_stored_procedures` - SP 목록 조회
  - [x] `execute_stored_procedure` - SP 실행
  - [x] `preview_table` - 테이블 미리보기
- [x] Claude Desktop 설정 예시 작성
- [x] MCP 문서 작성 (`mcp-server/README.md`)

---

## Phase 3: Multi-DB 지원

- [ ] PostgreSQL 연결 모듈
- [ ] MySQL 연결 모듈
- [ ] DB 어댑터 인터페이스 추상화
- [ ] DB 연결 관리 (여러 연결 저장/전환)

---

## Phase 4: 고급 기능

- [ ] SQL 하이라이팅
- [ ] 실행계획 분석 (`EXPLAIN`)
- [ ] 쿼리 성능 비교
- [ ] 인덱스 추천
- [ ] 인덱스 정보 조회 (`getIndexes()`)
- [ ] 대화 히스토리 영구 저장 (DB)
- [ ] 자주 쓰는 쿼리 저장

---

## Phase 5: 배포

- [ ] Docker 설정
- [ ] Vercel/Railway 배포
- [ ] 환경별 설정 분리

---

## 완료된 파일 목록

### 백엔드
| 파일 | 설명 |
|------|------|
| `server/index.ts` | 서버 진입점 |
| `server/routes/chat.ts` | AI 채팅 API (세션, 히스토리, 프로바이더 지원) |
| `server/routes/db.ts` | DB 조회 API (스키마 캐시, SP, 관계) |
| `server/db/mssql.ts` | MSSQL 연결/쿼리 실행 |
| `server/db/schema-cache.ts` | 스키마 캐싱 및 변경 감지 |
| `server/llm/providers.ts` | LLM 프로바이더 추상화 (Claude, Groq, Gemini) |

### MCP 서버
| 파일 | 설명 |
|------|------|
| `mcp-server/index.ts` | MCP 서버 (Claude Desktop 연동) |
| `mcp-server/README.md` | MCP 설치/사용 가이드 |
| `mcp-server/claude-desktop-config.example.json` | Claude Desktop 설정 예시 |

### 프론트엔드
| 파일 | 설명 |
|------|------|
| `src/main.tsx` | React 진입점 |
| `src/App.tsx` | 메인 앱 (4개 메뉴 화면, AI 모델 선택) |
| `src/index.css` | Tailwind 스타일 |

### 설정
| 파일 | 설명 |
|------|------|
| `vite.config.ts` | Vite 설정 (프록시 포함) |
| `tailwind.config.js` | Tailwind 설정 |
| `postcss.config.js` | PostCSS 설정 |
| `tsconfig.json` | TypeScript 설정 |
| `index.html` | HTML 템플릿 |

### 문서
| 파일 | 설명 |
|------|------|
| `README.md` | 프로젝트 소개 |
| `CLAUDE.md` | 개발 가이드 |
| `API.md` | API 명세 |
| `TASK.md` | 개발 로드맵 |
| `docs/README.md` | 문서 목차 |
| `docs/01-overview.md` | 프로젝트 개요 |
| `docs/02-architecture.md` | 시스템 아키텍처 |
| `docs/03-backend.md` | 백엔드 가이드 |
| `docs/04-frontend.md` | 프론트엔드 가이드 |
| `docs/05-setup.md` | 개발 환경 설정 |
| `docs/06-api-reference.md` | API 레퍼런스 |
| `docs/07-schema-cache.md` | 스키마 캐싱 시스템 |
| `docs/08-mcp-server.md` | MCP 서버 가이드 |

---

## API 엔드포인트 요약

### Chat API
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/chat` | AI 채팅 (자연어 → SQL) |
| GET | `/api/chat/table/:name` | 특정 테이블 정보 |
| GET | `/api/chat/sp/:name` | 특정 SP 정보 |
| GET | `/api/chat/providers` | 사용 가능한 AI 프로바이더 목록 |
| DELETE | `/api/chat/history/:sessionId` | 대화 히스토리 삭제 |

### DB API
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/db/schema` | 스키마 조회 |
| POST | `/api/db/schema/refresh` | 캐시 갱신 |
| GET | `/api/db/schema/check` | 변경 여부 확인 |
| GET | `/api/db/tables` | 테이블 목록 |
| GET | `/api/db/tables/:name` | 테이블 상세 |
| GET | `/api/db/procedures` | SP 목록 |
| GET | `/api/db/procedures/:name` | SP 상세 |
| GET | `/api/db/relationships` | FK 관계 |
| POST | `/api/db/query` | SQL 직접 실행 |
| GET | `/api/db/health` | 연결 테스트 |
| DELETE | `/api/db/cache` | 캐시 초기화 |

### MCP 도구
| 도구 | 설명 |
|------|------|
| `get_schema` | DB 스키마 조회 |
| `execute_query` | SQL 쿼리 실행 |
| `get_stored_procedures` | SP 목록 조회 |
| `execute_stored_procedure` | SP 실행 |
| `preview_table` | 테이블 미리보기 |

---

## 사용 방법

### 방법 1: 웹앱 (API 키 필요)

```bash
npm run dev
# http://localhost:5173 접속
```

### 방법 2: Claude Desktop MCP (API 키 불필요, Max 플랜)

1. Claude Desktop 설정 파일에 MCP 서버 추가
2. Claude Desktop 앱에서 자연어로 DB 조회

자세한 내용은 `mcp-server/README.md` 참조

---

## 지원 AI 모델

| 모델 | 프로바이더 | 비용 | 상태 |
|------|------------|------|------|
| Claude Opus 4.5 | Anthropic | 유료 | ✅ 사용 가능 |
| Claude Sonnet 4 | Anthropic | 유료 | ✅ 사용 가능 |
| Llama 3.3 70B | Groq | 무료 | ✅ 사용 가능 |
| Gemini 2.5 Flash | Google | 무료 티어 | ✅ 사용 가능 |

---

## 참고

- 웹앱 사용 시 API 키 필요 (`.env`에 설정)
- MCP 사용 시 API 키 불필요 (Claude Max 플랜 활용)
- MSSQL 연결 정보 필요
- 스키마 캐시는 서버 메모리에 저장 (재시작 시 초기화)

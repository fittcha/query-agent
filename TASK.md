# Task: Query Agent 개발

## 목표

자연어로 DB를 조회/관리할 수 있는 웹 앱 개발

---

## Phase 1: MVP (현재)

### 백엔드

- [x] 프로젝트 구조 생성
- [x] Express 서버 기본 구조
- [x] 채팅 API 라우트 (`POST /api/chat`)
- [x] MSSQL 연결 모듈 (`server/db/mssql.ts`)
  - [x] 연결 풀 설정
  - [x] `getSchema()` - 테이블/컬럼 정보 조회
  - [x] `executeQuery()` - 쿼리 실행
  - [x] `testConnection()` - 연결 테스트
  - [ ] `getIndexes()` - 인덱스 정보 조회
- [x] DB API 라우트 (`/api/db/*`)
  - [x] `GET /schema` - 스키마 조회
  - [x] `POST /query` - 쿼리 직접 실행
  - [x] `GET /health` - 연결 테스트
- [x] 스키마 캐싱 시스템 (`server/db/schema-cache.ts`)
  - [x] 테이블/컬럼/PK/FK 정보 캐싱
  - [x] Stored Procedure 정보 캐싱
  - [x] View 정보 캐싱
  - [x] Checksum 기반 변경 감지
  - [x] 자동 캐시 갱신
- [x] 대화 히스토리 관리 (세션별)

### 프론트엔드

- [x] Vite + React 설정
- [x] 기본 레이아웃
- [x] 채팅 UI 컴포넌트
  - [x] 메시지 입력
  - [x] 대화 히스토리
  - [ ] SQL 하이라이팅
- [x] 결과 테이블 표시
- [ ] DB/AI 셀렉트박스

### 인프라

- [x] `.gitignore` 설정
- [x] `.env.example` 설정
- [x] GitHub 레포 생성
- [x] README 작성
- [x] 상세 문서 작성 (`/docs`)

---

## Phase 2: Multi-DB 지원

- [ ] PostgreSQL 연결 모듈
- [ ] MySQL 연결 모듈
- [ ] DB 어댑터 인터페이스 추상화
- [ ] DB 연결 관리 (여러 연결 저장/전환)

---

## Phase 3: Multi-LLM 지원

- [ ] OpenAI GPT 연동
- [ ] Google Gemini 연동
- [ ] LLM 어댑터 인터페이스 추상화
- [ ] 모델별 프롬프트 최적화

---

## Phase 4: 고급 기능

- [ ] 실행계획 분석 (`EXPLAIN`)
- [ ] 쿼리 성능 비교
- [ ] 인덱스 추천
- [x] 대화 히스토리 저장 (세션별 메모리 저장)
- [ ] 대화 히스토리 영구 저장 (DB)
- [ ] 자주 쓰는 쿼리 저장

---

## Phase 5: 배포

- [ ] Docker 설정
- [ ] Vercel/Railway 배포
- [ ] 환경별 설정 분리

---

## 다음 할 일

1. 로컬 MSSQL 연결 테스트
2. SQL 하이라이팅 추가
3. DB/AI 셀렉트박스 UI
4. 대화 히스토리 영구 저장

---

## 완료된 파일 목록

### 백엔드
- `server/index.ts` - 서버 진입점
- `server/routes/chat.ts` - AI 채팅 API (세션, 히스토리 지원)
- `server/routes/db.ts` - DB 조회 API (스키마 캐시, SP, 관계)
- `server/db/mssql.ts` - MSSQL 연결/쿼리 실행
- `server/db/schema-cache.ts` - 스키마 캐싱 및 변경 감지

### 프론트엔드
- `src/main.tsx` - React 진입점
- `src/App.tsx` - 메인 채팅 UI
- `src/index.css` - Tailwind 스타일

### 설정
- `vite.config.ts` - Vite 설정
- `tailwind.config.js` - Tailwind 설정
- `postcss.config.js` - PostCSS 설정
- `index.html` - HTML 템플릿

### 문서
- `docs/README.md` - 문서 목차
- `docs/01-overview.md` - 프로젝트 개요
- `docs/02-architecture.md` - 시스템 아키텍처
- `docs/03-backend.md` - 백엔드 가이드
- `docs/04-frontend.md` - 프론트엔드 가이드
- `docs/05-setup.md` - 개발 환경 설정
- `docs/06-api-reference.md` - API 레퍼런스
- `docs/07-schema-cache.md` - 스키마 캐싱 시스템

---

## 새로 추가된 API 엔드포인트

### 스키마 캐싱 관련
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/db/schema?format=json` | JSON 형식 스키마 |
| POST | `/api/db/schema/refresh` | 캐시 강제 갱신 |
| GET | `/api/db/schema/check` | 변경 여부 확인 |
| GET | `/api/db/tables` | 테이블 목록 |
| GET | `/api/db/tables/:name` | 특정 테이블 상세 |
| GET | `/api/db/procedures` | SP 목록 |
| GET | `/api/db/procedures/:name` | 특정 SP 상세 |
| GET | `/api/db/relationships` | 테이블 관계 |
| DELETE | `/api/db/cache` | 캐시 초기화 |

### 대화 관련
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/chat` | AI 채팅 (sessionId 추가) |
| DELETE | `/api/chat/history/:sessionId` | 대화 히스토리 삭제 |

---

## 참고

- Claude API 키 필요 (`.env`에 설정)
- MSSQL 로컬 개발 DB 사용 (운영 DB는 망분리 환경)
- 스키마 캐시는 서버 메모리에 저장 (재시작 시 초기화)

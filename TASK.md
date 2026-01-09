# Task: Query Agent 개발

## 목표

자연어로 DB를 조회/관리할 수 있는 웹 앱 개발

---

## Phase 1: MVP (현재)

### 백엔드

- [x] 프로젝트 구조 생성
- [x] Express 서버 기본 구조
- [x] 채팅 API 라우트 (`POST /api/chat`)
- [ ] MSSQL 연결 모듈 (`server/db/mssql.ts`)
  - [ ] 연결 풀 설정
  - [ ] `getSchema()` - 테이블/컬럼 정보 조회
  - [ ] `executeQuery()` - 쿼리 실행
  - [ ] `getIndexes()` - 인덱스 정보 조회
- [ ] DB API 라우트 (`/api/db/*`)
  - [ ] `GET /schema` - 스키마 조회
  - [ ] `POST /query` - 쿼리 직접 실행
  - [ ] `GET /test` - 연결 테스트

### 프론트엔드

- [ ] Vite + React 설정
- [ ] 기본 레이아웃
- [ ] 채팅 UI 컴포넌트
  - [ ] 메시지 입력
  - [ ] 대화 히스토리
  - [ ] SQL 하이라이팅
- [ ] 결과 테이블 표시
- [ ] DB/AI 셀렉트박스

### 인프라

- [x] `.gitignore` 설정
- [x] `.env.example` 설정
- [x] GitHub 레포 생성
- [ ] README 작성

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
- [ ] 대화 히스토리 저장
- [ ] 자주 쓰는 쿼리 저장

---

## Phase 5: 배포

- [ ] Docker 설정
- [ ] Vercel/Railway 배포
- [ ] 환경별 설정 분리

---

## 다음 할 일

1. `server/db/mssql.ts` 완성
2. 로컬 MSSQL 연결 테스트
3. React 프론트엔드 기본 UI

---

## 참고

- Claude API 키 필요 (`.env`에 설정)
- MSSQL 로컬 개발 DB 사용 (운영 DB는 망분리 환경)

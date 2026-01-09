# Query Agent 문서

이 문서는 Query Agent 프로젝트에 대한 상세한 설명을 제공합니다.

## 목차

1. [프로젝트 개요](./01-overview.md) - 프로젝트 소개 및 목표
2. [아키텍처](./02-architecture.md) - 시스템 구조 및 데이터 흐름
3. [백엔드 가이드](./03-backend.md) - Express 서버, DB 연결, API
4. [프론트엔드 가이드](./04-frontend.md) - React UI 컴포넌트
5. [개발 환경 설정](./05-setup.md) - 로컬 개발 환경 구축
6. [API 레퍼런스](./06-api-reference.md) - API 상세 명세
7. [스키마 캐싱](./07-schema-cache.md) - 스키마 캐싱 및 변경 감지

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일 편집하여 실제 값 입력

# 3. 개발 서버 실행
npm run dev

# 4. 브라우저에서 http://localhost:5173 접속
```

## 핵심 기능

| 기능 | 설명 | 문서 |
|------|------|------|
| 자연어 쿼리 | 자연어를 SQL로 변환 | [개요](./01-overview.md) |
| 스키마 캐싱 | DB 스키마 캐시 및 변경 감지 | [스키마 캐싱](./07-schema-cache.md) |
| SP 지원 | Stored Procedure 파악 및 호출 | [스키마 캐싱](./07-schema-cache.md) |
| 테이블 관계 | FK 기반 관계 분석 | [스키마 캐싱](./07-schema-cache.md) |
| 대화 컨텍스트 | 세션별 히스토리 유지 | [백엔드](./03-backend.md) |

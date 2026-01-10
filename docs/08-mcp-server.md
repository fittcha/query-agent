# MCP 서버 가이드

Query Agent를 Claude Desktop 앱에서 API 키 없이 사용하는 방법

## 개요

MCP (Model Context Protocol)는 Claude Desktop 앱이 외부 도구와 통신할 수 있게 해주는 프로토콜입니다. Query Agent MCP 서버를 설정하면 Claude Max 플랜의 사용량을 활용하여 **별도 API 키 없이** 자연어로 DB를 조회할 수 있습니다.

## 웹앱 vs MCP 비교

| 구분 | 웹앱 | MCP |
|------|------|-----|
| 사용 환경 | 브라우저 | Claude Desktop 앱 |
| API 키 | 필요 (Anthropic/Groq/Google) | 불필요 |
| 비용 | API 사용량만큼 과금 | Claude Max 플랜 포함 |
| 인터페이스 | 전용 웹 UI | Claude 대화창 |
| 여러 모델 선택 | 가능 | Claude만 사용 |

## 제공 도구

| 도구 | 설명 | 예시 |
|------|------|------|
| `get_schema` | DB 스키마 조회 | "테이블 구조 보여줘" |
| `execute_query` | SQL 쿼리 실행 | "최근 가입한 사용자 10명 조회해줘" |
| `get_stored_procedures` | SP 목록 조회 | "저장 프로시저 목록 보여줘" |
| `execute_stored_procedure` | SP 실행 | "GetUserOrders 프로시저 실행해줘" |
| `preview_table` | 테이블 미리보기 | "Users 테이블 데이터 보여줘" |

## 설치 방법

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone https://github.com/your-repo/query-agent.git
cd query-agent
npm install
```

### 2. Claude Desktop 설정 파일 열기

**macOS:**
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
code ~/.config/Claude/claude_desktop_config.json
```

### 3. MCP 서버 설정 추가

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
        "MSSQL_DATABASE": "your-database",
        "MSSQL_ENCRYPT": "false"
      }
    }
  }
}
```

> `/절대경로/query-agent`를 실제 프로젝트 경로로 변경하세요.

### 4. Claude Desktop 재시작

설정 후 Claude Desktop 앱을 완전히 종료했다가 다시 시작합니다.

## 사용 예시

Claude Desktop에서 대화:

```
사용자: Users 테이블 구조 보여줘
Claude: [get_schema 도구 호출]

사용자: 최근 가입한 사용자 10명 조회해줘
Claude: [execute_query 도구로 SQL 생성 및 실행]
        SELECT TOP 10 * FROM Users ORDER BY CreatedAt DESC

사용자: dbo.GetUserOrders 프로시저 실행해줘, userId는 123으로
Claude: [execute_stored_procedure 도구 호출]
        EXEC dbo.GetUserOrders @userId = 123
```

## 보안

MCP 서버는 다음 보안 조치를 적용합니다:

### 차단되는 명령어

- `DROP` - 테이블/DB 삭제
- `TRUNCATE` - 테이블 데이터 삭제
- `DELETE` - 조건 없는 삭제
- `ALTER` - 스키마 변경
- `CREATE` - 객체 생성

### 차단되는 시스템 프로시저

- `xp_*` - 확장 프로시저
- `sp_addlogin` - 로그인 추가
- `sp_droplogin` - 로그인 삭제
- `sp_password` - 비밀번호 변경
- `master.*` - master DB 프로시저

### 결과 제한

- 쿼리 결과는 최대 **100행**으로 제한
- 긴 문자열은 50자로 잘림 (미리보기)

## 문제 해결

### MCP 서버가 인식되지 않음

1. Claude Desktop 완전 종료 후 재시작
2. 설정 파일 JSON 문법 확인
3. 프로젝트 경로가 절대 경로인지 확인

### DB 연결 실패

1. 환경변수 확인 (MSSQL_HOST, MSSQL_USER 등)
2. MSSQL 서버가 실행 중인지 확인
3. 방화벽에서 1433 포트 허용 여부 확인

### 권한 오류

1. MSSQL 사용자 권한 확인
2. 테이블/프로시저 접근 권한 확인

## 로컬 테스트

MCP 서버가 정상 동작하는지 테스트:

```bash
# 프로젝트 루트에서
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run mcp
```

정상 동작 시 도구 목록이 JSON으로 출력됩니다.

## 아키텍처

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────┐
│  Claude Desktop │ ←──→ │  MCP Server      │ ←──→ │  MSSQL   │
│  (사용자 대화)   │ stdio│  (query-agent)   │ TCP  │  Database│
└─────────────────┘      └──────────────────┘      └──────────┘
        │                         │
        │                         ├── get_schema
        │                         ├── execute_query
        │                         ├── get_stored_procedures
        │                         ├── execute_stored_procedure
        │                         └── preview_table
        │
     Claude Max 플랜
     (API 키 불필요)
```

## 참고 자료

- [MCP 공식 문서](https://modelcontextprotocol.io/)
- [Claude Desktop MCP 설정](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
- [Query Agent README](../README.md)
- [Query Agent MCP README](../mcp-server/README.md)

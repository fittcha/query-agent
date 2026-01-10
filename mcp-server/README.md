# Query Agent MCP Server

Claude Desktop 앱에서 자연어로 DB를 조회할 수 있는 MCP 서버입니다.

## 사용 가능한 도구

| 도구 | 설명 |
|------|------|
| `get_schema` | DB 스키마 (테이블, 컬럼, 관계) 조회 |
| `execute_query` | SQL SELECT 쿼리 실행 |
| `get_stored_procedures` | 저장 프로시저 목록 조회 |
| `execute_stored_procedure` | 저장 프로시저 실행 |
| `preview_table` | 테이블 데이터 미리보기 |

## 설치 방법

### 1. Claude Desktop 설정 파일 열기

**macOS:**
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

### 2. MCP 서버 설정 추가

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

### 3. Claude Desktop 재시작

설정 후 Claude Desktop 앱을 완전히 종료했다가 다시 시작합니다.

## 사용 예시

Claude Desktop에서 대화:

```
"Users 테이블 구조 보여줘"
→ get_schema 도구 호출

"최근 가입한 사용자 10명 조회해줘"
→ execute_query 도구로 SQL 생성 및 실행

"dbo.GetUserOrders 프로시저 실행해줘, userId는 123으로"
→ execute_stored_procedure 도구 호출
```

## 보안

- `DROP`, `TRUNCATE`, `DELETE`, `ALTER`, `CREATE` 명령 차단
- 시스템 저장 프로시저 (`xp_`, `sp_addlogin` 등) 차단
- 결과는 최대 100행으로 제한

## 로컬 테스트

```bash
# 프로젝트 루트에서
npm run mcp
```

stdin/stdout으로 통신하므로 직접 테스트는 어렵습니다.
Claude Desktop과 연결하여 테스트하세요.

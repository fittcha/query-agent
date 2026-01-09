import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  getSchemaForAI,
  loadSchemaCache,
  getTableInfo,
  getSPInfo,
  getTableRelationships,
  hasSchemaChanged,
} from "../db/schema-cache.js";
import { executeQuery } from "../db/mssql.js";

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// AI 제공자 설정 (나중에 확장)
type AIProvider = "claude" | "gpt" | "gemini";

const SYSTEM_PROMPT = `You are a database assistant. You help users query and understand databases.

You have access to the database schema including:
- Tables with columns, types, primary keys, and foreign key relationships
- Stored Procedures with parameters
- Views

When the user asks about data, you should:
1. Understand their intent
2. Generate appropriate SQL queries or SP calls
3. Explain what the query/procedure does

When generating SQL:
- Always use safe practices
- For SELECT queries, add TOP 100 by default unless user specifies
- Never generate DROP, TRUNCATE, or other destructive commands unless explicitly asked
- Use proper JOIN conditions based on foreign key relationships
- When calling stored procedures, use: EXEC schema.procedure_name @param1 = value1, @param2 = value2
- Format SQL nicely for readability

Respond in JSON format:
{
  "message": "Your explanation to the user (in Korean)",
  "sql": "SELECT query or EXEC statement if needed, or null",
  "action": "query" | "execute" | "explain" | "none",
  "tablesUsed": ["table1", "table2"] // tables referenced in query (optional)
}

Current database schema will be provided in the conversation.`;

// 대화 히스토리 저장 (세션별로 관리해야 하지만, 일단 단순 구현)
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const conversations = new Map<string, ConversationMessage[]>();

router.post("/", async (req, res) => {
  try {
    const {
      message,
      provider = "claude",
      dbType = "mssql",
      sessionId = "default",
    } = req.body;

    // 스키마 변경 확인 및 캐시 로드
    const schemaChanged = await hasSchemaChanged();
    if (schemaChanged) {
      console.log("[Chat] Schema changed, refreshing cache...");
      await loadSchemaCache(true);
    }

    // 캐시된 스키마 정보 가져오기
    const schema = await getSchemaForAI({
      includeTables: true,
      includeSPs: true,
      includeViews: true,
    });

    // 테이블 관계 정보도 포함
    const relationships = await getTableRelationships();

    // 대화 히스토리 가져오기 (없으면 생성)
    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, []);
    }
    const history = conversations.get(sessionId)!;

    // 첫 메시지에는 스키마 정보 포함
    const isFirstMessage = history.length === 0;
    const userContent = isFirstMessage
      ? `Database Schema:\n${schema}\n\nTable Relationships:\n${relationships}\n\nUser Question: ${message}`
      : `User Question: ${message}`;

    // 히스토리에 사용자 메시지 추가
    history.push({ role: "user", content: userContent });

    // Claude API 호출 (히스토리 포함)
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // 히스토리에 AI 응답 추가
    history.push({ role: "assistant", content: content.text });

    // 히스토리가 너무 길면 오래된 것 제거 (최근 20개만 유지)
    if (history.length > 20) {
      // 첫 메시지(스키마 포함)는 유지하고 중간 것들 제거
      const firstMessage = history[0];
      const recentMessages = history.slice(-19);
      conversations.set(sessionId, [firstMessage, ...recentMessages]);
    }

    // JSON 파싱
    let parsed;
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { message: content.text, sql: null, action: "none" };
    } catch {
      parsed = { message: content.text, sql: null, action: "none" };
    }

    // SQL 실행이 필요한 경우
    let queryResult = null;
    if (parsed.sql && (parsed.action === "query" || parsed.action === "execute")) {
      try {
        queryResult = await executeQuery(parsed.sql);
      } catch (dbError) {
        queryResult = {
          error: dbError instanceof Error ? dbError.message : "Query failed",
        };
      }
    }

    res.json({
      message: parsed.message,
      sql: parsed.sql,
      action: parsed.action,
      result: queryResult,
      provider,
      sessionId,
      schemaRefreshed: schemaChanged,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// 특정 테이블 정보 조회 API
router.get("/table/:name", async (req, res) => {
  try {
    const table = await getTableInfo(req.params.name);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    res.json(table);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// 특정 SP 정보 조회 API
router.get("/sp/:name", async (req, res) => {
  try {
    const sp = await getSPInfo(req.params.name);
    if (!sp) {
      return res.status(404).json({ error: "Stored procedure not found" });
    }
    res.json(sp);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// 대화 히스토리 초기화
router.delete("/history/:sessionId", (req, res) => {
  conversations.delete(req.params.sessionId);
  res.json({ success: true, message: "Conversation history cleared" });
});

export { router as chatRouter };

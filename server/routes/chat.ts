import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { executeQuery, getSchema } from "../db/mssql.js";

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// AI 제공자 설정 (나중에 확장)
type AIProvider = "claude" | "gpt" | "gemini";

const SYSTEM_PROMPT = `You are a database assistant. You help users query and understand databases.

When the user asks about data, you should:
1. Understand their intent
2. Generate appropriate SQL queries
3. Explain what the query does

When generating SQL:
- Always use safe practices
- For SELECT queries, add TOP 100 by default unless user specifies
- Never generate DROP, TRUNCATE, or other destructive commands unless explicitly asked
- Format SQL nicely for readability

Respond in JSON format:
{
  "message": "Your explanation to the user",
  "sql": "SELECT query if needed, or null",
  "action": "query" | "execute" | "explain" | "none"
}

Current database schema will be provided in the conversation.`;

router.post("/", async (req, res) => {
  try {
    const { message, provider = "claude", dbType = "mssql" } = req.body;

    // 스키마 정보 가져오기
    const schema = await getSchema();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Database Schema:\n${schema}\n\nUser Question: ${message}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // JSON 파싱
    let parsed;
    try {
      // JSON 블록 추출
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: content.text, sql: null, action: "none" };
    } catch {
      parsed = { message: content.text, sql: null, action: "none" };
    }

    // SQL 실행이 필요한 경우
    let queryResult = null;
    if (parsed.sql && (parsed.action === "query" || parsed.action === "execute")) {
      try {
        queryResult = await executeQuery(parsed.sql);
      } catch (dbError) {
        queryResult = { error: dbError instanceof Error ? dbError.message : "Query failed" };
      }
    }

    res.json({
      message: parsed.message,
      sql: parsed.sql,
      action: parsed.action,
      result: queryResult,
      provider,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export { router as chatRouter };

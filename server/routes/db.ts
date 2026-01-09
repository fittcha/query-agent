import { Router } from "express";
import { executeQuery, testConnection } from "../db/mssql.js";
import {
  loadSchemaCache,
  getSchemaForAI,
  getCache,
  clearCache,
  hasSchemaChanged,
  getTableInfo,
  getSPInfo,
  getTableRelationships,
} from "../db/schema-cache.js";

const router = Router();

// DB 연결 테스트
router.get("/health", async (_, res) => {
  try {
    const connected = await testConnection();
    res.json({
      connected,
      message: connected ? "Database connected" : "Connection failed",
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// 스키마 조회 (캐시 사용)
router.get("/schema", async (req, res) => {
  try {
    const format = req.query.format as string;
    const refresh = req.query.refresh === "true";

    if (refresh) {
      await loadSchemaCache(true);
    }

    if (format === "json") {
      const cache = getCache();
      if (!cache) {
        await loadSchemaCache();
      }
      const c = getCache()!;
      res.json({
        tables: Object.fromEntries(c.tables),
        storedProcedures: Object.fromEntries(c.storedProcedures),
        views: Object.fromEntries(c.views),
        lastUpdated: c.lastUpdated,
      });
    } else {
      const schema = await getSchemaForAI();
      res.json({ schema });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get schema",
    });
  }
});

// 스키마 새로고침 (강제)
router.post("/schema/refresh", async (_, res) => {
  try {
    const startTime = Date.now();
    const cache = await loadSchemaCache(true);

    res.json({
      success: true,
      message: "Schema cache refreshed",
      stats: {
        tables: cache.tables.size,
        storedProcedures: cache.storedProcedures.size,
        views: cache.views.size,
        duration: Date.now() - startTime,
      },
      lastUpdated: cache.lastUpdated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh schema",
    });
  }
});

// 스키마 변경 확인
router.get("/schema/check", async (_, res) => {
  try {
    const changed = await hasSchemaChanged();
    const cache = getCache();

    res.json({
      changed,
      lastUpdated: cache?.lastUpdated || null,
      cached: !!cache,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to check schema",
    });
  }
});

// 테이블 목록
router.get("/tables", async (_, res) => {
  try {
    const cache = await loadSchemaCache();
    const tables = [...cache.tables.values()].map((t) => ({
      schema: t.schema,
      name: t.name,
      fullName: t.fullName,
      columnCount: t.columns.length,
    }));

    res.json({ tables });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get tables",
    });
  }
});

// 특정 테이블 정보
router.get("/tables/:name", async (req, res) => {
  try {
    const table = await getTableInfo(req.params.name);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    res.json(table);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get table info",
    });
  }
});

// SP 목록
router.get("/procedures", async (_, res) => {
  try {
    const cache = await loadSchemaCache();
    const procedures = [...cache.storedProcedures.values()].map((sp) => ({
      schema: sp.schema,
      name: sp.name,
      fullName: sp.fullName,
      parameterCount: sp.parameters.length,
      description: sp.description,
    }));

    res.json({ procedures });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get procedures",
    });
  }
});

// 특정 SP 정보
router.get("/procedures/:name", async (req, res) => {
  try {
    const sp = await getSPInfo(req.params.name);
    if (!sp) {
      return res.status(404).json({ error: "Stored procedure not found" });
    }
    res.json(sp);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get SP info",
    });
  }
});

// 테이블 관계
router.get("/relationships", async (_, res) => {
  try {
    const relationships = await getTableRelationships();
    res.json({ relationships });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get relationships",
    });
  }
});

// 쿼리 실행
router.post("/query", async (req, res) => {
  try {
    const { sql } = req.body;

    if (!sql || typeof sql !== "string") {
      return res.status(400).json({ error: "SQL query is required" });
    }

    const result = await executeQuery(sql);
    res.json({
      success: true,
      data: result.recordset,
      rowsAffected: result.rowsAffected,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Query execution failed",
    });
  }
});

// 캐시 초기화
router.delete("/cache", (_, res) => {
  clearCache();
  res.json({ success: true, message: "Schema cache cleared" });
});

export { router as dbRouter };

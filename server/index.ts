import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat.js";
import { dbRouter } from "./routes/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/chat", chatRouter);
app.use("/api/db", dbRouter);

// Health check
app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

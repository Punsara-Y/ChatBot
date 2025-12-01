// backend/server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import Groq from "groq-sdk/index.mjs";
import session from "express-session";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
app.use(cors({ origin: "https://novaai0.netlify.app/", credentials: true }));
app.use(bodyParser.json());

// ------------------- AUTH0 SESSION CONFIG --------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// ------------------- VERIFY AUTH0 TOKEN ----------------------
function verifyUser(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.decode(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ------------------- GROQ CLIENT ------------------------------
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ---------------- CLEAN MARKDOWN ------------------------------
function sanitizeMarkdown(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, "$1"); 
  text = text.replace(/\*(.*?)\*/g, "$1"); 
  text = text.replace(/^#+\s+/gm, ""); 
  text = text.replace(/^---$/gm, ""); 
  return text;
}

// ----------------- CHAT ENDPOINT ------------------------------
app.post("/bot", verifyUser, async (req, res) => {
  try {
    const { message } = req.body;

    const messages = [
      {
        role: "system",
        content: `
You are a clean technical assistant. Use paragraphs and bullet points.
Include code only inside triple backticks.
      `,
      },
      { role: "user", content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.6,
      max_completion_tokens: 1024,
    });

    let reply = completion.choices[0].message.content;
    reply = sanitizeMarkdown(reply);

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "Server error." });
  }
});

// ----------------- LOGOUT ENDPOINT ------------------------------
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

const PORT = 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

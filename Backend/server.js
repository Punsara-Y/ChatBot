import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import Groq from "groq-sdk/index.mjs";
import { expressjwt as jwt } from "express-jwt";
import jwksRsa from "jwks-rsa";

dotenv.config();

const app = express();

// 1️⃣ CORS for deployed frontend
app.use(cors({
  origin: "https://novaai0.netlify.app", // Netlify frontend URL
  credentials: true
}));

app.use(bodyParser.json());

// ------------------- VERIFY AUTH0 TOKEN ----------------------
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE, // Your API Identifier in Auth0
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"]
});

// ------------------- GROQ CLIENT ------------------------------
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ---------------- CLEAN MARKDOWN ------------------------------
function sanitizeMarkdown(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, "$1"); 
  text = text.replace(/\*(.*?)\*/g, "$1"); 
  text = text.replace(/^#+\s+/gm, ""); 
  text = text.replace(/^---$/gm, ""); 
  return text;
}

// ----------------- CHAT ENDPOINT ------------------------------
app.post("/bot", checkJwt, async (req, res) => {
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

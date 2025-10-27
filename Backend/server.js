// backend/server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import Groq from "groq-sdk/index.mjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.OPENAI_API_KEY, // make sure this key is valid
});

// Endpoint for chat
app.post("/bot", async (req, res) => {
  try {
    const userMessage = req.body.message; // get message from frontend

    // Prepare messages with professional system prompt
    const messages = [
      {
        role: "system",
        content: `
You are a professional technical writer. 
Explain concepts clearly, concisely, and in a readable style. 
Avoid Markdown syntax like ##, **, --- or tables. 
Use paragraphs, bullet points (•), numbered lists (1., 2., 3.), and code blocks only when necessary. 
Keep it professional and easy to read for developers.
        `,
      },
      { role: "user", content: userMessage },
    ];

    // Request completion from Groq GPT OSS 20B (or another instruct model)
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages, // <-- pass messages here
      temperature: 0.6,
      max_completion_tokens: 1024, // reduce if needed
      top_p: 1,
      stream: false, // we are not streaming
    });

    const reply = completion.choices[0].message.content;

    // Optional: Clean any residual Markdown if you want purely readable text
    const cleanReply = reply.replace(/[#*_`>-]/g, "");

    res.json({ reply: cleanReply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "Sorry, I couldn’t process that right now." });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

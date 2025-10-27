import { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import "./App.css";

export default function Chatbot() {
  // Load messages from localStorage if available
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("chatMessages");
    return saved ? JSON.parse(saved) : [];
  });

  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessages = [...messages, { from: "user", text: userInput }];
    setMessages(newMessages);
    setUserInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/bot", {
        message: userInput,
      });

      const botMessage = { from: "bot", text: res.data.reply };
      setMessages([...newMessages, botMessage]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { from: "bot", text: "⚠️ Error connecting to server." },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="chat-container">
      <h2>🤖 Nova - AI Chatbot</h2>
      <div className="chat-box">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.from === "user" ? "user-msg" : "bot-msg"}
          >
            {msg.from === "bot" ? (
              <ReactMarkdown
                children={msg.text}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              />
            ) : (
              msg.text
            )}
          </div>
        ))}
        {loading && <div className="bot-msg typing">Nova is typing...</div>}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

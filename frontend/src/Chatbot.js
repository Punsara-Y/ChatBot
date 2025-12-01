import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import "./App.css";

export default function Chatbot() {
  const { 
    loginWithRedirect, 
    logout, 
    user, 
    isAuthenticated, 
    isLoading, 
    getAccessTokenSilently 
  } = useAuth0();

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Load chat for logged in user
  useEffect(() => {
    if (isAuthenticated && user) {
      const saved = localStorage.getItem(`chat_${user.email}`);
      setMessages(saved ? JSON.parse(saved) : []);
    }
  }, [isAuthenticated, user]);

  // Save chat to localStorage per-user
  useEffect(() => {
    if (isAuthenticated && user) {
      localStorage.setItem(`chat_${user.email}`, JSON.stringify(messages));
    }
  }, [messages, isAuthenticated, user]);

  // Auto-login redirect after 2FA or first visit
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  // Handle sending messages
  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessages = [...messages, { from: "user", text: userInput }];
    setMessages(newMessages);
    setUserInput("");
    setLoading(true);

    try {
      const token = await getAccessTokenSilently();

      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/bot`,
        { message: userInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const botMessage = { from: "bot", text: res.data.reply };
      setMessages([...newMessages, botMessage]);
    } catch {
      setMessages([
        ...newMessages,
        { from: "bot", text: "⚠️ Server error." },
      ]);
    }

    setLoading(false);
  };

  // Handle code copy
  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Show loading while Auth0 initializes or redirecting
  if (isLoading || !isAuthenticated) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div className="chat-container">
      <h2>🤖 Nova - AI Chatbot</h2>

      <div className="top-bar">
        <strong>{user.email}</strong>

        <button
          className="logout-btn"
          onClick={() => {
            localStorage.removeItem(`chat_${user.email}`);
            logout({ logoutParams: { returnTo: window.location.origin } });
          }}
        >
          Logout
        </button>
      </div>

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
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const codeText = String(children).replace(/\n$/, "");

                    return !inline ? (
                      <div className="code-container">
                        <button
                          className="copy-btn"
                          onClick={() => handleCopy(codeText, i)}
                        >
                          {copiedIndex === i ? "Copied!" : "Copy"}
                        </button>

                        <pre className="code-block">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    ) : (
                      <code className="inline-code" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
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

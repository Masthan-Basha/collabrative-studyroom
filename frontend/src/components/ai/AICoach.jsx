import { useState, useRef, useEffect } from "react";
import { askCoach } from "../../api/index";
import { GraduationCap, MessageSquare, BookOpen, Target, FileText, Layers, Send, Zap, User, AlertCircle } from "lucide-react";

const MODES = [
  { id: "chat",       label: "Chat",      Icon: MessageSquare },
  { id: "explain",    label: "Explain",   Icon: BookOpen      },
  { id: "quiz",       label: "Quiz",      Icon: Target        },
  { id: "summarize",  label: "Summarize", Icon: FileText      },
  { id: "flashcards", label: "Cards",     Icon: Layers        },
];

const MODE_PREFIXES = {
  explain:    "Explain this concept simply: ",
  quiz:       "Quiz me on: ",
  summarize:  "Summarize key points about: ",
  flashcards: "Create 5 flashcard Q&A pairs about: ",
};

const QUICK_PROMPTS = [
  "Explain with a real-world example",
  "What are the key things to remember?",
  "Give me a practice question",
  "Summarize in 3 bullet points",
  "What common mistakes do students make?",
];

export default function AICoach({ roomId, subject }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: `Hello! I'm your AI Study Coach.\n\nI'm here to help you master **${subject || "your subject"}**.\n\nAsk me anything — I can explain concepts, quiz you, generate flashcard Q&A pairs, or summarize topics.`,
  }]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("chat");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const raw = text || input.trim();
    if (!raw || loading) return;
    const prefix = MODE_PREFIXES[mode] || "";
    const content = prefix + raw;
    setMessages((prev) => [...prev, { role: "user", content: raw }]);
    setInput("");
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const data = await askCoach({
        roomId,
        message: content,
        history: history.slice(-10),
        subject: subject || "general",
        mode: mode || "chat",
      });
      const reply = data?.reply || data?.response || data?.message || "I'm having trouble responding right now.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: e?.response?.data?.detail || e?.message || "Unable to reach the Study Coach right now. Please try again.",
      }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d0d14" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", background: "#13131f", borderBottom: "1px solid #222238", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#7c6af7,#5b4bd4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <GraduationCap style={{ width: 20, height: 20, color: "#fff" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>AI Study Coach</div>
          <div style={{ color: "#6b6b8a", fontSize: 12 }}>Powered by Claude · {subject || "General"}</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
      </div>

      {/* Mode selector */}
      <div style={{ display: "flex", gap: 6, padding: "10px 14px", background: "#0f0f1a", borderBottom: "1px solid #222238", overflowX: "auto" }}>
        {MODES.map((m) => {
          const Icon = m.Icon;
          return (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", fontWeight: 500, background: mode === m.id ? "#7c6af7" : "#1e1e30", color: mode === m.id ? "#fff" : "#6b6b8a", transition: "all 0.2s" }}>
              <Icon style={{ width: 12, height: 12 }} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14, gap: 10 }}>
              {!isUser && (
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7c6af7,#5b4bd4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <GraduationCap style={{ width: 16, height: 16, color: "#fff" }} />
                </div>
              )}
              <div style={{ maxWidth: "80%", padding: "10px 15px", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isUser ? "linear-gradient(135deg,#7c6af7,#5b4bd4)" : "#1e1e30", color: "#e2e8f0", fontSize: 14, lineHeight: 1.65, border: isUser ? "none" : "1px solid #2a2a44", whiteSpace: "pre-wrap" }}>
                {msg.content}
              </div>
              {isUser && (
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#252540", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <User style={{ width: 16, height: 16, color: "#6b6b8a" }} />
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7c6af7,#5b4bd4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap style={{ width: 16, height: 16, color: "#fff" }} />
            </div>
            <div style={{ display: "flex", gap: 4, padding: "10px 15px", background: "#1e1e30", borderRadius: "16px 16px 16px 4px", border: "1px solid #2a2a44" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c6af7", animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid #222238", display: "flex", gap: 6, overflowX: "auto", background: "#0f0f1a" }}>
        {QUICK_PROMPTS.map((p) => (
          <button key={p} onClick={() => sendMessage(p)}
            style={{ padding: "5px 11px", borderRadius: 10, border: "1px solid #2a2a44", background: "transparent", color: "#6b6b8a", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c6af7"; e.currentTarget.style.color = "#e2e8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a44"; e.currentTarget.style.color = "#6b6b8a"; }}>
            {p}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ padding: "12px 14px", background: "#13131f", borderTop: "1px solid #222238", display: "flex", gap: 10 }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask your study coach... (Shift+Enter for new line)"
          rows={2}
          style={{ flex: 1, background: "#0d0d14", border: "1px solid #2a2a44", borderRadius: 12, color: "#e2e8f0", padding: "10px 14px", fontSize: 14, resize: "none", outline: "none", lineHeight: 1.5, fontFamily: "inherit", transition: "border-color 0.2s" }}
          onFocus={e => { e.target.style.borderColor = "#7c6af7"; }}
          onBlur={e => { e.target.style.borderColor = "#2a2a44"; }} />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          style={{ width: 46, height: 46, borderRadius: 12, border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", background: loading || !input.trim() ? "#1e1e30" : "linear-gradient(135deg,#7c6af7,#5b4bd4)", color: "#fff", alignSelf: "flex-end", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
          <Send style={{ width: 17, height: 17 }} />
        </button>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-6px);opacity:1} }`}</style>
    </div>
  );
}

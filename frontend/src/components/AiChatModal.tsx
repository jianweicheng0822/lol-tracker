/**
 * @file AiChatModal.tsx
 * @description ChatGPT-style conversation modal for AI-powered match analysis. Sends structured
 *   match data to the backend which constructs the LLM prompt and proxies to OpenAI. Tokens
 *   stream back via SSE for real-time rendering. The API key never touches the browser.
 * @module frontend.components
 */
import { useState, useRef, useEffect } from "react";
import type { MatchSummary } from "../types";
import { analyzeMatchStream } from "../api";
import type { AiMatchData, AiChatMessage } from "../api";

type Props = {
  match: MatchSummary;
  onClose: () => void;
};

/**
 * Convert a MatchSummary into the structured data shape the backend expects for AI analysis.
 *
 * @param m - The match summary to transform.
 * @returns Structured match data suitable for the AI analysis endpoint.
 */
function buildMatchData(m: MatchSummary): AiMatchData {
  const isArena = m.queueId === 1700;
  return {
    champion: m.championName,
    role: "",
    rank: "",
    kills: m.kills,
    deaths: m.deaths,
    assists: m.assists,
    cs: m.totalMinionsKilled + m.neutralMinionsKilled,
    gold: m.goldEarned,
    damage: m.totalDamageDealtToChampions,
    visionScore: 0,
    gameDurationSec: m.gameDurationSec,
    win: isArena ? m.placement >= 1 && m.placement <= 4 : m.win,
    items: m.items.filter((id) => id > 0).map(String),
    teamComp: m.allies.map((a) => a.championName),
    enemyComp: m.enemies.map((e) => e.championName),
  };
}

type Message = { role: "user" | "assistant"; content: string };

/**
 * Render a full-screen modal with a chat interface for AI match analysis.
 * Maintain conversation history in local state for multi-turn follow-up questions.
 * State resets when the modal is closed.
 *
 * @param props - The match to analyze and a callback to close the modal.
 * @returns The AI chat modal overlay element.
 */
export default function AiChatModal({ match, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isArena = match.queueId === 1700;
  const isWin = isArena ? match.placement >= 1 && match.placement <= 4 : match.win;
  const kda = match.deaths === 0
    ? "Perfect"
    : ((match.kills + match.assists) / match.deaths).toFixed(1);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    const apiMessages: AiChatMessage[] = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let accumulated = "";
    try {
      await analyzeMatchStream(buildMatchData(match), apiMessages, (token) => {
        accumulated += token;
        setStreamingContent(accumulated);
      });
      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    }
    setStreamingContent("");
    setIsLoading(false);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxHeight: "85vh",
          background: "#1e293b",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header — champion name, result, and KDA summary */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>
              {match.championName}
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  color: isWin ? "#4ade80" : "#f87171",
                }}
              >
                {isWin ? "Victory" : "Defeat"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {match.kills}/{match.deaths}/{match.assists} ({kda} KDA)
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              padding: "4px 8px",
            }}
          >
            &times;
          </button>
        </div>

        {/* Scrollable message area */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 200,
          }}
        >
          {messages.length === 0 && !isLoading && (
            <div style={{ textAlign: "center", color: "#475569", fontSize: 13, marginTop: 40 }}>
              Ask about this match — e.g. "How did I perform?" or "What should I improve?"
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user" ? "#4f46e5" : "#334155",
                  color: "#e2e8f0",
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Partial streaming response — shown while tokens arrive */}
          {isLoading && streamingContent && (
            <div style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "14px 14px 14px 4px",
                  background: "#334155",
                  color: "#e2e8f0",
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {streamingContent}
              </div>
            </div>
          )}

          {/* Typing indicator — shown before first token arrives */}
          {isLoading && !streamingContent && (
            <div style={{ alignSelf: "flex-start" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "14px 14px 14px 4px",
                  background: "#334155",
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#64748b",
                      display: "inline-block",
                      animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
                <style>{`
                  @keyframes dotPulse {
                    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                    40% { opacity: 1; transform: scale(1); }
                  }
                `}</style>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about this match..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: isLoading || !input.trim() ? "#334155" : "#4f46e5",
              color: isLoading || !input.trim() ? "#64748b" : "#fff",
              cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "background 0.15s",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

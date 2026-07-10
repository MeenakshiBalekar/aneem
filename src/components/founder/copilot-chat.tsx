"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Why were sales low yesterday?",
  "Which product should I promote this weekend?",
  "How is my repeat customer rate trending?",
  "What's my biggest risk right now?",
];

export function CopilotChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    const nextMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    const res = await founderFetch("/api/founder/copilot/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history: messages.slice(-10) }),
    });
    const data = await res.json();
    setLoading(false);
    setMessages([...nextMessages, { role: "assistant", content: data.answer ?? "Something went wrong." }]);
  }

  return (
    <div className="flex h-[600px] flex-col border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 border-b border-white/10 p-4">
        <Sparkles size={16} className="text-accent" />
        <h2 className="text-sm font-bold uppercase tracking-wide">AI Founder Copilot</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-white/40">Ask about your business — I can see live orders, revenue, ads, returns, and inventory.</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="border border-white/15 px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/5">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("max-w-[85%] whitespace-pre-wrap px-3 py-2 text-sm", m.role === "user" ? "bg-accent text-ink ml-auto" : "bg-white/5 text-white")}>
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-white/30">Thinking...</div>}
        <div ref={scrollRef} />
      </div>

      <div className="flex gap-2 border-t border-white/10 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask anything about your business..."
          className="h-10 flex-1 border border-white/15 bg-white/5 px-3 text-sm focus:border-white/40 focus:outline-none"
        />
        <button onClick={() => send(input)} disabled={loading} className="bg-accent text-ink flex h-10 w-10 items-center justify-center disabled:opacity-50">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

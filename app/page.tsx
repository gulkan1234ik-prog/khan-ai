"use client";

import { useEffect, useMemo, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type ChatProvider = "openai" | "claude";
type Conversation = { id: string; title: string; provider: ChatProvider; messages: Message[]; updatedAt: number };
const STORAGE_KEY = "khan-ai-conversations-v1";
const newConversation = (): Conversation => ({ id: crypto.randomUUID(), title: "New chat", provider: "openai", messages: [], updatedAt: Date.now() });

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoStatus, setVideoStatus] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Conversation[];
        if (Array.isArray(parsed) && parsed.length) {
          setConversations(parsed);
          setActiveId(parsed[0].id);
          setHydrated(true);
          return;
        }
      }
    } catch { /* Ignore invalid local history and start fresh. */ }
    const first = newConversation();
    setConversations([first]);
    setActiveId(first.id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, hydrated]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? conversations[0], [conversations, activeId]);
  const messages = active?.messages ?? [];
  const provider = active?.provider ?? "openai";

  function patchActive(patch: Partial<Conversation>) {
    if (!active) return;
    setConversations((items) => items.map((c) => c.id === active.id ? { ...c, ...patch, updatedAt: Date.now() } : c));
  }

  function createChat() {
    const chat = newConversation();
    setConversations((items) => [chat, ...items]);
    setActiveId(chat.id);
    setPrompt("");
    setVideoStatus("");
  }

  function deleteChat(id: string) {
    const remaining = conversations.filter((c) => c.id !== id);
    if (!remaining.length) {
      const fresh = newConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
    } else {
      setConversations(remaining);
      if (activeId === id) setActiveId(remaining[0].id);
    }
  }

  function exportChat() {
    const content = messages.map((m) => `${m.role === "user" ? "You" : "Khan AI"}:\n${m.content}`).join("\n\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${(active?.title || "khan-ai-chat").replace(/[^a-z0-9-_]/gi, "-").slice(0, 60)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || busy || !active) return;
    const updated = [...messages, { role: "user" as const, content: text }];
    const chatId = active.id;
    const selectedProvider = provider;
    const title = messages.length === 0 ? text.slice(0, 42) + (text.length > 42 ? "…" : "") : active.title;
    setConversations((items) => items.map((c) => c.id === chatId ? { ...c, messages: updated, title, updatedAt: Date.now() } : c));
    setPrompt(""); setBusy(true);
    try {
      const response = await fetch(selectedProvider === "claude" ? "/api/claude" : "/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat request failed.");
      setConversations((items) => items.map((c) => c.id === chatId ? { ...c, messages: [...updated, { role: "assistant", content: data.reply }], updatedAt: Date.now() } : c));
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setConversations((items) => items.map((c) => c.id === chatId ? { ...c, messages: [...updated, { role: "assistant", content: `Error: ${errorText}` }], updatedAt: Date.now() } : c));
    } finally { setBusy(false); }
  }

  async function requestVideo(e: React.FormEvent) {
    e.preventDefault();
    const text = videoPrompt.trim();
    if (!text) return;
    setVideoStatus("Sending your request…");
    try {
      const response = await fetch("/api/video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Video provider is not configured.");
      setVideoStatus(data.url ? `Video ready: ${data.url}` : (data.message || "Request submitted to the provider."));
    } catch (err) { setVideoStatus(err instanceof Error ? err.message : "Video request failed."); }
  }

  if (!hydrated) return <main className="loadingScreen"><div className="brandMark">✦</div><p>Loading Khan AI…</p></main>;

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandMark">✦</span><span>Khan AI</span></div>
        <button className="newChat" onClick={createChat}>＋ New chat</button>
        <div className="sideLabel">YOUR CHATS <span>{conversations.length}</span></div>
        <div className="historyList">
          {conversations.slice().sort((a,b) => b.updatedAt-a.updatedAt).map((chat) => (
            <div className={`historyRow ${chat.id === active?.id ? "selected" : ""}`} key={chat.id}>
              <button className="historyTitle" onClick={() => setActiveId(chat.id)} title={chat.title}>◷ <span>{chat.title}</span></button>
              <button className="deleteChat" onClick={() => deleteChat(chat.id)} title="Delete chat" aria-label={`Delete ${chat.title}`}>×</button>
            </div>
          ))}
        </div>
        <div className="sideLabel">WORKSPACE</div>
        <a className="sideItem active" href="#assistant">✧ AI Assistant</a>
        <a className="sideItem" href="#video">▣ Video studio</a>
        <div className="sideNote">Your creative workspace for ideas, scripts, coding, and video prompts.</div>
        <div className="profile"><div className="avatar">K</div><div><b>Khan AI</b><small>Personal workspace</small></div></div>
      </aside>

      <section className="main">
        <header className="topbar"><div><span className="statusDot"></span> AI workspace</div><div className="topbarRight"><span className="pill">Chat + Video</span><button className="exportButton" onClick={exportChat} disabled={!messages.length}>Export chat ↓</button></div></header>
        <div className="content">
          <div className="hero"><div className="eyebrow">YOUR CREATIVE COPILOT</div><h1>What will you <span>create</span> today?</h1><p>Brainstorm ideas, write scripts, learn, code, and prepare AI video prompts.</p></div>

          <section className="chatCard" id="assistant">
            <div className="cardHead"><div><span className="miniIcon">✧</span><b>AI Assistant</b></div><label className="providerControl">Model <select aria-label="Choose AI model" value={provider} onChange={(e) => patchActive({ provider: e.target.value as ChatProvider })} disabled={busy}><option value="openai">OpenAI</option><option value="claude">Claude</option></select></label></div>
            <div className="messages">
              {messages.length === 0 ? <div className="emptyState"><div className="spark">✦</div><b>Start with an idea</b><p>Ask for a story, a script, a plan, coding help, or anything you’re creating.</p><div className="suggestions"><button onClick={() => setPrompt("Help me write a YouTube video script about artificial intelligence.")}>✦ YouTube script</button><button onClick={() => setPrompt("Explain a difficult topic in simple Urdu.")}>◉ Learn something</button><button onClick={() => setPrompt("Help me build a simple website step by step.")}>⌘ Coding help</button></div></div> : messages.map((m, i) => <div className={`message ${m.role}`} key={`${active?.id}-${i}`}><div className="messageRole">{m.role === "user" ? "YOU" : `KHAN AI · ${provider.toUpperCase()}`}</div><div className="messageText">{m.content}</div></div>)}
              {busy && <div className="typing"><span className="typingDots">•••</span> Khan AI is thinking…</div>}
            </div>
            <form className="chatForm" onSubmit={sendMessage}><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Message Khan AI…" rows={2} maxLength={12000} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }} /><div className="formBottom"><span>Enter to send · Shift + Enter for new line</span><button className="sendButton" disabled={busy || !prompt.trim()} type="submit" aria-label="Send message">{busy ? "…" : "↑"}</button></div></form>
          </section>

          <section className="videoCard" id="video"><div className="videoIntro"><div className="videoGlyph">▶</div><div><div className="eyebrow">VIDEO STUDIO</div><h2>Turn a prompt into a video</h2><p>Describe the scene, mood, style, and motion you want.</p></div></div><form onSubmit={requestVideo} className="videoForm"><label htmlFor="videoPrompt">Video description</label><textarea id="videoPrompt" rows={3} maxLength={5000} value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} placeholder="A cinematic aerial shot over snowy mountains at sunrise, slow camera movement…"/><div className="videoActions"><span className="muted">Needs a compatible video API configured on the server.</span><button className="primary" type="submit" disabled={!videoPrompt.trim()}>Prepare video request ↗</button></div></form>{videoStatus && <div className="videoStatus" role="status">{videoStatus}</div>}</section>
          <footer>Khan AI · Chat history is stored in this browser · API keys remain on the server.</footer>
        </div>
      </section>
    </main>
  );
}

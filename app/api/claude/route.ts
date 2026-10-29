import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_MESSAGES = 40;
const MAX_CONTENT_LENGTH = 12000;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Claude is not configured yet. Add ANTHROPIC_API_KEY to your local .env.local file, then restart the dev server." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const incoming = body?.messages;
    if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > MAX_MESSAGES) {
      return NextResponse.json({ error: `Send between 1 and ${MAX_MESSAGES} chat messages.` }, { status: 400 });
    }

    const messages: { role: "user" | "assistant"; content: string }[] = [];
    for (const item of incoming) {
      if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") {
        return NextResponse.json({ error: "Invalid message format." }, { status: 400 });
      }
      const content = item.content.trim().slice(0, MAX_CONTENT_LENGTH);
      if (content) messages.push({ role: item.role, content });
    }
    if (!messages.length) {
      return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
    }

    // Keep the API key on the server. Never pass it to client-side code.
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": process.env.ANTHROPIC_VERSION || "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 1200,
        system: "You are Khan AI, a helpful creative assistant. Help with writing, planning, coding, and video prompts. Be clear and safe.",
        messages,
      }),
      signal: AbortSignal.timeout(45000),
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      // Do not return upstream details that might contain sensitive account information.
      const status = upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status === 429 ? 429 : 502;
      const error = upstream.status === 401 || upstream.status === 403
        ? "Claude rejected the API key. Check that ANTHROPIC_API_KEY is valid and has API access."
        : upstream.status === 429
          ? "Claude is receiving too many requests or the account has reached a limit. Please wait and try again."
          : "Claude could not complete the request. Check your model setting and API account, then try again.";
      return NextResponse.json({ error }, { status });
    }

    const reply = Array.isArray(data?.content)
      ? data.content.filter((part: { type?: string; text?: string }) => part?.type === "text" && typeof part.text === "string").map((part: { text: string }) => part.text).join("\n")
      : "";
    return NextResponse.json({ reply: reply || "Claude did not return a text reply. Please try again." });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "Claude took too long to respond. Please try again." }, { status: 504 });
    }
    return NextResponse.json({ error: "Could not process the Claude request. Please try again." }, { status: 500 });
  }
}

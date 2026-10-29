import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_MESSAGES = 40;
const MAX_CONTENT_LENGTH = 12000;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OpenAI is not configured. Add OPENAI_API_KEY to .env.local and restart the server." }, { status: 503 });
    const body = await req.json();
    const incoming = body?.messages;
    if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > MAX_MESSAGES) {
      return NextResponse.json({ error: `Send between 1 and ${MAX_MESSAGES} chat messages.` }, { status: 400 });
    }
    const safeMessages: { role: "user" | "assistant"; content: string }[] = [];
    for (const item of incoming) {
      if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") {
        return NextResponse.json({ error: "Invalid message format." }, { status: 400 });
      }
      const content = item.content.trim().slice(0, MAX_CONTENT_LENGTH);
      if (content) safeMessages.push({ role: item.role, content });
    }
    if (!safeMessages.length) return NextResponse.json({ error: "Please enter a message." }, { status: 400 });

    const client = new OpenAI({ apiKey, timeout: 45000, maxRetries: 1 });
    const result = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: "system", content: "You are Khan AI, a helpful creative assistant. Help with writing, planning, coding, learning, and video prompts. Be clear and safe." }, ...safeMessages],
      max_completion_tokens: 1200,
    });
    return NextResponse.json({ reply: result.choices[0]?.message?.content || "I couldn't create a reply. Please try again." });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      const status = error.status === 429 ? 429 : error.status === 401 || error.status === 403 ? 502 : 502;
      const message = error.status === 429 ? "OpenAI rate limit or account quota reached. Wait a little and try again." : error.status === 401 || error.status === 403 ? "OpenAI rejected the API key. Check OPENAI_API_KEY in .env.local." : "OpenAI could not complete the request. Check your model setting and API account.";
      return NextResponse.json({ error: message }, { status });
    }
    if (error instanceof Error && (error.name === "APIConnectionTimeoutError" || error.name === "TimeoutError")) return NextResponse.json({ error: "OpenAI took too long to respond. Please try again." }, { status: 504 });
    return NextResponse.json({ error: "Could not process the OpenAI request. Please try again." }, { status: 500 });
  }
}

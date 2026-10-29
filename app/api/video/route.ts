import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = body?.prompt;
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 5000) {
      return NextResponse.json({ error: "Enter a video prompt under 5,000 characters." }, { status: 400 });
    }
    const endpoint = process.env.VIDEO_PROVIDER_API_URL;
    const apiKey = process.env.VIDEO_PROVIDER_API_KEY;
    if (!endpoint || !apiKey) {
      return NextResponse.json({ error: "Video generation is not connected yet. Add a compatible provider endpoint and API key to .env.local, and adapt the request to that provider's API. Chat works independently." }, { status: 501 });
    }
    let parsed: URL;
    try { parsed = new URL(endpoint); } catch { return NextResponse.json({ error: "VIDEO_PROVIDER_API_URL must be a valid HTTPS URL." }, { status: 500 }); }
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      return NextResponse.json({ error: "The video provider endpoint must use HTTPS." }, { status: 500 });
    }
    const upstream = await fetch(parsed.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ prompt: prompt.trim() }),
      signal: AbortSignal.timeout(45000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return NextResponse.json({ error: `Video provider returned status ${upstream.status}. Check the provider's API docs and configuration.` }, { status: 502 });
    return NextResponse.json({ message: typeof data.message === "string" ? data.message : "Video request accepted by the provider.", url: typeof data.url === "string" ? data.url : undefined });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") return NextResponse.json({ error: "Video provider timed out. Check its job/status API and try again." }, { status: 504 });
    return NextResponse.json({ error: "Could not process the video request." }, { status: 500 });
  }
}

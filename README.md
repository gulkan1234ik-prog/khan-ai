# Khan AI

A responsive Next.js AI workspace with OpenAI and Claude chat, browser-local conversation history, chat export, and a configurable video-provider adapter.

## Included features

- Responsive dark interface for desktop and mobile
- OpenAI and Claude model selection
- Server-side API routes: `/api/chat`, `/api/claude`, `/api/video`
- Local conversation history saved in the current browser (no account sync)
- Create, switch between, and delete chats
- Export the current chat to a `.txt` file
- Quick-start prompt suggestions
- Video prompt form with an honest provider-not-configured message
- API keys kept in server environment variables

## Requirements

- Node.js 20+
- An OpenAI API key and/or a Claude API key
- For actual video generation, an account with a video provider and a provider-specific adapter

## Run locally

1. If you previously pasted any API key into a chat or public place, revoke it and create a replacement.
2. Copy `.env.example` to `.env.local`.
3. Put only the provider keys you intend to use into `.env.local`. Never paste keys into chat, client-side code, screenshots, or Git commits.
4. Install dependencies and start the development server:

   ```bash
   npm install
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Environment variables

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_VERSION=2023-06-01
VIDEO_PROVIDER_API_URL=
VIDEO_PROVIDER_API_KEY=
```

You only need the key for the model you use. Restart the server after editing `.env.local`. API usage may incur charges.

## Claude integration

The `/api/claude` route calls Anthropic's Messages API from the server and reads `ANTHROPIC_API_KEY` only from the server environment. The model selector's Claude option will not work until a valid API key with API access is configured.

## Video integration limitation

The `/api/video` endpoint is a generic adapter, not a universal video API. Providers have different endpoints, request formats, asynchronous job polling, and output fields. Customize `app/api/video/route.ts` using your chosen provider's official API documentation before expecting real video generation.

## Not yet included / production checklist

This is a full runnable starter app, not a deployed production service. Google sign-in, cloud-synced user accounts, database-backed chat history, and real video generation are not enabled because they require provider credentials, a database, and/or a specific video provider. Before public launch, add authentication, database persistence, server-side rate limiting, abuse protection, monitoring, privacy terms, and provider-specific video job tracking. Browser-local history is not encrypted or synced between devices.

<p align="center">
  <img src="https://www.youtubetranscript.dev/logo.svg" alt="YouTubeTranscript.dev" width="60" />
</p>

<h1 align="center">youtube-transcript-api</h1>

<p align="center">
  Official Node.js / TypeScript SDK for the <a href="https://www.youtubetranscript.dev">YouTubeTranscript.dev</a> API (V2).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/youtube-audio-transcript-api"><img src="https://img.shields.io/npm/v/youtube-audio-transcript-api" alt="npm" /></a>
  <a href="https://www.youtubetranscript.dev"><img src="https://img.shields.io/badge/API-v2-brightgreen" alt="API Version" /></a>
  <a href="https://github.com/volodstaimi/youtube-transcript-sdk/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/youtube-audio-transcript-api" alt="License" /></a>
</p>

---

## Install

```bash
npm install youtube-transcript-api
```

```bash
pnpm add youtube-transcript-api
```

```bash
yarn add youtube-transcript-api
```

## Quick Start

```typescript
import { YouTubeTranscript } from "youtube-transcript-api";

const yt = new YouTubeTranscript({ apiKey: "your_api_key" });

// Simple — just pass a video ID or URL
const result = await yt.getTranscript("dQw4w9WgXcQ");
console.log(result.data?.transcript.text);
```

Get your API key at **[youtubetranscript.dev](https://www.youtubetranscript.dev)**

## Features

- ✅ Full V2 API coverage — transcribe, batch, jobs, polling
- ✅ TypeScript-first with complete type definitions
- ✅ Zero dependencies — uses native `fetch` (Node 18+)
- ✅ Typed errors for every API error code
- ✅ Built-in polling helpers for async ASR jobs
- ✅ ESM and CommonJS support

## Usage

### Basic Transcription

```typescript
import { YouTubeTranscript } from "youtube-transcript-api";

const yt = new YouTubeTranscript({ apiKey: "your_api_key" });

// By video ID
const result = await yt.getTranscript("dQw4w9WgXcQ");

// By URL
const result = await yt.getTranscript("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

// With translation
const result = await yt.getTranscript("dQw4w9WgXcQ", "es");
```

### Full Options

```typescript
const result = await yt.transcribe({
  video: "dQw4w9WgXcQ",
  language: "fr",
  source: "manual",
  format: {
    timestamp: true,
    paragraphs: true,
    words: false,
  },
});

console.log(result.status);                    // "completed"
console.log(result.data?.transcript.text);     // Full transcript text
console.log(result.data?.transcript.language); // "fr"
console.log(result.data?.transcript.segments); // Timestamped segments
console.log(result.credits_used);              // Credits consumed
```

### Batch Processing (up to 100 videos)

```typescript
const result = await yt.batch({
  video_ids: [
    "dQw4w9WgXcQ",
    "jNQXAC9IVRw",
    "9bZkp7q19f0",
  ],
  format: { timestamp: true },
});

console.log(result.summary);
// { total: 3, succeeded: 3, failed: 0, processing: 0 }

for (const item of result.results) {
  console.log(`${item.data?.video_id}: ${item.data?.transcript.text.slice(0, 100)}...`);
}
```

### ASR Audio Transcription (Async)

For videos without captions, use ASR with a webhook or polling:

```typescript
// Option 1: Webhook (recommended for production)
const result = await yt.transcribe({
  video: "VIDEO_ID",
  source: "asr",
  allow_asr: true,
  webhook_url: "https://yoursite.com/webhook",
});
// result.status === "processing"
// result.job_id === "job_abc123"

// Option 2: Poll until complete
const result = await yt.transcribe({
  video: "VIDEO_ID",
  source: "asr",
  allow_asr: true,
});

if (result.job_id) {
  const final = await yt.waitForJob(result.job_id, {
    interval: 5000,     // poll every 5s
    maxAttempts: 60,     // give up after 5 minutes
  });
  console.log(final.data?.transcript.text);
}
```

### ASR Confirmation Flow

V2 requires explicit confirmation before ASR charges. If you don't set `allow_asr: true` and captions aren't available:

```typescript
const result = await yt.transcribe({
  video: "VIDEO_WITHOUT_CAPTIONS",
  source: "asr",
  // allow_asr not set
});

if (result.status === "requires_asr_confirmation") {
  console.log(result.estimated_credits);  // e.g. 5
  console.log(result.duration_minutes);   // e.g. 7.5
  console.log(result.suggestion);         // "Set allow_asr=true to proceed"

  // User confirms → retry with allow_asr
  const confirmed = await yt.transcribe({
    video: "VIDEO_WITHOUT_CAPTIONS",
    source: "asr",
    allow_asr: true,
    webhook_url: "https://yoursite.com/webhook",
  });
}
```

### Job & Batch Polling

```typescript
// Poll a single job
const job = await yt.getJob("job_abc123");

// Poll with format options
const job = await yt.getJob("job_abc123", {
  include_segments: true,
  include_paragraphs: true,
});

// Poll a batch
const batch = await yt.getBatch("batch_abc123");

// Auto-poll until done
const completed = await yt.waitForJob("job_abc123");
const completedBatch = await yt.waitForBatch("batch_abc123");
```

## Error Handling

Every API error maps to a typed exception:

```typescript
import {
  YouTubeTranscript,
  InvalidRequestError,
  AuthenticationError,
  InsufficientCreditsError,
  NoCaptionsError,
  RateLimitError,
} from "youtube-transcript-api";

try {
  await yt.getTranscript("invalid");
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log("Bad API key");
  } else if (error instanceof InsufficientCreditsError) {
    console.log("Top up at https://youtubetranscript.dev/pricing");
  } else if (error instanceof NoCaptionsError) {
    console.log("No captions — try source: 'asr' with allow_asr: true");
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof InvalidRequestError) {
    console.log(`Bad request: ${error.message}`);
  }
}
```

| Error Class | HTTP Status | When |
|---|---|---|
| `InvalidRequestError` | 400 | Invalid JSON, missing fields, bad video ID |
| `AuthenticationError` | 401 | Missing or invalid API key |
| `InsufficientCreditsError` | 402 | Not enough credits |
| `NoCaptionsError` | 404 | No captions and ASR not used |
| `RateLimitError` | 429 | Too many requests |
| `YouTubeTranscriptError` | Other | Server errors, unexpected responses |

## Configuration

```typescript
const yt = new YouTubeTranscript({
  apiKey: "your_api_key",        // Required
  baseUrl: "https://...",        // Override API base URL
  timeout: 60_000,               // Request timeout in ms (default: 30s)
});
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- API key from [youtubetranscript.dev](https://www.youtubetranscript.dev)

## Links

- 🌐 [Website](https://www.youtubetranscript.dev)
- 📖 [Full API Docs](https://www.youtubetranscript.dev/api-docs)
- 📐 [OpenAPI Spec](https://www.youtubetranscript.dev/api-docs#openapi)
- 💰 [Pricing](https://www.youtubetranscript.dev/pricing)
- 🐛 [Issues & Feedback](https://github.com/volodstaimi/Youtube-Transcript-API/issues)
- 📝 [Examples & Docs Repo](https://github.com/volodstaimi/Youtube-Transcript-API)

## License

MIT — see [LICENSE](./LICENSE) for details.

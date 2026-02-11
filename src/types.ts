// -------------------------------------------------------
// Types derived from the V2 OpenAPI specification
// https://youtubetranscript.dev/api-docs
// -------------------------------------------------------

/** Control which extra fields are included in the response. */
export interface FormatOptions {
  /** Include timestamped segments */
  timestamp?: boolean;
  /** Include paragraph groupings */
  paragraphs?: boolean;
  /** Include word-level timestamps */
  words?: boolean;
}

/** Caption source preference. */
export type Source = "auto" | "manual" | "asr";

// -------------------------------------------------------
// Requests
// -------------------------------------------------------

export interface TranscribeRequest {
  /** YouTube URL or 11-character video ID */
  video: string;
  /** ISO 639-1 language code (e.g. "es", "fr"). Omit for best available. */
  language?: string;
  /** Caption source: "auto" (default), "manual", or "asr" */
  source?: Source;
  /** Explicitly confirm ASR usage when captions are unavailable */
  allow_asr?: boolean;
  /** Control extra output fields */
  format?: FormatOptions;
  /** URL to receive async results. Required for source="asr". */
  webhook_url?: string;
}

export interface BatchRequest {
  /** Array of YouTube URLs or 11-character video IDs (max 100) */
  video_ids: string[];
  /** ISO 639-1 language code */
  language?: string;
  /** Caption source preference */
  source?: Source;
  /** Explicitly confirm ASR usage */
  allow_asr?: boolean;
  /** Control extra output fields */
  format?: FormatOptions;
  /** URL to receive async results */
  webhook_url?: string;
}

// -------------------------------------------------------
// Responses
// -------------------------------------------------------

export interface TranscriptPayload {
  /** Full transcript text */
  text: string;
  /** Detected / returned language */
  language: string;
  /** Source of the transcript: manual captions, auto, or asr */
  source: string;
  /** Timestamped segments (when format.timestamp = true) */
  segments?: Record<string, unknown>[];
  /** Paragraph groupings (when format.paragraphs = true) */
  paragraphs?: Record<string, unknown>[];
  /** Word-level timestamps (when format.words = true) */
  words?: Record<string, unknown>[];
}

export type TranscribeStatus =
  | "completed"
  | "processing"
  | "failed"
  | "requires_asr_confirmation";

export interface TranscribeResponse {
  request_id: string;
  status: TranscribeStatus;
  data?: {
    video_id: string;
    transcript: TranscriptPayload;
    video_title?: string | null;
  };
  error?: string;
  job_id?: string | null;
  estimated_credits?: number;
  duration_minutes?: number | null;
  suggestion?: string;
  credits_used?: number;
}

export type BatchStatus = "completed" | "partial" | "processing";

export interface BatchResponse {
  batch_id: string;
  status: BatchStatus;
  results: TranscribeResponse[];
  summary?: {
    total: number;
    succeeded: number;
    failed: number;
    processing: number;
  };
  credits_used?: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// -------------------------------------------------------
// Client options
// -------------------------------------------------------

export interface YouTubeTranscriptOptions {
  /** Your API key from https://youtubetranscript.dev/dashboard */
  apiKey: string;
  /** Base URL override (default: https://youtubetranscript.dev/api/v2) */
  baseUrl?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

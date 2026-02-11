import type {
  YouTubeTranscriptOptions,
  TranscribeRequest,
  TranscribeResponse,
  BatchRequest,
  BatchResponse,
  ErrorResponse,
} from "./types";

import {
  YouTubeTranscriptError,
  InvalidRequestError,
  AuthenticationError,
  InsufficientCreditsError,
  NoCaptionsError,
  RateLimitError,
} from "./errors";

const DEFAULT_BASE_URL = "https://youtubetranscript.dev/api/v2";
const DEFAULT_TIMEOUT = 30_000;

export class YouTubeTranscript {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  /**
   * Create a new YouTubeTranscript client.
   *
   * ```ts
   * const yt = new YouTubeTranscript({ apiKey: "your_api_key" });
   * ```
   *
   * Get your API key at https://youtubetranscript.dev
   */
  constructor(options: YouTubeTranscriptOptions) {
    if (!options.apiKey) {
      throw new Error(
        "API key is required. Get one at https://youtubetranscript.dev"
      );
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
  }

  // ---------------------------------------------------
  // Public methods
  // ---------------------------------------------------

  /**
   * Transcribe a single YouTube video.
   *
   * ```ts
   * const result = await yt.transcribe({ video: "dQw4w9WgXcQ" });
   * console.log(result.data?.transcript.text);
   * ```
   */
  async transcribe(
    request: TranscribeRequest
  ): Promise<TranscribeResponse> {
    return this.post<TranscribeResponse>("/transcribe", request);
  }

  /**
   * Shorthand: transcribe a video by URL or ID with minimal config.
   *
   * ```ts
   * const result = await yt.getTranscript("dQw4w9WgXcQ");
   * ```
   */
  async getTranscript(
    video: string,
    language?: string
  ): Promise<TranscribeResponse> {
    return this.transcribe({ video, language });
  }

  /**
   * Transcribe multiple videos in a single request (up to 100).
   *
   * ```ts
   * const result = await yt.batch({
   *   video_ids: ["dQw4w9WgXcQ", "jNQXAC9IVRw"],
   * });
   * ```
   */
  async batch(request: BatchRequest): Promise<BatchResponse> {
    return this.post<BatchResponse>("/batch", request);
  }

  /**
   * Poll an async transcription job (ASR).
   *
   * ```ts
   * const status = await yt.getJob("job_abc123");
   * ```
   */
  async getJob(
    jobId: string,
    options?: {
      include_segments?: boolean;
      include_paragraphs?: boolean;
      include_words?: boolean;
    }
  ): Promise<TranscribeResponse> {
    const params = new URLSearchParams();
    if (options?.include_segments) params.set("include_segments", "true");
    if (options?.include_paragraphs) params.set("include_paragraphs", "true");
    if (options?.include_words) params.set("include_words", "true");

    const query = params.toString();
    const path = `/jobs/${jobId}${query ? `?${query}` : ""}`;
    return this.get<TranscribeResponse>(path);
  }

  /**
   * Poll a batch job.
   *
   * ```ts
   * const status = await yt.getBatch("batch_abc123");
   * ```
   */
  async getBatch(batchId: string): Promise<BatchResponse> {
    return this.get<BatchResponse>(`/batch/${batchId}`);
  }

  /**
   * Poll a job until it completes or fails.
   *
   * ```ts
   * const result = await yt.waitForJob("job_abc123", {
   *   interval: 5000,
   *   maxAttempts: 60,
   * });
   * ```
   */
  async waitForJob(
    jobId: string,
    options?: { interval?: number; maxAttempts?: number }
  ): Promise<TranscribeResponse> {
    const interval = options?.interval || 5_000;
    const maxAttempts = options?.maxAttempts || 60;

    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getJob(jobId);

      if (result.status === "completed" || result.status === "failed") {
        return result;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      `Job ${jobId} did not complete after ${maxAttempts} attempts`
    );
  }

  /**
   * Poll a batch until it completes.
   */
  async waitForBatch(
    batchId: string,
    options?: { interval?: number; maxAttempts?: number }
  ): Promise<BatchResponse> {
    const interval = options?.interval || 5_000;
    const maxAttempts = options?.maxAttempts || 60;

    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getBatch(batchId);

      if (result.status === "completed") {
        return result;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      `Batch ${batchId} did not complete after ${maxAttempts} attempts`
    );
  }

  // ---------------------------------------------------
  // HTTP helpers
  // ---------------------------------------------------

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "youtube-transcript-sdk/1.0.0",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw this.createError(response.status, data, response.headers);
      }

      return data as T;
    } catch (error) {
      if (error instanceof YouTubeTranscriptError) throw error;
      if ((error as Error).name === "AbortError") {
        throw new Error(`Request to ${path} timed out after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private createError(
    status: number,
    body: ErrorResponse,
    headers: Headers
  ): YouTubeTranscriptError {
    switch (status) {
      case 400:
        return new InvalidRequestError(body);
      case 401:
        return new AuthenticationError(body);
      case 402:
        return new InsufficientCreditsError(body);
      case 404:
        return new NoCaptionsError(body);
      case 429: {
        const retryAfter = headers.get("Retry-After");
        return new RateLimitError(
          body,
          retryAfter ? parseInt(retryAfter, 10) : undefined
        );
      }
      default:
        return new YouTubeTranscriptError(status, body);
    }
  }
}

import type { ErrorResponse } from "./types";

export class YouTubeTranscriptError extends Error {
  public readonly status: number;
  public readonly errorCode: string;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, body: ErrorResponse) {
    super(body.message || body.error);
    this.name = "YouTubeTranscriptError";
    this.status = status;
    this.errorCode = body.error;
    this.details = body.details;
  }
}

export class InvalidRequestError extends YouTubeTranscriptError {
  constructor(body: ErrorResponse) {
    super(400, body);
    this.name = "InvalidRequestError";
  }
}

export class AuthenticationError extends YouTubeTranscriptError {
  constructor(body: ErrorResponse) {
    super(401, body);
    this.name = "AuthenticationError";
  }
}

export class InsufficientCreditsError extends YouTubeTranscriptError {
  constructor(body: ErrorResponse) {
    super(402, body);
    this.name = "InsufficientCreditsError";
  }
}

export class NoCaptionsError extends YouTubeTranscriptError {
  constructor(body: ErrorResponse) {
    super(404, body);
    this.name = "NoCaptionsError";
  }
}

export class RateLimitError extends YouTubeTranscriptError {
  public readonly retryAfter?: number;

  constructor(body: ErrorResponse, retryAfter?: number) {
    super(429, body);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

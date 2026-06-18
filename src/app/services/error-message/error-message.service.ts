// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpErrorResponse } from '@angular/common/http';

// Minimal shape of an RFC-7807 ProblemDetails body, kept local so this helper is
// decoupled from any generated API client (every Crucible client ships the same shape).
interface ApiProblemDetails {
  title?: string | null;
  detail?: string | null;
}

export class ErrorMessageService {
  // Pull a human-readable message out of an HttpErrorResponse so callers never render the
  // useless "[object Object]". The API surfaces failures as a ProblemDetails body, filled
  // differently per environment:
  //   500 in Development: title = the exception message,  detail = full stack trace
  //   500 in Production:  title = "A server error occurred.", detail = the exception message
  // So prefer title unless it's the generic placeholder, then fall back to detail. That yields
  // the clean message in both environments (and avoids dumping a stack trace in dev).
  static getApiErrorMessage(err: HttpErrorResponse, fallback?: string): string {
    const body = err?.error;

    if (typeof body === 'string' && body.trim().length > 0) {
      return body;
    }

    const problem = body as ApiProblemDetails;
    const title = problem?.title;
    if (
      typeof title === 'string' &&
      title.trim().length > 0 &&
      title !== 'A server error occurred.'
    ) {
      return title;
    }

    const detail = problem?.detail;
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return detail;
    }

    if (typeof title === 'string' && title.trim().length > 0) {
      return title;
    }

    if (typeof err?.message === 'string' && err.message.trim().length > 0) {
      return err.message;
    }

    return fallback ?? 'An unexpected error occurred.';
  }
}

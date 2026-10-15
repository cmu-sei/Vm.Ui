// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorMessageService } from './error-message.service';

const get = ErrorMessageService.getApiErrorMessage;

function httpError(error: unknown, statusText = 'Server Error') {
  return new HttpErrorResponse({
    status: 500,
    statusText,
    url: 'http://vm.test/api/x',
    error,
  });
}

describe('ErrorMessageService.getApiErrorMessage', () => {
  /**
   * Verifies: a plain-text body is returned as-is.
   * Interacts with: getApiErrorMessage only.
   * Data: body 'Iso already exists'.
   */
  it('returns a string body', () => {
    expect(get(httpError('Iso already exists'))).toBe('Iso already exists');
  });

  /**
   * Verifies: a specific ProblemDetails title wins over its detail (Development 500s put the stack in detail).
   * Interacts with: getApiErrorMessage only.
   * Data: { title: 'Disk full', detail: 'at Foo.Bar()...' }.
   */
  it('prefers a specific title over the detail', () => {
    expect(get(httpError({ title: 'Disk full', detail: 'at Foo.Bar()' }))).toBe(
      'Disk full',
    );
  });

  /**
   * Verifies: the generic Production title falls back to the detail.
   * Interacts with: getApiErrorMessage only.
   * Data: { title: 'A server error occurred.', detail: 'Disk full' }.
   */
  it('uses the detail when the title is the generic placeholder', () => {
    expect(
      get(
        httpError({ title: 'A server error occurred.', detail: 'Disk full' }),
      ),
    ).toBe('Disk full');
  });

  /**
   * Verifies: with only the generic title, the generic title is still returned.
   * Interacts with: getApiErrorMessage only.
   * Data: { title: 'A server error occurred.' }.
   */
  it('returns the generic title when there is nothing better', () => {
    expect(get(httpError({ title: 'A server error occurred.' }))).toBe(
      'A server error occurred.',
    );
  });

  /**
   * Verifies: without a usable body the HttpErrorResponse message is used.
   * Interacts with: getApiErrorMessage only.
   * Data: blank string body.
   */
  it('falls back to the HTTP message', () => {
    const error = httpError('   ');

    expect(get(error)).toBe(error.message);
  });

  /**
   * Verifies: with nothing at all, the caller's fallback is returned, or the default text without one.
   * Interacts with: getApiErrorMessage only.
   * Data: null error; one row with fallback 'Upload failed', one without.
   */
  it.each([
    { fallback: 'Upload failed', expected: 'Upload failed' },
    { fallback: undefined, expected: 'An unexpected error occurred.' },
  ])(
    'returns "$expected" for no error with fallback $fallback',
    ({ fallback, expected }) => {
      expect(get(null, fallback)).toBe(expected);
    },
  );
});

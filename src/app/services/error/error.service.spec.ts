// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { SystemMessageService } from '../system-message/system-message.service';
import { ErrorService } from './error.service';

function setup() {
  const displayMessage = vi.fn();
  const messages: Pick<SystemMessageService, 'displayMessage'> = {
    displayMessage,
  };
  TestBed.configureTestingModule({
    providers: [{ provide: SystemMessageService, useValue: messages }],
  });
  return { service: TestBed.inject(ErrorService), displayMessage };
}

// The shape zone.js hands the ErrorHandler for an unhandled promise rejection.
function rejection(rejected: Record<string, unknown>) {
  return {
    message: `Uncaught (in promise): ${String(rejected['message'])}`,
    rejection: rejected,
  };
}

describe('ErrorService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('suppressed errors', () => {
    /**
     * Verifies: SignalR connection noise is logged but never shown to the user, whether thrown directly or as a promise rejection.
     * Interacts with: SystemMessageService.displayMessage spy; console.log spy.
     * Data: one row per suppressed message ('Connected', 'negotiation', 'connection is not').
     */
    it.each([
      {
        label: 'a Connected-state error',
        error: new Error(
          "Cannot send data if the connection is not in the 'Connected' State.",
        ),
        logged:
          "Cannot send data if the connection is not in the 'Connected' State.",
      },
      {
        label: 'a negotiation error',
        error: new Error('Failed to complete negotiation with the server'),
        logged: 'Failed to complete negotiation with the server',
      },
      {
        label: 'a rejected closed connection',
        error: rejection({
          message: 'WebSocket closed: connection is not open',
        }),
        logged:
          'Uncaught (in promise): WebSocket closed: connection is not open',
      },
    ])('does not display $label', ({ error, logged }) => {
      const { service, displayMessage } = setup();

      service.handleError(error);

      expect(displayMessage).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledExactlyOnceWith(
        'SignalR connection error (suppressed):',
        logged,
      );
    });

    /**
     * Verifies: undefined-property TypeErrors are logged and swallowed.
     * Interacts with: SystemMessageService.displayMessage spy.
     * Data: TypeError "Cannot read properties of undefined (reading 'openedVms')".
     */
    it('does not display undefined-property errors', () => {
      const { service, displayMessage } = setup();

      service.handleError(
        new TypeError(
          "Cannot read properties of undefined (reading 'openedVms')",
        ),
      );

      expect(displayMessage).not.toHaveBeenCalled();
    });
  });

  describe('HTTP errors', () => {
    /**
     * Verifies: an API error body with a name is shown with that name and message.
     * Interacts with: SystemMessageService.displayMessage spy.
     * Data: 400 HttpErrorResponse whose body is { name: 'Bad Request', message: 'Name is required' }.
     */
    it('shows the API error body name and message', () => {
      const { service, displayMessage } = setup();

      service.handleError(
        new HttpErrorResponse({
          status: 400,
          error: { name: 'Bad Request', message: 'Name is required' },
        }),
      );

      expect(displayMessage).toHaveBeenCalledWith(
        'Bad Request',
        'Name is required',
      );
    });

    /**
     * Verifies: a network failure (status 0) is reported as the VM API being unreachable.
     * Interacts with: SystemMessageService.displayMessage spy.
     * Data: HttpErrorResponse status 0 'Unknown Error' with a ProgressEvent body and no URL.
     */
    it('reports an unreachable API', () => {
      const { service, displayMessage } = setup();

      service.handleError(
        new HttpErrorResponse({
          status: 0,
          statusText: 'Unknown Error',
          error: new ProgressEvent('error'),
        }),
      );

      expect(displayMessage).toHaveBeenCalledWith(
        'VM API Error',
        'The VM API could not be reached.',
      );
    });

    /**
     * Verifies: other HTTP errors fall back to the status text and message.
     * Interacts with: SystemMessageService.displayMessage spy.
     * Data: 500 'Server Error' for http://vm.test/api/x with a string body.
     */
    it('falls back to the status text and message', () => {
      const { service, displayMessage } = setup();
      const error = new HttpErrorResponse({
        status: 500,
        statusText: 'Server Error',
        url: 'http://vm.test/api/x',
        error: 'boom',
      });

      service.handleError(error);

      expect(displayMessage).toHaveBeenCalledWith(
        'Server Error',
        error.message,
      );
    });

    /**
     * Verifies: an HTTP error with an empty (null) body crashes the handler instead of showing a message.
     * Interacts with: ErrorService.handleError.
     * Data: 403 'Forbidden' HttpErrorResponse with error null, as HttpClient produces for an empty body.
     */
    it('throws on an HTTP error with an empty body', () => {
      const { service, displayMessage } = setup();

      expect(() =>
        service.handleError(
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
            error: null,
          }),
        ),
      ).toThrow(TypeError);
      expect(displayMessage).not.toHaveBeenCalled();
    });
  });

  describe('unhandled promise rejections', () => {
    /**
     * Verifies: a 401 rejection is ignored because the SignalR reconnect handles it.
     * Interacts with: SystemMessageService.displayMessage spy.
     * Data: rejection { statusCode: 401 }.
     */
    it('ignores a 401', () => {
      const { service, displayMessage } = setup();

      service.handleError(
        rejection({ statusCode: 401, message: 'Unauthorized' }),
      );

      expect(displayMessage).not.toHaveBeenCalled();
    });

    /**
     * Verifies: an identity provider network failure gets its own message.
     * Interacts with: SystemMessageService.displayMessage spy.
     * Data: rejection { message: 'Network Error' }.
     */
    it('reports an unreachable identity server', () => {
      const { service, displayMessage } = setup();

      service.handleError(rejection({ message: 'Network Error' }));

      expect(displayMessage).toHaveBeenCalledWith(
        'Identity Server Error',
        'The Identity Server could not be reached for user authentication.',
      );
    });

    /**
     * Verifies: a fetch failure rejection is logged and not shown.
     * Interacts with: SystemMessageService.displayMessage spy; console.log spy.
     * Data: rejection 'TypeError: Failed to fetch'.
     */
    it('logs a fetch failure without showing it', () => {
      const { service, displayMessage } = setup();

      service.handleError(rejection({ message: 'TypeError: Failed to fetch' }));

      expect(console.log).toHaveBeenCalledExactlyOnceWith(
        'SignalR connection error: TypeError: Failed to fetch',
      );
      expect(displayMessage).not.toHaveBeenCalled();
    });

    /**
     * Verifies: any other rejection is shown as a generic error with its message.
     * Interacts with: SystemMessageService.displayMessage spy.
     * Data: rejection 'Something broke'.
     */
    it('shows any other rejection as an Error', () => {
      const { service, displayMessage } = setup();

      service.handleError(rejection({ message: 'Something broke' }));

      expect(displayMessage).toHaveBeenCalledExactlyOnceWith(
        'Error',
        'Something broke',
      );
    });
  });

  /**
   * Verifies: any other error is shown with its name and message.
   * Interacts with: SystemMessageService.displayMessage spy.
   * Data: RangeError 'Out of range'.
   */
  it('shows other errors by name and message', () => {
    const { service, displayMessage } = setup();

    service.handleError(new RangeError('Out of range'));

    expect(displayMessage).toHaveBeenCalledWith('RangeError', 'Out of range');
  });
});

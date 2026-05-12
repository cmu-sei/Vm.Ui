// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable, Injector, ErrorHandler } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SystemMessageService } from '../system-message/system-message.service';

@Injectable({
  providedIn: 'root',
})
export class ErrorService implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(err: any) {
    // Suppress SignalR connection errors
    if (err.message?.includes('Connected') ||
        err.message?.includes('connection is not') ||
        err.message?.includes('negotiation') ||
        err.rejection?.message?.includes('Connected') ||
        err.rejection?.message?.includes('connection is not') ||
        err.rejection?.message?.includes('negotiation')) {
      console.log('SignalR connection error (suppressed):', err.message || err.rejection?.message);
      return;
    }

    // Suppress undefined property access errors (should be handled by optional chaining)
    if (err.message?.includes('Cannot read properties of undefined') ||
        err.rejection?.message?.includes('Cannot read properties of undefined')) {
      console.log('Null reference error (suppressed):', err.message || err.rejection?.message);
      return;
    }

    const messageService = this.injector.get(SystemMessageService);
    // Http failure response for (unknown url): 0 Unknown Error
    if (err instanceof HttpErrorResponse) {
      const apiError = <HttpErrorResponse>err.error;
      if (apiError.name !== undefined) {
        messageService.displayMessage(apiError.name, apiError.message);
      } else if (
        err.message ===
        'Http failure response for (unknown url): 0 Unknown Error'
      ) {
        messageService.displayMessage(
          'VM API Error',
          'The VM API could not be reached.',
        );
      } else {
        messageService.displayMessage(err.statusText, err.message);
      }
    } else if (err.message.startsWith('Uncaught (in promise)')) {
      if (err.rejection.statusCode === 401) {
        // nothing to do here, the signalR reconnect handles the situation.
      } else if (err.rejection.message === 'Network Error') {
        messageService.displayMessage(
          'Identity Server Error',
          'The Identity Server could not be reached for user authentication.',
        );
      } else if (err.rejection.message?.endsWith('Failed to fetch') ||
                 err.rejection.message?.includes('Connected') ||
                 err.rejection.message?.includes('connection is not') ||
                 err.rejection.message?.includes('negotiation')) {
        console.log('SignalR connection error: ' + err.rejection.message);
      } else {
        messageService.displayMessage('Error', err.rejection.message);
      }
    } else {
      messageService.displayMessage(err.name, err.message);
    }
  }
}

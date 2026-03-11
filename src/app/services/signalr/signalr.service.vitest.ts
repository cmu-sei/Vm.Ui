// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SignalRService } from './signalr.service';
import { getDefaultProviders } from 'src/app/test-utils/vitest-default-providers';

describe('SignalRService', () => {
  function createService(): SignalRService {
    TestBed.configureTestingModule({
      providers: getDefaultProviders(),
    });
    return TestBed.inject(SignalRService);
  }

  it('should be created', () => {
    const service = createService();
    expect(service).toBeTruthy();
  });

  it('should have startConnection method', () => {
    const service = createService();
    expect(typeof service.startConnection).toBe('function');
  });

  it('should have joinView method', () => {
    const service = createService();
    expect(typeof service.joinView).toBe('function');
  });

  it('should have leaveView method', () => {
    const service = createService();
    expect(typeof service.leaveView).toBe('function');
  });

  it('should have joinViewUsers method', () => {
    const service = createService();
    expect(typeof service.joinViewUsers).toBe('function');
  });

  it('should have leaveViewUsers method', () => {
    const service = createService();
    expect(typeof service.leaveViewUsers).toBe('function');
  });
});

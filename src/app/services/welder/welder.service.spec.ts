// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { TestBed, inject } from '@angular/core/testing';

import { WelderService } from './welder.service';

describe('WelderService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WelderService]
    });
  });

  it('should be created', inject([WelderService], (service: WelderService) => {
    expect(service).toBeTruthy();
  }));
});


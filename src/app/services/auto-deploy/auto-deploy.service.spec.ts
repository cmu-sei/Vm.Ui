// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { TestBed, inject } from '@angular/core/testing';

import { AutoDeployService } from './auto-deploy.service';

describe('AutoDeployService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AutoDeployService],
    });
  });

  it('should be created', inject(
    [AutoDeployService],
    (service: AutoDeployService) => {
      expect(service).toBeTruthy();
    },
  ));
});

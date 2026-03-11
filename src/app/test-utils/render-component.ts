// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { CUSTOM_ELEMENTS_SCHEMA, Type } from '@angular/core';
import { render, RenderComponentOptions } from '@testing-library/angular';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { getDefaultProviders } from './vitest-default-providers';

export async function renderComponent<T>(
  component: Type<T>,
  options?: Partial<RenderComponentOptions<T>>
) {
  const providers = getDefaultProviders(options?.providers as any);

  return render(component, {
    ...options,
    imports: [
      NoopAnimationsModule,
      RouterTestingModule,
      FormsModule,
      ReactiveFormsModule,
      MatIconTestingModule,
      MatButtonModule,
      MatDialogModule,
      MatFormFieldModule,
      MatInputModule,
      MatCheckboxModule,
      MatSelectModule,
      MatMenuModule,
      MatTooltipModule,
      MatTabsModule,
      MatExpansionModule,
      MatPaginatorModule,
      MatTableModule,
      ...(options?.imports ?? []),
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA, ...(options?.schemas ?? [])],
    providers,
  });
}

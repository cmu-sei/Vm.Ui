// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { VmMap, VmsService } from '../../generated/vm-api';
import { VmMapsQuery } from '../../state/vmMaps/vm-maps.query';
import { VmMapsStore } from '../../state/vmMaps/vm-maps.store';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { ApiStub } from '../../test-utils/api-stub';
import { renderComponent } from '../../test-utils/render-component';
import { MapComponent } from './map.component';

const MAP: VmMap = {
  id: 'm1',
  viewId: 'view-1',
  name: 'Network',
  imageUrl: 'http://img.test/map.png',
  teamIds: ['team-1'],
  coordinates: [
    {
      id: 'c1',
      xPosition: 10,
      yPosition: 20,
      radius: 3,
      urls: ['web-1'],
      label: 'Web',
    },
    {
      id: 'c2',
      xPosition: 40,
      yPosition: 50,
      radius: 4,
      urls: ['db-1'],
      label: 'DB',
    },
  ],
};

async function renderMap() {
  const vmsApi = {
    // vm.api answers with the saved map; the new name shows the store takes the response.
    updateMap: vi.fn(() => of({ ...structuredClone(MAP), name: 'Network v2' })),
  } satisfies ApiStub<VmsService>;
  const { route } = activatedRouteStub({}, { viewId: 'view-1' });
  const initEmitter = vi.fn<(initialized: boolean) => void>();
  const rendered = await renderComponent(MapComponent, {
    inputs: { mapIdInput: 'm1' },
    on: { initEmitter },
    providers: [
      { provide: VmsService, useValue: vmsApi },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  return { ...rendered, vmsApi, initEmitter };
}

describe('MapComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: real VmMapsQuery (empty store); activatedRouteStub.
   * Data: mapIdInput 'm1'; no maps stored.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderMap();

    expect(fixture.componentInstance).toBeInstanceOf(MapComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the editor draws nothing and does not report itself initialized until its map is in the store.
   * Interacts with: real VmMapsQuery (empty store); initEmitter output.
   * Data: mapIdInput 'm1'; no maps stored.
   */
  it('waits for its map before drawing', async () => {
    const { container, initEmitter } = await renderMap();

    expect(container.querySelector('svg')).toBeNull();
    expect(initEmitter).not.toHaveBeenCalled();
  });

  /**
   * Verifies: once the map is stored, the editor draws its image and one labelled clickpoint per coordinate and reports itself initialized.
   * Interacts with: real VmMapsStore/Query; initEmitter output.
   * Data: map m1 with clickpoints Web and DB.
   */
  it("draws the stored map's clickpoints", async () => {
    const { container, initEmitter, detectChanges } = await renderMap();

    TestBed.inject(VmMapsStore).set([structuredClone(MAP)]);
    detectChanges();

    expect(container.querySelector('image')?.getAttribute('href')).toBe(
      'http://img.test/map.png',
    );
    expect(
      Array.from(container.querySelectorAll('text')).map((t) =>
        t.textContent?.trim(),
      ),
    ).toEqual(['Web', 'DB']);
    expect(initEmitter).toHaveBeenCalledWith(true);
  });

  /**
   * Verifies: save() sends the map's clickpoints, name, image and teams to the API and stores the map the API returns.
   * Interacts with: real VmMapsService.update and VmMapsStore/Query over a stubbed VmsService.updateMap; MatSnackBar (real).
   * Data: map m1 stored; saved without changes; the API answers with the name 'Network v2'.
   */
  it('saves the clickpoints through the API', async () => {
    const { fixture, vmsApi, detectChanges } = await renderMap();
    TestBed.inject(VmMapsStore).set([structuredClone(MAP)]);
    detectChanges();

    fixture.componentInstance.save();

    expect(vmsApi.updateMap).toHaveBeenCalledExactlyOnceWith('m1', {
      coordinates: MAP.coordinates,
      name: 'Network',
      imageUrl: 'http://img.test/map.png',
      teamIds: ['team-1'],
    });
    expect(TestBed.inject(VmMapsQuery).getEntity('m1')?.name).toBe(
      'Network v2',
    );
  });
});

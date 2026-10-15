// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { fireEvent } from '@testing-library/angular';
import { VmMap } from '../../../generated/vm-api';
import { ThemeService } from '../../../services/theme/theme.service';
import { VmMapsStore } from '../../../state/vmMaps/vm-maps.store';
import { activatedRouteStub } from '../../../test-utils/activated-route';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { MapVmSelectComponent } from '../map-vm-select/map-vm-select.component';
import { MapTeamDisplayComponent } from './map-team-display.component';

const OTHER_MAP = '0f8fad5b-d9cb-469f-a165-70867728950e';

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
      urls: [OTHER_MAP],
      label: 'Next',
    },
    {
      id: 'c3',
      xPosition: 60,
      yPosition: 70,
      radius: 4,
      urls: ['db-1', 'db-2'],
      label: 'DBs',
    },
  ],
};

async function renderDisplay() {
  const { route } = activatedRouteStub({}, { viewId: 'view-1' });
  const open = vi.fn(() => dialogRefStub<MapVmSelectComponent>().dialogRef);
  const dialog: Pick<MatDialog, 'open'> = { open };
  const theme: Pick<ThemeService, 'addThemeQueryParam'> = {
    addThemeQueryParam: (url) => `${url}?theme=light-theme`,
  };
  const mapSwitched = vi.fn<(mapId: string) => void>();
  const rendered = await renderComponent(MapTeamDisplayComponent, {
    inputs: { mapIdInput: 'm1', imageUrlInput: MAP.imageUrl },
    on: { mapSwitched },
    providers: [
      { provide: ActivatedRoute, useValue: route },
      { provide: MatDialog, useValue: dialog },
      { provide: ThemeService, useValue: theme },
    ],
  });
  const showMap = () => {
    TestBed.inject(VmMapsStore).set([structuredClone(MAP)]);
    rendered.detectChanges();
  };
  const clickpoint = (label: string) =>
    Array.from(rendered.container.querySelectorAll('text')).find(
      (t) => t.textContent?.trim() === label,
    )!;
  return { ...rendered, open, mapSwitched, showMap, clickpoint };
}

describe('MapTeamDisplayComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: real VmMapsQuery (empty store).
   * Data: mapIdInput 'm1'; no maps stored.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderDisplay();

    expect(fixture.componentInstance).toBeInstanceOf(MapTeamDisplayComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: nothing is drawn until the map is in the store.
   * Interacts with: real VmMapsQuery (empty store).
   * Data: mapIdInput 'm1'; no maps stored.
   */
  it('draws nothing before its map is stored', async () => {
    const { container } = await renderDisplay();

    expect(container.querySelector('svg')).toBeNull();
  });

  /**
   * Verifies: the stored map's image and clickpoint labels are drawn.
   * Interacts with: real VmMapsStore/Query.
   * Data: map m1 with three clickpoints.
   */
  it('draws the stored map with its clickpoints', async () => {
    const { container, showMap } = await renderDisplay();

    showMap();

    expect(container.querySelector('image')?.getAttribute('href')).toBe(
      'http://img.test/map.png',
    );
    expect(
      Array.from(container.querySelectorAll('text')).map((t) =>
        t.textContent?.trim(),
      ),
    ).toEqual(['Web', 'Next', 'DBs']);
  });

  /**
   * Verifies: a single-VM clickpoint opens that VM's console in a browser tab.
   * Interacts with: a click on the drawn label (fireEvent on SVG text); window.open spy; ThemeService stub.
   * Data: map m1; clickpoint Web on VM web-1.
   */
  it('opens the console of a single-VM clickpoint', async () => {
    const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null);
    const { showMap, clickpoint, mapSwitched, open } = await renderDisplay();
    showMap();

    fireEvent.click(clickpoint('Web'));

    expect(windowOpen).toHaveBeenCalledExactlyOnceWith(
      'views/view-1/vms/web-1/console?theme=light-theme',
    );
    expect(mapSwitched).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  /**
   * Verifies: a clickpoint whose target is a map id switches to that map.
   * Interacts with: a click on the drawn label (fireEvent on SVG text); mapSwitched output.
   * Data: map m1; clickpoint Next linking to another map's id.
   */
  it('switches maps from a map-link clickpoint', async () => {
    const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null);
    const { showMap, clickpoint, mapSwitched } = await renderDisplay();
    showMap();

    fireEvent.click(clickpoint('Next'));

    expect(mapSwitched).toHaveBeenCalledExactlyOnceWith(OTHER_MAP);
    expect(windowOpen).not.toHaveBeenCalled();
  });

  /**
   * Verifies: a clickpoint on several VMs opens the VM picker with those VMs.
   * Interacts with: a click on the drawn label (fireEvent on SVG text); MatDialog.open stub.
   * Data: map m1; clickpoint DBs on db-1 and db-2.
   */
  it('opens the VM picker from a several-VM clickpoint', async () => {
    const { showMap, clickpoint, open } = await renderDisplay();
    showMap();

    fireEvent.click(clickpoint('DBs'));

    expect(open).toHaveBeenCalledExactlyOnceWith(MapVmSelectComponent, {
      data: { vms: ['db-1', 'db-2'], viewId: 'view-1' },
      width: '400px',
      maxWidth: '90vw',
    });
  });
});

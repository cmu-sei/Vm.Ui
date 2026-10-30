// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { mapImageType } from './map-image';

describe('mapImageType', () => {
  /**
   * Verifies: each image type a Map can be drawn on is known by its extension, in any case.
   * Data: png, jpg, jpeg, gif and svg names, one upper case.
   */
  it('types the images a Map can use', () => {
    expect(mapImageType('floor.png')).toBe('image/png');
    expect(mapImageType('floor.jpg')).toBe('image/jpeg');
    expect(mapImageType('floor.jpeg')).toBe('image/jpeg');
    expect(mapImageType('floor.gif')).toBe('image/gif');
    expect(mapImageType('network.svg')).toBe('image/svg+xml');
    expect(mapImageType('NETWORK.SVG')).toBe('image/svg+xml');
  });

  /**
   * Verifies: other files, and a name that is only an extension's letters, are not Map images.
   * Data: a .txt, a .pdf, a name with no extension that spells svg.
   */
  it('refuses files that are not Map images', () => {
    expect(mapImageType('notes.txt')).toBeUndefined();
    expect(mapImageType('brief.pdf')).toBeUndefined();
    expect(mapImageType('svg')).toBeUndefined();
  });
});

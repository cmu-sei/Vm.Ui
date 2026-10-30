// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

// The image types a Map can be drawn on, by file extension. Player serves a file it does not know as
// application/octet-stream, so a view file's type comes from its name.
const MAP_IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

/** The image type of a view file a Map can use, or undefined when it is not one. */
export function mapImageType(fileName: string): string | undefined {
  const ext = /\.([^.]+)$/.exec(fileName)?.[1].toLowerCase();
  return ext ? MAP_IMAGE_TYPES[ext] : undefined;
}

// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

export class Clickpoint {
  xPosition?: number;
  yPosition?: number;
  radius?: number;
  urls?: string[];
  id?: string;
  label?: string;
  query?: string; // What the user entered when creating this point.
  multiple?: boolean; // Whether the user used wildcards/range to choose multiple VMs when this point was created

  constructor(
    x: number,
    y: number,
    r: number,
    urls: string[],
    id: string,
    label: string,
    query: string,
    multiple: boolean
  ) {
    this.xPosition = x;
    this.yPosition = y;
    this.radius = r;
    this.urls = urls;
    this.id = id;
    this.label = label;
    this.query = query;
    this.multiple = multiple;
  }
}

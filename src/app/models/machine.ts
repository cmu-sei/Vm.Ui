// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

export class Machine {
    xPosition?: number;
    yPosition?: number;
    radius?: number;
    url?: string;
    id?: string;
    label?: string;

    constructor(x: number, y:number, r:number, url:string, id:string, label: string) {
        this.xPosition = x;
        this.yPosition = y;
        this.radius = r;
        this.url = url;
        this.id = id;
        this.label = label;
    }
}
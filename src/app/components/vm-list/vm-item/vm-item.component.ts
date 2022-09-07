/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ThemeService } from '../../../services/theme/theme.service';
import { VmModel } from '../../../state/vms/vm.model';

@Component({
  selector: 'vm-item',
  templateUrl: './vm-item.component.html',
  styleUrls: ['./vm-item.component.scss'],
})
export class VmItemComponent implements OnInit {
  @Input('vm') vm: VmModel;
  @Input('ipv4Only') ipv4Only: boolean;
  @Input('showIps') showIps: boolean;
  @Output() openVmHere = new EventEmitter<{ [name: string]: string }>();

  constructor(public themeService: ThemeService) {}

  ngOnInit(): void {}

  // Local Component functions
  openInTab(url: string) {
    window.open(url, '_blank');
  }

  openHere($event, vmName: string, url: string) {
    $event.preventDefault();
    const val = <{ [name: string]: string }>{ name: vmName, url };
    this.openVmHere.emit(val);
  }

  public getIpAddresses(vm: VmModel): string[] {
    if (vm.ipAddresses == null) {
      return [];
    }

    if (this.ipv4Only) {
      return vm.ipAddresses.filter((x) => !x.includes(':'));
    } else {
      return vm.ipAddresses;
    }
  }
}
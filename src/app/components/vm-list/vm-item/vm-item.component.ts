/*
Copyright 2022 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { ThemeService } from '../../../services/theme/theme.service';
import {
  MatMenuTrigger,
  MatMenu,
  MatMenuContent,
} from '@angular/material/menu';
import { Team } from '../../../generated/player-api/model/team';
import { Vm, VmsService } from '../../../generated/vm-api';
import { take } from 'rxjs/operators';
import { VmService } from '../../../state/vms/vms.service';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NgTemplateOutlet, NgClass, NgIf, NgFor } from '@angular/common';

export interface Item {
  id: number;
  name: string;
}

@Component({
  selector: 'vm-item',
  templateUrl: './vm-item.component.html',
  styleUrls: ['./vm-item.component.scss'],
  standalone: true,
  imports: [
    NgTemplateOutlet,
    NgClass,
    NgIf,
    MatIcon,
    MatIconButton,
    NgFor,
    MatMenuTrigger,
    MatMenu,
    MatMenuContent,
    MatCheckbox,
  ],
})
export class VmItemComponent implements OnInit {
  @Input() vm: Vm;
  @Input() ipv4Only: Boolean;
  @Input() showIps: Boolean;
  @Input() teamsList: Array<Team>;
  @Input() canManageTeam: Boolean;
  @Output() openVmHere = new EventEmitter<{ [name: string]: string }>();
  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };

  constructor(
    public themeService: ThemeService,
    public vmsService: VmsService,
    public vmService: VmService,
  ) {}

  ngOnInit(): void {}

  // Local Component functions
  openInTab(url: string) {
    window.open(url, '_blank');
  }

  openHere($event, vmName: string, url: string, embeddable: boolean) {
    $event.preventDefault();

    if (embeddable) {
      const val = <{ [name: string]: string }>{ name: vmName, url };
      this.openVmHere.emit(val);
    } else {
      this.openInTab(url);
    }
  }

  onContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menu.focusFirstItem('mouse');
    this.contextMenu.openMenu();
  }

  onTeamSelect(vmId: string, teams: Array<string>, team: string) {
    if (this.isVmOnTeam(teams, team)) {
      // Remove Team
      this.vmsService
        .removeVmFromTeam(vmId, team)
        .pipe(take(1))
        .subscribe(() => {
          this.vmService.GetViewVms(true, false).pipe(take(1)).subscribe();
        });
    } else {
      // Add Team
      this.vmsService
        .addVmToTeam(vmId, team)
        .pipe(take(1))
        .subscribe(() => {
          this.vmService.GetViewVms(true, false).pipe(take(1)).subscribe();
        });
    }
  }

  isVmOnTeam(teams: Array<string>, team: string): boolean {
    const t = teams.find((tm) => tm === team);
    return t !== undefined;
  }

  public getIpAddresses(vm: Vm): string[] {
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

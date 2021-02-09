// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpEventType } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { SelectContainerComponent } from 'ngx-drag-to-select';
import { filter, switchMap, take } from 'rxjs/operators';
import { DialogService } from '../../services/dialog/dialog.service';
import { FileService } from '../../services/file/file.service';
import { TeamsService } from '../../services/teams/teams.service';
import { ThemeService } from '../../services/theme/theme.service';
import { VmModel } from '../../state/vms/vm.model';
import { VmService } from '../../state/vms/vms.service';

@Component({
  selector: 'app-vm-list',
  templateUrl: './vm-list.component.html',
  styleUrls: ['./vm-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VmListComponent implements OnInit, AfterViewInit {
  public vmModelDataSource = new MatTableDataSource<VmModel>(
    new Array<VmModel>()
  );
  public displayedColumns: string[] = ['name'];

  // MatPaginator Output
  public defaultPageSize = 50;
  public pageEvent: PageEvent;
  public uploading = false;
  public uploadProgress = 0;
  public vmApiResponded = true;
  public filterString = '';
  public showIps = false;
  public ipv4Only = true;
  public selectedVms = new Array<string>();

  @ViewChild('paginator') paginator: MatPaginator;
  @ViewChild(SelectContainerComponent)
  selectContainer: SelectContainerComponent;
  @Output() openVmHere = new EventEmitter<{ [name: string]: string }>();
  @Output() errors = new EventEmitter<{ [key: string]: string }>();

  @Input() set vms(val: VmModel[]) {
    this.vmModelDataSource.data = val;
  }

  @Input() readOnly: boolean;

  constructor(
    public vmService: VmService,
    private fileService: FileService,
    private dialogService: DialogService,
    private teamsService: TeamsService,
    public themeService: ThemeService
  ) {}

  ngOnInit() {
    this.pageEvent = new PageEvent();
    this.pageEvent.pageIndex = 0;
    this.pageEvent.pageSize = this.defaultPageSize;

    // Create a filterPredicate that tells the Search to ONLY search on the name column
    this.vmModelDataSource.filterPredicate = (
      data: VmModel,
      filters: string
    ) => {
      const matchFilter = [];
      const filterArray = this.parseSearch(filters);
      const columns = [data.name];
      // Or if you don't want to specify specifics columns =>
      // const columns = (<any>Object).values(data);
      // Main loop
      filterArray.forEach((f) => {
        const customFilter = [];
        columns.forEach((column) => {
          // If the term is negated we want to not consider VMs containing that term
          // so consider it a match when a VM does not contain it.

          switch (f.kind) {
            case SearchOperator.Negate: 
              customFilter.push(!column.toLowerCase().includes(f.value[0]));
              break;
            case SearchOperator.Or:
              const truthVal = f.value.some(tok => column.toLowerCase().includes(tok));
              customFilter.push(truthVal);
              break;
            case SearchOperator.Exact:
              // Consider all terms that were in quotes as one term to match
              const term = f.value.join(' ');
              customFilter.push(column.toLowerCase().includes(term));
              break
            default:
              customFilter.push(column.toLowerCase().includes(f.value[0]))
          }
        });

        data.ipAddresses.forEach((address) => {

          switch(f.kind) {
            case SearchOperator.Negate:
              customFilter.push(!address.toLowerCase().includes(f.value[0]));
              break;
            case SearchOperator.Or:
              const truthVal = f.value.some(tok => address.toLowerCase().includes(tok));
              customFilter.push(truthVal);
              break;
            case SearchOperator.Exact:
              // Same behavior as exact match for names
              const term = f.value.join(' ');
              customFilter.push(address.toLowerCase().includes(term));
              break;
            default:
              customFilter.push(address.toLowerCase().includes(f.value[0]));
          }
        });

        matchFilter.push(customFilter.some(Boolean)); // OR
      });
      return matchFilter.every(Boolean); // AND
    };

    this.vmService
      .GetViewVms(true, false)
      .pipe(take(1))
      .subscribe(
        () => {
          this.vmApiResponded = true;
        },
        (error) => {
          console.log('The VM API is not responding.  ' + error.message);
          this.vmApiResponded = false;
        }
      );
  }

  ngAfterViewInit() {
    this.vmModelDataSource.paginator = this.paginator;
  }

  onPage(pageEvent) {
    this.pageEvent = pageEvent;
    this.selectContainer.clearSelection();
  }

  /**
   * Called by UI to add a filter to the vmModelDataSource
   * @param filterValue
   */
  applyFilter(filterValue: string) {
    this.pageEvent.pageIndex = 0;
    filterValue = filterValue.toLowerCase(); // MatTableDataSource defaults to lowercase matches
    this.filterString = filterValue;
    this.vmModelDataSource.filter = filterValue;
  }

  /**
   * Clears the search string
   */
  clearFilter() {
    this.applyFilter('');
  }

  // Local Component functions
  openInTab(url: string) {
    window.open(url, '_blank');
  }

  openHere($event, vmName: string, url: string) {
    $event.preventDefault();
    const val = <{ [name: string]: string }>{ name: vmName, url };
    this.openVmHere.emit(val);
  }

  uploadIso(fileSelector) {
    if (fileSelector.value === '') {
      console.log('file selector did not have a value');
      return;
    }

    let isAdmin = true;
    this.teamsService
      .GetAllMyTeams(this.vmService.viewId)
      .pipe(take(1))
      .subscribe((teams) => {
        // There should only be 1 primary member, set that value for the current login
        // Determine if the user is an "Admin" if their isPrimary team has canManage == true
        const myPrimaryTeam = teams.filter((t) => t.isPrimary)[0];
        if (myPrimaryTeam !== undefined) {
          isAdmin = myPrimaryTeam.canManage;
        } else {
          isAdmin = false;
          console.log('User does not have a primary team');
        }

        const qf = fileSelector.files[0];

        if (isAdmin) {
          // First prompt the user to confirm if the iso is available for the team or the entire view
          this.dialogService
            .confirm(
              'Upload iso for?',
              'Please choose if you want this iso to be public or for your team only:',
              { buttonTrueText: 'Public', buttonFalseText: 'My Team Only' }
            )
            .pipe(take(1))
            .subscribe((result) => {
              if (result['wasCancelled'] === false) {
                const isForAll = result['confirm'];
                this.sendIsoFile(isForAll, qf);
              }
            });
        } else {
          // The user is not an admin therfore iso's are only uploaded for the team
          this.sendIsoFile(false, qf);
        }
        fileSelector.value = '';
      });
  }

  sendIsoFile(isForAll: boolean, file: File) {
    this.uploading = true;
    this.fileService.uploadIso(isForAll, file).subscribe(
      (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const percentDone = Math.round((100 * event.loaded) / event.total);
          this.uploadProgress = percentDone;
        }

        if (event.type === HttpEventType.Response) {
          this.uploading = false;
        }
      },
      (err) => {
        console.log(err);
        this.uploading = false;
      }
    );
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

  public powerOffSelected() {
    this.performAction(VmAction.PowerOff, 'Power Off', 'power off');
  }

  public powerOnSelected() {
    this.performAction(VmAction.PowerOn, 'Power On', 'power on');
  }

  public shutdownSelected() {
    this.performAction(VmAction.Shutdown, 'Shutdown', 'shutdown');
  }

  private performAction(action: VmAction, title: string, actionName: string) {
    this.dialogService
      .confirm(
        `${title}`,
        `Are you sure you want to ${actionName} ${this.selectedVms.length} selected machines?`,
        { buttonTrueText: 'Confirm' }
      )
      .pipe(
        filter((result) => result.wasCancelled === false),
        switchMap(() => {
          this.errors.emit({});

          switch (action) {
            case VmAction.PowerOff:
              return this.vmService.powerOff(this.selectedVms);
            case VmAction.PowerOn:
              return this.vmService.powerOn(this.selectedVms);
            case VmAction.Shutdown:
              return this.vmService.shutdown(this.selectedVms);
          }
        }),
        take(1)
      )
      .subscribe((x) => {
        this.errors.emit(x.errors);
      });
  }

  public trackByVmId(item) {
    return item.id;
  }

  private parseSearch(search: string) {
    let parsed = new Array<SearchTerm>();
    const tokens = search.split(' ');
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];      

      // Negation is urnary and appears in the same token as the term it negates
      // We don't consider a lone '-' as a negation. Lone operators are ignored because
      // the user is probably about to type something to apply the operator to and we 
      // don't want to prematurely hide any VMs
      if (token.startsWith('-') && token.length > 1) {
        const term = new SearchTerm(SearchOperator.Negate, [token.substring(1)]);
        parsed.push(term);
      } else if (token.length == 1) {
        // This is a lone urnary operator - currently just means a lone '-' character
        // ignore it so we don't discard matches that don't contain a literal '-' char
        continue;
      } else if (token.startsWith('\"')) {
        // Exact match - find all tokens wrapped by quotes and consider them a single term
        let term = new SearchTerm(SearchOperator.Exact, [token.replace('\"', '')]);
        let j = i + 1; // Needs to be scoped outside of loop
        for (; j < tokens.length; j++) {
          const curr = tokens[j];
          if (curr.endsWith('\"')) {
            term.value.push(curr.replace('\"', ''));
            break;
          }
          term.value.push(curr);
        }
        i = j + 1;
        parsed.push(term);
      } else {
        // This term has not been modified by an urnary operator but we still need to check for binary operators
        // which is currently just OR - search has AND behavior by default, no need for an AND operator
        
        // Normal token
        if (i >= tokens.length - 1 || !this.isBinOp(tokens[i + 1])) {
          const term = new SearchTerm(SearchOperator.None, [token]);
          parsed.push(term);
        } else if (this.isBinOp(tokens[i + 1])) {
          // A binary operator is being applied
          const lower = tokens[i + 1].toLowerCase();
          if (lower == 'or') {
            // Look ahead to find any other ORs
            let term = new SearchTerm(SearchOperator.Or, [token]);
            let j = i + 1;
            for (; j < tokens.length; j+=2) {
              if (tokens[j].toLowerCase() == 'or') {
                if (j + 1 > tokens.length - 1) {
                  break;
                }
                term.value.push(tokens[j + 1]);
              } else {
                break;
              }
            }
            // We need to skip over the terms that we considered while looking ahead or they will be double counted
            i = j - 1;
            parsed.push(term);
          }
        }
      }
    }

    console.log('Parsed:')
    console.log(parsed);
    return parsed;
  }

  private isBinOp(tok: string): boolean {
    const lower = tok.toLowerCase();
    return lower == 'or';
  }
}


enum VmAction {
  PowerOn,
  PowerOff,
  Shutdown,
}

enum SearchOperator {
  Exact,
  Or,
  Negate,
  None, // Just a regular search term
}

class SearchTerm {
  kind: SearchOperator
  value: string[]

  constructor(kind: SearchOperator, value: string[]) {
    this.kind = kind;
    this.value = value;
  }
}
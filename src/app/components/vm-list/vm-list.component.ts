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
import { Observable, of } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';
import { Team, TeamService } from '../../generated/player-api';
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
  public selectedVms = new Array<VmModel>();
  public sortByTeams = false;
  public groupByTeams = new Array<{team: string, vms: VmModel[]}>();
  public onAdminTeam: Observable<boolean>;
  public numColumns = 1;

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
    public themeService: ThemeService,
    private playerTeamService: TeamService
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
      const name = data.name;
      // Or if you don't want to specify specifics columns =>
      // const columns = (<any>Object).values(data);
      // Main loop
      filterArray.forEach((f) => {
        const customFilter = [];
        switch (f.kind) {
          // If the term is negated we want to not consider VMs containing that term
          // so consider it a match when a VM does not contain it.
          case SearchOperator.Negate:
            customFilter.push(!name.toLowerCase().includes(f.value[0]));
            break;
          case SearchOperator.Or:
            const truthVal = f.value.some((tok) =>
              name.toLowerCase().includes(tok)
            );
            customFilter.push(truthVal);
            break;
          case SearchOperator.Exact:
            // Consider all terms that were in quotes as one term to match
            const term = f.value.join(' ');
            customFilter.push(name.toLowerCase().includes(term));
            break;
          default:
            customFilter.push(name.toLowerCase().includes(f.value[0]));
        }

        data.ipAddresses.forEach((address) => {
          switch (f.kind) {
            case SearchOperator.Negate:
              // Using this operator on IP addresses causues issues, so just ignore it
              break;
            case SearchOperator.Or:
              const truthVal = f.value.some((tok) =>
                address.toLowerCase().includes(tok)
              );
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
    
    this.onAdminTeam = this.playerTeamService.getMyViewTeams(this.vmService.viewId).pipe(
      switchMap((teams: Team[]) => {
        return of(teams.some(t => t.permissions.some(p => p.key == 'ViewAdmin')))
      })
    )
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
    this.filterString = filterValue;
    this.vmModelDataSource.filter = filterValue.toLowerCase();
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

  // TODO:
  // Improve styling (should talk to ryan)
  // Let user choose number of columns to display
  sortChanged(checked: boolean): void {
    this.sortByTeams = checked;
    if (checked) {
      this.groupByTeams = new Array<{team: string, vms: VmModel[]}>();

      const teams = new Set<string>();
      for (const vm of this.vmModelDataSource.filteredData) {
        vm.teamIds.map(id => teams.add(id));
      }

      this.paginator.length = 0;
      for (const team of teams) {
        // Call API to get the name of the current team given its id
        this.playerTeamService.getTeam(team).subscribe(data => {
          const vms = this.vmModelDataSource.filteredData.filter(vm => vm.teamIds.includes(team));
          this.paginator.length += vms.length;
          this.groupByTeams.push({
            team: data.name,
            vms: vms
          });
        })
      }

      console.log('Grouped by team ID:');
      console.log(this.groupByTeams);
    } else {
      this.paginator.length = this.vmModelDataSource.filteredData.length;
    }
  }

  /**
   * Returns whether a particular VM should be displayed on the current page. Used when sorting VMs by team.
   * @param i the index of the current group
   * @param j the index of the current VM within the current group
   */
  shouldBeOnPage(i: number, j: number): boolean {
    // Get how many VMs have been displayed in previous groups
    let alreadyRendered = 0;
    this.groupByTeams.slice(0, i).map(group => {
      alreadyRendered += group.vms.length;
    })

    // The current VM's index relative to the page size. add one to account for 0-based indexing
    const currentPos = alreadyRendered + j + 1;

    // Returns true if the current VM should be on this page. 
    // Basically, a VM should be on this page if its index is too high for the previous page but too low for the next page
    // More formally: n = 0-based page index m = page size. true if: n * m < currentPos <= (n + 1) * m
    return currentPos <= (this.paginator.pageIndex + 1) * this.paginator.pageSize && currentPos > this.paginator.pageIndex * this.paginator.pageSize;
  }

  /**
   * Returns whether a particular group (team) header should be displayed
   * @param i the index of the current group
   */
  shouldShowHeader(i: number) {
    const numVMs = this.groupByTeams[i].vms.length;
    
    // Two cases - we are either beginning to display this team's VMs on the current case 
    // OR it was cut off and we need to finish displaying the VMs on this page
    return this.shouldBeOnPage(i, 0) || this.shouldBeOnPage(i, numVMs - 1);
  }

  /**
   * Returns the sorted version of the VMs grouped by their team.
   * Sorted alphabetically on team name
   */
  sortedGroups() {
    return this.groupByTeams.sort((a, b) => a.team.localeCompare(b.team));
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
              return this.vmService.powerOff(this.selectedVms.map(vm => vm.id));
            case VmAction.PowerOn:
              return this.vmService.powerOn(this.selectedVms.map(vm => vm.id));
            case VmAction.Shutdown:
              return this.vmService.shutdown(this.selectedVms.map(vm => vm.id));
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

  /**
   * Open the selected VMs in Player tabs
   */
  public openSelectedHere() {
    for (const vm of this.selectedVms) {
      const vmName = vm.name;
      const url = vm.url;
      const val = <{ [name: string]: string }>{ name: vmName, url };
      this.openVmHere.emit(val);
    }
  }

  /**
   * Open the selected VMs in browser tabs
   */
  public openSelectedBrowser() {
    for (const vm of this.selectedVms) {
      window.open(vm.url, '_blank');
    }
  }
 
  /*
    Operator behaviors:
    Negation: get search results that don't include this term. Example foo -bar
    Or: A boolean or. Get results that include 1 or more terms that have been or'd. Example: foo or bar or boz
    Exact: Get results where this exact term appears. Example: "abc 123"
    There is no and operator because that is the default behavior. ie foo bar is logically equivalent to foo and bar
    keywords/operations can be escaped with \, no need to do so inside quotes though
  */
  private parseSearch(search: string) {
    let parsed = new Array<SearchTerm>();
    const tokens = search.split(' ');
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Negation is unary and appears in the same token as the term it negates
      // We don't consider a lone '-' as a negation. Lone operators are ignored because
      // the user is probably about to type something to apply the operator to and we
      // don't want to prematurely hide any VMs
      if (token.startsWith('-') && token.length > 1) {
        const term = new SearchTerm(SearchOperator.Negate, [
          token.substring(1),
        ]);
        parsed.push(term);
      } else if (token.length == 1) {
        // This is a lone unary operator - currently just means a lone '-' character
        // ignore it so we don't discard matches that don't contain a literal '-' char
        continue;
      } else if (token.startsWith('"')) {
        // Exact match - find all tokens wrapped by quotes and consider them a single term
        const [term, newIndex] = this.parseExactMatch(i, tokens);
        i = newIndex;
        parsed.push(term);
      } else {
        // This term has not been modified by an unary operator but we still need to check for binary operators
        // which is currently just OR - search has AND behavior by default, no need for an AND operator

        // Normal token
        if (i >= tokens.length - 1 || !this.isBinOp(tokens[i + 1])) {
          let term: SearchTerm;
          this.isEscaped(tokens[i])
            ? (term = new SearchTerm(SearchOperator.None, [token.substr(1)]))
            : (term = new SearchTerm(SearchOperator.None, [token]));
          parsed.push(term);
        } else if (this.isBinOp(tokens[i + 1])) {
          // A binary operator is being applied
          const [term, newIndex] = this.parseBinaryOp(i, tokens);
          i = newIndex;
          parsed.push(term);
        }
      }
    }
    return parsed;
  }

  private isBinOp(tok: string): boolean {
    const lower = tok.toLowerCase();
    return lower == 'or';
  }

  private isEscaped(tok: string): boolean {
    return tok.startsWith('\\');
  }

  /**
   * Parse an expression with a binary operator
   * @param i the current index into tokens
   * @param tokens the list of tokens
   */
  private parseBinaryOp(i: number, tokens: string[]): [SearchTerm, number] {
    const token = tokens[i];
    const lower = tokens[i + 1].toLowerCase();
    let term: SearchTerm;
    if (lower == 'or') {
      // Look ahead to find any other ORs
      term = new SearchTerm(SearchOperator.Or, [token]);
      let j = i + 1;
      for (; j < tokens.length; j += 2) {
        if (tokens[j].toLowerCase() == 'or') {
          if (j + 1 > tokens.length - 1) {
            break;
          }
          const curr = tokens[j + 1];
          if (this.isEscaped(tokens[j + 1])) {
            term.value.push(curr.substr(1));
          } else {
            term.value.push(tokens[j + 1]);
          }
        } else {
          break;
        }
      }
      // We need to skip over the terms that we considered while looking ahead or they will be double counted
      i = j - 1;
    }
    return [term, i];
  }

  private parseExactMatch(i: number, tokens: string[]): [SearchTerm, number] {
    // Replace twice in case this the only quoted token
    const token = tokens[i];
    let term = new SearchTerm(SearchOperator.Exact, [
      token.replace('"', '').replace('"', ''),
    ]);
    if (!token.endsWith('"')) {
      let j = i + 1; // Needs to be scoped outside of loop
      for (; j < tokens.length; j++) {
        const curr = tokens[j];
        if (curr.endsWith('"')) {
          term.value.push(curr.replace('"', ''));
          break;
        }
        term.value.push(curr);
      }
      return [term, j + 1];
    }
    return [term, i + 1];
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
  kind: SearchOperator;
  value: string[];

  constructor(kind: SearchOperator, value: string[]) {
    this.kind = kind;
    this.value = value;
  }
}

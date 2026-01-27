// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpEventType } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { MatCheckboxChange, MatCheckbox } from '@angular/material/checkbox';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import {
  SelectContainerComponent,
  DragToSelectModule,
} from 'ngx-drag-to-select';
import { combineLatest, Observable, of } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { Team, TeamService } from '../../generated/player-api';
import {
  AppTeamPermission,
  AppViewPermission,
  Vm,
} from '../../generated/vm-api';
import { DialogService } from '../../services/dialog/dialog.service';
import { FileService } from '../../services/file/file.service';
import { TeamsService } from '../../services/teams/teams.service';
import { VmUISession } from '../../state/vm-ui-session/vm-ui-session.model';
import { VmService } from '../../state/vms/vms.service';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { VmItemComponent } from './vm-item/vm-item.component';
import { MatTooltip } from '@angular/material/tooltip';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import {
  MatFormField,
  MatLabel,
  MatPrefix,
  MatSuffix,
} from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatButton, MatIconButton } from '@angular/material/button';
import { NgIf, NgFor, AsyncPipe, SlicePipe } from '@angular/common';
import { UserPermissionsService } from '../../services/permissions/user-permissions.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-vm-list',
  templateUrl: './vm-list.component.html',
  styleUrls: ['./vm-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgIf,
    MatButton,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatFormField,
    MatLabel,
    MatInput,
    ReactiveFormsModule,
    FormsModule,
    MatPrefix,
    MatIconButton,
    MatSuffix,
    MatCheckbox,
    MatSelect,
    MatOption,
    DragToSelectModule,
    NgFor,
    MatTooltip,
    VmItemComponent,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatPaginator,
    AsyncPipe,
    SlicePipe,
  ],
})
export class VmListComponent implements OnInit, OnChanges, AfterViewInit {
  public vmModelDataSource = new MatTableDataSource<Vm>(new Array<Vm>());
  public displayedColumns: string[] = ['name'];

  // MatPaginator Output
  public defaultPageSize = 50;
  public pageEvent: PageEvent;
  public uploading = false;
  public uploadProgress = 0;
  public vmApiResponded = true;
  public filterString = '';
  public showIps: Boolean = false;
  public ipv4Only: Boolean = true;
  public selectedVms = new Array<string>();
  public sortByTeams = false;
  public groupByTeams = new Array<VmGroup>();
  public currentPanelIndex: number;

  @ViewChildren('groupPaginators') groupPaginators =
    new QueryList<MatPaginator>();
  @ViewChild('paginator') paginator: MatPaginator;
  @ViewChildren('groupSelectContainers') groupSelects =
    new QueryList<SelectContainerComponent>();
  @ViewChild('selectContainer') selectContainer: SelectContainerComponent;

  @Output() openVmHere = new EventEmitter<{ [name: string]: string }>();
  @Output() errors = new EventEmitter<{ [key: string]: string }>();

  @Input() set vms(val: Vm[]) {
    this.vmModelDataSource.data = val;
    this.allVms = val;
  }

  @Input() readOnly: Boolean;

  @Input() set uiSession(val: VmUISession) {
    if (val) {
      this.applyFilter(val.searchValue);
      this.showIps = val.showIPsSelected;
      this.ipv4Only = val.showIPv4OnlySelected;
    }
  }

  @Input() canViewView: Boolean;
  @Input() canManageView: Boolean;

  @Output() showIPsSelectedChanged = new EventEmitter<Boolean>();
  @Output() showIPv4OnlySelectedChanged = new EventEmitter<Boolean>();
  @Output() searchValueChanged = new EventEmitter<string>();

  teamsList$: Observable<Team[]> = of([]);

  allVms: Vm[];
  vmFilterBy: any = 'All';
  private hasLoadedVms = false;

  canUploadTeamIsos$ = this.userPermissionsService.can(
    null,
    null,
    true,
    AppTeamPermission.UploadTeamIsos,
  );

  canUploadViewIsos$ = this.userPermissionsService.can(
    null,
    null,
    true,
    null,
    AppViewPermission.UploadViewIsos,
  );

  canRevertVms$ = this.userPermissionsService.can(
    null,
    null,
    true,
    null,
    AppViewPermission.RevertVms,
  );

  canUploadViewIsos = toSignal(this.canUploadViewIsos$);

  canUploadIsos$ = combineLatest([
    this.canUploadTeamIsos$,
    this.canUploadViewIsos$,
  ]).pipe(map(([x, y]) => x || y));

  constructor(
    public vmService: VmService,
    private fileService: FileService,
    private dialogService: DialogService,
    private teamsService: TeamsService,
    private playerTeamService: TeamService,
    private cd: ChangeDetectorRef,
    private userPermissionsService: UserPermissionsService,
  ) {
    this.pageEvent = new PageEvent();
    this.pageEvent.pageIndex = 0;
    this.pageEvent.pageSize = this.defaultPageSize;
  }

  ngOnInit() {
    // Create a filterPredicate that tells the Search to ONLY search on the name column
    this.vmModelDataSource.filterPredicate = (data: Vm, filters: string) => {
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
              name.toLowerCase().includes(tok),
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
                address.toLowerCase().includes(tok),
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
  }

  ngOnChanges(changes: SimpleChanges) {
    // Initialize VMs once when canViewView is first set
    if (changes.canViewView) {
      if (!this.hasLoadedVms && this.canViewView != null) {
        this.hasLoadedVms = true;

        if (this.canViewView) {
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
              },
            );
        } else {
          this.userPermissionsService
            .getPrimaryTeamId(this.vmService.viewId)
            .pipe(
              filter((teamId) => teamId !== undefined),
              switchMap((primaryTeamId) =>
                this.vmService.GetTeamVms(true, false, primaryTeamId),
              ),
              take(1),
            )
            .subscribe(
              () => {
                this.vmApiResponded = true;
              },
              (error) => {
                console.log('The VM API is not responding.  ' + error.message);
                this.vmApiResponded = false;
              },
            );
        }
      }

      if (this.canViewView) {
        this.teamsList$ = this.playerTeamService.getViewTeams(
          this.vmService.viewId,
        );
      }
    }
  }

  ngAfterViewInit() {
    this.vmModelDataSource.paginator = this.paginator;
  }

  onPage(pageEvent) {
    this.pageEvent = pageEvent;
    if (!this.sortByTeams) {
      this.selectContainer.clearSelection();
    } else {
      this.groupSelects.get(this.currentPanelIndex).clearSelection();
    }
  }

  /**
   * Called by UI to add a filter to the vmModelDataSource
   * @param filterValue
   */
  applyFilter(filterValue: string) {
    this.pageEvent.pageIndex = 0;
    this.filterString = filterValue;
    this.vmModelDataSource.filter = filterValue.toLowerCase();
    if (!this.sortByTeams) {
      this.selectContainer?.clearSelection();
    } else {
      this.filterGroups();
      this.groupSelects.get(this.currentPanelIndex).clearSelection();
    }
    this.searchValueChanged.emit(filterValue);
  }

  /**
   * Called by UI to filter by Power state
   */
  applyFilterByPower() {
    if (this.vmFilterBy === 'All') {
      // Show all
      this.vmModelDataSource.data = this.allVms;
    } else if (this.vmFilterBy === 'Snapshots') {
      this.vmModelDataSource.data = this.allVms.filter((vm) => vm.hasSnapshot);
    } else {
      this.vmModelDataSource.data = this.allVms.filter(
        (vm) => vm.powerState.toString() === this.vmFilterBy,
      );
    }
  }

  /**
   * Clears the search string
   */
  clearFilter() {
    this.applyFilter('');
  }

  openHere($event) {
    this.openVmHere.emit($event);
  }

  uploadIso(fileSelector) {
    if (fileSelector.value === '') {
      console.log('file selector did not have a value');
      return;
    }

    const qf = fileSelector.files[0];

    if (this.canUploadViewIsos()) {
      // First prompt the user to confirm if the iso is available for the team or the entire view
      this.dialogService
        .confirm(
          'Upload iso for?',
          'Please choose if you want this iso to be public or for your team only',
          { buttonTrueText: 'Public', buttonFalseText: 'My Team Only' },
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
  }

  sendIsoFile(isForAll: boolean, file: File) {
    this.uploading = true;
    this.fileService.uploadIso(isForAll, file).subscribe(
      (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress = Math.round((100 * event.loaded) / event.total);
          this.cd.detectChanges();
        }

        if (event.type === HttpEventType.Response) {
          this.uploading = false;
          this.cd.detectChanges();
          this.dialogService.message('Upload Completed Successfully', '');
        }
      },
      (err) => {
        console.log(err);
        this.uploading = false;
        this.cd.detectChanges();
        this.dialogService.message('Upload Failed', 'Error: ' + err);
      },
    );
  }

  /**
   * Split the VMs up into groups by their teams.
   */
  groupVms(): void {
    const teams = new Set<string>();
    for (const vm of this.vmModelDataSource.filteredData) {
      vm.teamIds.map((id) => teams.add(id));
    }

    this.playerTeamService
      .getViewTeams(this.vmService.viewId)
      .subscribe((results) => {
        for (const team of results) {
          if (teams.has(team.id)) {
            const vms = this.vmModelDataSource.filteredData.filter((vm) =>
              vm.teamIds.includes(team.id),
            );
            const group = new VmGroup(team.name, team.id, vms);
            this.groupByTeams.push(group);

            this.groupByTeams.sort((a, b) => a.team.localeCompare(b.team));
            this.cd.markForCheck();
          }
        }
      });
  }

  /**
   * Filter the groups according to the current search term
   */
  filterGroups() {
    for (const group of this.groupByTeams) {
      group.dataSource.data = [];
    }

    this.vmModelDataSource.filteredData.map((vm) => {
      const teamIds = vm.teamIds;
      for (const team of teamIds) {
        const group = this.groupByTeams.find((g) => g.tid === team);
        group.dataSource.data.push(vm);
      }
    });
  }

  toggleSort() {
    this.sortByTeams = !this.sortByTeams;
    // If we haven't already, group the VMs by team
    if (this.groupByTeams.length === 0) {
      this.groupVms();
    }
  }

  setCurrentPanel(index: number) {
    this.currentPanelIndex = index;
  }

  panelClicked(index: number) {
    // The index has changed, so the user clicked a new panel. Clear the old drag to select selection
    if (index !== this.currentPanelIndex) {
      this.groupSelects.toArray()[this.currentPanelIndex].clearSelection();
      this.currentPanelIndex = index;
    }
  }

  // Assign each VM group a paginator
  assignPaginator(group: VmGroup, index: number) {
    group.dataSource.paginator = this.groupPaginators.toArray()[index];
  }

  public powerOffSelected() {
    this.performAction(VmAction.PowerOff, 'Power Off', 'power off');
  }

  public powerOnSelected() {
    this.performAction(VmAction.PowerOn, 'Power On', 'power on');
  }

  public rebootSelected() {
    this.performAction(VmAction.Reboot, 'Reboot', 'reboot');
  }

  public shutdownSelected() {
    this.performAction(VmAction.Shutdown, 'Shutdown', 'shutdown');
  }

  public revertSelected() {
    this.performAction(VmAction.Revert, 'Revert', 'revert');
  }

  private performAction(action: VmAction, title: string, actionName: string) {
    this.dialogService
      .confirm(
        `${title}`,
        `Are you sure you want to ${actionName} ${this.selectedVms.length} selected machines?`,
        { buttonTrueText: 'Confirm' },
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
            case VmAction.Reboot:
              return this.vmService.reboot(this.selectedVms);
            case VmAction.Revert:
              return this.vmService.revert(this.selectedVms);
          }
        }),
        take(1),
      )
      .subscribe((x) => {
        this.errors.emit(x.errors);
      });
  }

  public trackByVmId(item) {
    return item.id;
  }

  getVm(id: string): Vm {
    return this.vmModelDataSource.data.find((x) => x.id === id);
  }

  /**
   * Open the selected VMs in Player tabs
   */
  public openSelectedHere() {
    for (const id of this.selectedVms) {
      const vm = this.getVm(id);
      if (vm.embeddable === true) {
        const vmName = vm.name;
        const url = vm.url;
        const val = <{ [name: string]: string }>{ name: vmName, url };
        this.openVmHere.emit(val);
      }
    }
  }

  /**
   * Open the selected VMs in browser tabs
   */
  public openSelectedBrowser() {
    for (const id of this.selectedVms) {
      const vm = this.getVm(id);
      window.open(vm.url, '_blank');
    }
  }

  public clearSelections() {
    this.dialogService
      .confirm(
        `Clear Selections`,
        `Are you sure you want to clear your selections?`,
        { buttonTrueText: 'Confirm' },
      )
      .pipe(filter((result) => result.wasCancelled === false))
      .subscribe(() => {
        this.selectContainer.clearSelection();
        this.selectedVms.length = 0;
        this.cd.markForCheck();
      });
  }

  shouldDisableSelect(vm: Vm) {
    return vm.powerState.toString() === 'Unknown' ? undefined : vm;
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
    const parsed = new Array<SearchTerm>();
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
      } else if (this.isUnOp(token)) {
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

  private isUnOp(tok: string): boolean {
    return tok === '-';
  }

  private isBinOp(tok: string): boolean {
    const lower = tok.toLowerCase();
    return lower === 'or';
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
    if (lower === 'or') {
      // Look ahead to find any other ORs
      term = new SearchTerm(SearchOperator.Or, [token]);
      let j = i + 1;
      for (; j < tokens.length; j += 2) {
        if (tokens[j].toLowerCase() === 'or') {
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
    const term = new SearchTerm(SearchOperator.Exact, [
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

  ipv4Clicked(event: MatCheckboxChange) {
    this.showIPv4OnlySelectedChanged.emit(event.checked);
  }

  showIpClicked(event: MatCheckboxChange) {
    this.showIPsSelectedChanged.emit(event.checked);
  }

  getData(datasource: Vm[]): Vm[] {
    // To make type checks happy
    return datasource;
  }
}

enum VmAction {
  PowerOn,
  PowerOff,
  Shutdown,
  Reboot,
  Revert,
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

class VmGroup {
  team: string;
  tid: string;
  dataSource: MatTableDataSource<Vm>;

  constructor(team: string, tid: string, vms: Vm[]) {
    this.team = team;
    this.tid = tid;
    this.dataSource = new MatTableDataSource<Vm>(vms);
  }
}

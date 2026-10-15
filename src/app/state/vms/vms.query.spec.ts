// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { Vm, VmsService } from '../../generated/vm-api';
import { unstubbed } from '../../test-utils/unstubbed';
import { recordEmissions } from '../../test-utils/record-emissions';
import { VmsQuery } from './vms.query';
import { VmsStore } from './vms.store';

function makeVm(id: string, name: string | null, extra: Partial<Vm> = {}): Vm {
  return { id, name, teamIds: ['team-1'], ...extra };
}

// The query injects the generated VmsService but never calls it, so it gets
// the throwing placeholder: a call would fail the test with a clear message.
function createQuery() {
  const store = new VmsStore();
  const vmsApi = unstubbed(VmsService) as { useValue: VmsService };
  const query = new VmsQuery(store, vmsApi.useValue);
  return { store, query };
}

describe('VmsQuery', () => {
  /**
   * Verifies: selectAll sorts VMs by name in natural, case-insensitive order.
   * Interacts with: real VmsStore and VmsQuery (QueryConfig sortBy with string-natural-compare).
   * Data: VMs named vm10, VM2 and vm1 added out of order.
   */
  it('sorts VMs by name naturally and case-insensitively', async () => {
    const { store, query } = createQuery();
    store.set([makeVm('a', 'vm10'), makeVm('b', 'VM2'), makeVm('c', 'vm1')]);

    const names = (await firstValueFrom(query.selectAll())).map((v) => v.name);

    expect(names).toEqual(['vm1', 'VM2', 'vm10']);
  });

  /**
   * Verifies: getAllWithName returns VMs whose name contains the term, ignoring case.
   * Interacts with: real VmsStore and VmsQuery.getAllWithName.
   * Data: three VMs; search term 'WEB' matches web-01 and Web-02 only.
   */
  it('getAllWithName matches a case-insensitive substring of the name', async () => {
    const { store, query } = createQuery();
    store.set([
      makeVm('a', 'web-01'),
      makeVm('b', 'db-01'),
      makeVm('c', 'Web-02'),
    ]);

    const names = (await firstValueFrom(query.getAllWithName('WEB'))).map(
      (v) => v.name,
    );

    expect(names).toEqual(['web-01', 'Web-02']);
  });

  /**
   * Verifies: getAllWithName skips VMs that have no name instead of throwing.
   * Interacts with: real VmsStore and VmsQuery.getAllWithName.
   * Data: one VM with a null name and one named 'a'; empty search term.
   */
  it('getAllWithName leaves out VMs with a null name', async () => {
    const { store, query } = createQuery();
    store.set([makeVm('a', null), makeVm('b', 'a')]);

    const result = await firstValueFrom(query.getAllWithName(''));

    expect(result.map((v) => v.id)).toEqual(['b']);
  });

  /**
   * Verifies: getAllWithName re-emits when a matching VM is added to the store.
   * Interacts with: real VmsStore.add and the getAllWithName stream.
   * Data: store starts with db-01; web-01 is added while subscribed.
   */
  it('getAllWithName emits again when a matching VM arrives', () => {
    const { store, query } = createQuery();
    store.set([makeVm('a', 'db-01')]);
    const emissions = recordEmissions(query.getAllWithName('web'));

    store.add(makeVm('b', 'web-01'));

    expect(emissions.map((list) => list.map((v) => v.name))).toEqual([
      [],
      ['web-01'],
    ]);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMatchStatus } from './match-status.ts';

test('only an explicit running source status can produce a live match', () => {
  for (const requested of ['running', 'upcoming', 'finished'] as const) {
    assert.equal(normalizeMatchStatus('running', requested), 'running');
    assert.equal(normalizeMatchStatus('finished', requested), 'finished');
    assert.equal(normalizeMatchStatus('not_started', requested), 'upcoming');
    for (const status of ['canceled', 'postponed', 'unknown', '', null, undefined]) {
      assert.notEqual(normalizeMatchStatus(status, requested), 'running');
    }
  }
});

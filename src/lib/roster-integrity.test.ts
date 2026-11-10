import test from 'node:test';
import assert from 'node:assert/strict';
import { currentRoster, emptyRoster, isRosterTeam, tournamentRoster } from './roster-integrity.ts';

const player = (id: number, name = `Player ${id}`) => ({ id, name, active: true, image_url: `https://example.com/${id}.png` });
const team = (id = 10, slug = 'league-of-legends', players: unknown[] = [player(1)]) => ({ id, name: 'Fixture team', current_videogame: { slug }, players });
const payload = (...rosters: unknown[]) => ({ type: 'Team', rosters });

test('teams use the documented current_videogame field and exact ID, not organization names', () => {
  assert.ok(isRosterTeam(team(), 10, 'lol'));
  assert.ok(isRosterTeam(team(10, 'lol'), 10, 'lol'));
  assert.ok(isRosterTeam(team(10, 'valorant'), 10, 'valorant'));
  assert.equal(isRosterTeam(team(), 11, 'lol'), false);
  assert.equal(isRosterTeam(team(), 10, 'valorant'), false);
  assert.equal(isRosterTeam(team(10, 'valorant'), 10, 'lol'), false);
  assert.equal(isRosterTeam({ ...team(), videogame: { slug: 'valorant' } }, 10, 'lol'), false);
  assert.equal(isRosterTeam({ id: 10, players: [player(1)] }, 10, 'lol'), false);
  assert.equal(isRosterTeam({ ...team(), current_videogame: null }, 10, 'lol'), false);
});

test('current rosters exclude inactive, mismatched membership, staff and malformed identities', () => {
  const result = currentRoster(team(10, 'league-of-legends', [player(1), player(1), { ...player(2), active: false }, { ...player(3), current_team: { id: 11 } }, { ...player(4), role: 'Assistant Coach' }, { ...player(5), current_team: null }, { ...player(6), current_videogame: { slug: 'valorant' } }, null, { name: 'No ID' }, { id: 7, name: ' ' }, { ...player(8), substitute: true }]), 10, 'lol');
  assert.deepEqual(result.players.map(p => p.id), [1, 8]);
  assert.equal(result.players[1].substitute, true);
  assert.equal(result.omitted, 9);
  assert.equal(result.status, 'available');
});

test('small squads are not filled or labelled a confirmed starting five', () => {
  const result = currentRoster(team(10, 'valorant', [player(1), player(2), player(3)]), 10, 'valorant');
  assert.equal(result.players.length, 3);
  assert.equal(result.scope, 'current');
  assert.equal(result.status, 'available');
});

test('known G2 provider staff/creator conflict is quarantined pending review', () => {
  const result = currentRoster(team(128538, 'valorant', [player(25474, 'shhhack'), player(26196, 'shanks'), player(38787, 'trent')]), 128538, 'valorant');
  assert.equal(result.status, 'under-review');
  assert.deepEqual(result.players, []);
});

test('tournament roster contract chooses exact team and retains historically valid inactive/transferred players', () => {
  const former = { ...player(1), active: false, current_team: { id: 99 }, current_videogame: { slug: 'valorant' } };
  const result = tournamentRoster(payload(team(10, 'league-of-legends', [former]), team(11, 'league-of-legends', [player(2)])), 10, 'lol', 'Tue, 10 Nov 2026 13:00:00 GMT');
  assert.deepEqual(result.players.map(p => p.id), [1]);
  assert.equal(result.sourceDate, '2026-11-10T13:00:00.000Z');
  assert.equal(result.scope, 'tournament');
  assert.equal(result.players[0].image_url, former.image_url);
});

test('Valorant tournament squads are separate from current membership and known current G2 conflict', () => {
  const result = tournamentRoster(payload(team(128538, 'valorant', [player(38787, 'trent')])), 128538, 'valorant');
  assert.equal(result.status, 'available');
  assert.equal(result.players[0].name, 'trent');
});

test('missing, wrong-game, ambiguous or malformed tournament data fails closed without a current-team fallback', () => {
  for (const value of [null, [], {}, { type: 'Player', rosters: [team()] }, { type: 'Team', rosters: null }, payload(team(11)), payload(team(10, 'valorant')), payload(team(), team()), payload({ ...team(), players: null })]) {
    assert.equal(tournamentRoster(value, 10, 'lol').status, 'unavailable');
    assert.deepEqual(tournamentRoster(value, 10, 'lol').players, []);
  }
  const value = payload(team(10), team(11));
  assert.deepEqual(tournamentRoster(value, 10, 'lol').players, []);
  assert.deepEqual(tournamentRoster(value, 11, 'lol').players, []);
});

test('identity matching never merges portraits by nickname or synthesizes missing people', () => {
  const result = tournamentRoster(payload(team(10, 'valorant', [player(1, 'Same name'), player(2, 'Same name'), { id: 3, name: 'No portrait', image_url: 'javascript:invalid' }])), 10, 'valorant');
  assert.deepEqual(result.players.map(p => p.image_url), ['https://example.com/1.png', 'https://example.com/2.png', undefined]);
  assert.equal(emptyRoster('tournament', 'invalid date').sourceDate, null);
});

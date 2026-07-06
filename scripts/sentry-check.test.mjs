import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterActionable, buildPrompt } from './sentry-check.mjs';

const NOW = Date.now();
const RECENT = new Date(NOW - 1 * 60 * 60 * 1000).toISOString();  // 1h ago
const OLD    = new Date(NOW - 48 * 60 * 60 * 1000).toISOString(); // 48h ago

test('filterActionable — incluye issue nuevo (< 24h)', () => {
  const issues = [{ id: '1', firstSeen: RECENT, count: '1', status: 'unresolved' }];
  assert.equal(filterActionable(issues).length, 1);
});

test('filterActionable — incluye issue escalando (count >= 5, unresolved)', () => {
  const issues = [{ id: '2', firstSeen: OLD, count: '10', status: 'unresolved' }];
  assert.equal(filterActionable(issues).length, 1);
});

test('filterActionable — excluye issue viejo sin escalar', () => {
  const issues = [{ id: '3', firstSeen: OLD, count: '2', status: 'unresolved' }];
  assert.equal(filterActionable(issues).length, 0);
});

test('filterActionable — excluye issue resolved aunque count sea alto', () => {
  const issues = [{ id: '4', firstSeen: OLD, count: '100', status: 'resolved' }];
  assert.equal(filterActionable(issues).length, 0);
});

test('filterActionable — count exactamente 5 es escalando', () => {
  const issues = [{ id: '5', firstSeen: OLD, count: '5', status: 'unresolved' }];
  assert.equal(filterActionable(issues).length, 1);
});

test('buildPrompt — contiene ID, título, branch, link, culprit, count y firstSeen', () => {
  const issue = {
    id: 'abc123',
    title: 'TypeError: x is undefined',
    culprit: 'public/js/portal.js:42',
    count: '7',
    firstSeen: RECENT,
    entries: [],
  };
  const prompt = buildPrompt(issue, 'afusamut');
  assert.ok(prompt.includes('SENTRY-abc123'), 'debe incluir ID');
  assert.ok(prompt.includes('TypeError: x is undefined'), 'debe incluir título');
  assert.ok(prompt.includes('claude/fix-SENTRY-abc123'), 'debe incluir nombre de branch');
  assert.ok(prompt.includes('sentry.io/organizations/afusamut/issues/abc123'), 'debe incluir link');
  assert.ok(prompt.includes('public/js/portal.js:42'), 'debe incluir culprit');
  assert.ok(prompt.includes('7'), 'debe incluir count');
  assert.ok(prompt.includes(RECENT), 'debe incluir firstSeen');
});

test('buildPrompt — maneja entries vacíos sin stack trace', () => {
  const issue = {
    id: 'xyz',
    title: 'Error sin stack',
    culprit: '',
    count: '3',
    firstSeen: RECENT,
    entries: [],
  };
  const prompt = buildPrompt(issue, 'afusamut');
  assert.ok(prompt.includes('stack trace no disponible'));
});

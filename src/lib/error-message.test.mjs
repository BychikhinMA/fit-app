import assert from 'node:assert/strict';
import { test } from 'node:test';

import { errorMessage } from './error-message.ts';

test('ошибка Supabase (обычный объект) даёт её message, а не «[object Object]»', () => {
  const postgrestError = { message: 'TypeError: Failed to fetch', details: 'stack…', hint: '', code: '' };
  assert.equal(errorMessage(postgrestError, 'fallback'), 'TypeError: Failed to fetch');
});

test('без message берётся details, без обоих — fallback', () => {
  assert.equal(errorMessage({ message: '', details: 'row not found' }, 'fallback'), 'row not found');
  assert.equal(errorMessage({}, 'fallback'), 'fallback');
  assert.equal(errorMessage(null, 'fallback'), 'fallback');
});

test('обычный Error и строка', () => {
  assert.equal(errorMessage(new Error('boom'), 'fallback'), 'boom');
  assert.equal(errorMessage('plain', 'fallback'), 'plain');
});

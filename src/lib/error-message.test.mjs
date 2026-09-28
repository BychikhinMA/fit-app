import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AuthApiError, AuthRetryableFetchError, AuthWeakPasswordError } from '@supabase/auth-js';

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

test('ошибки Supabase Auth переводятся на русский по коду', () => {
  const wrongPassword = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');
  assert.equal(errorMessage(wrongPassword, 'fallback'), 'Неверный email или пароль.');
  const taken = new AuthApiError('User already registered', 422, 'user_already_exists');
  assert.equal(errorMessage(taken, 'fallback'), 'Пользователь с таким email уже зарегистрирован.');
  const weak = new AuthWeakPasswordError('Password should be at least 6 characters.', 422, ['length']);
  assert.equal(errorMessage(weak, 'fallback'), 'Слишком простой пароль — возьми длиннее и сложнее.');
});

test('сетевой сбой Auth — отдельный понятный текст', () => {
  const offline = new AuthRetryableFetchError('Failed to fetch', 0);
  assert.equal(errorMessage(offline, 'fallback'), 'Нет связи с сервером — проверь интернет и попробуй ещё раз.');
});

test('неизвестный код Auth — исходное сообщение; код Postgrest не путается с Auth', () => {
  const unknown = new AuthApiError('Something new', 400, 'brand_new_code');
  assert.equal(errorMessage(unknown, 'fallback'), 'Something new');
  // Не AuthError, хотя поле code совпадает с кодом Auth — перевода быть не должно.
  assert.equal(errorMessage({ message: 'db says no', code: 'invalid_credentials' }, 'fallback'), 'db says no');
});

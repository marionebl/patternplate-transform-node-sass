const test = require('ava');
const expect = require('unexpected');
const mocks = require('./mocks');
const factory = require('./');

test('it should export a function as default', t => {
  const actual = typeof factory;
  const expected = 'function';
  t.deepEqual(actual, expected);
});

test('calling the function should return a function', t => {
  const actual = typeof factory();
  const expected = 'function';
  t.deepEqual(actual, expected);
});

test('calling the returned function should return a promise', async t => {
  const emptyFile = await mocks.get('empty.sass');
  const transform = factory();
  const actual = transform(emptyFile, null, {}).constructor.name;
  const expected = 'Promise';
  t.deepEqual(actual, expected);
});

test('the returned promise should resolve to an object', async t => {
  const emptyFile = await mocks.get('empty.sass');
  const transform = factory();
  const actual = Object.prototype.toString(await transform(emptyFile, null, {}));
  const expected = '[object Object]';
  t.deepEqual(actual, expected);
});

test('the resolved object should have a buffer key', async t => {
  const emptyFile = await mocks.get('empty.sass');
  const transform = factory();
  const file = await transform(emptyFile, null, {});
  t.truthy(Object.prototype.hasOwnProperty.call(file, 'buffer'));
});

test('transforming a simple sass file', async () => {
  const simple = await mocks.get('simple.sass');
  const transform = factory();
  const file = await transform(simple, null, {});
  expect(file.buffer, 'to be', simple.buffer);
});

test('transforming a simple scss file', async () => {
  const simple = await mocks.get('simple.scss');
  const transform = factory();
  const file = await transform(simple, null, {});
  expect(file.buffer, 'to be', simple.buffer);
});

test('transforming a sass file with dependencies', async () => {
  const file = await mocks.get('dependent.sass');
  const transform = factory();
  const result = await transform(file, null, {});
  const expected = '.dependency {\n  color: red; }\n\n.dependent {\n  color: green; }\n';
  expect(result.buffer.toString(), 'to be', expected);
});

test('transforming a scss file with npm dependencies', async () => {
  const file = await mocks.get('npm-dependent.scss');
  const transform = factory();
  const result = await transform(file, null, {});
  const actual = result.buffer.toString();
  expect(actual, 'to contain', '/*! normalize-scss | MIT/GPLv2 License | bit.ly/normalize-scss */');
  expect(actual, 'to contain', '.dependent {\n  color: green; }');
});

test('transforming a file with missing dependencies', async t => {
  const file = await mocks.get('dependent-missing.sass');
  const transform = factory();
  t.throws(transform(file, null, {}), Error, 'it should throw');
});

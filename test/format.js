const { test } = require('ava');
const JSONParser = require('..');
const format = (...args) => JSONParser.format(...args);

test('format string', t => {
  t.is(format(String.raw`"Hello 世\u754c\""`), String.raw`"Hello 世界\""`);
});

test('format number', t => {
  t.is(format('-1'), '-1');
  t.is(format('0'), '0');
  t.is(format('1'), '1');
  t.is(format('-1.5'), '-1.5');
  t.is(format('-1e5'), '-1e5');
  t.is(format('-1E5'), '-1E5');
  t.is(format('-0.5E5'), '-0.5E5');
  t.is(format('-0.5e+5'), '-0.5e+5');
  t.is(format('-0.5e-5'), '-0.5e-5');
  t.is(format('1234567890'), '1234567890');
});

test('format object', t => {
  t.is(format(String.raw`{"x":1,"y":{"z":2},"u":"v"}`), String.raw`{
  "x": 1,
  "y": {
    "z": 2
  },
  "u": "v"
}`);
});

test('format array', t => {
  t.is(format(String.raw`[1,[2,3],4]`), String.raw`[
  1,
  [
    2,
    3
  ],
  4
]`);
});

test('format true', t => {
  t.is(format('true'), 'true');
});

test('format false', t => {
  t.is(format('false'), 'false');
});

test('format null', t => {
  t.is(format('null'), 'null');
});

'use strict';

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const child_process = Promise.promisifyAll(require('child_process'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));
const readline = require('readline');
const JSONStream = require('JSONStream');
const path = require('path');
const config = require('./config').config;

async function rmrfAsync(dir) {
  await child_process.execFileAsync('rm', ['-rf', dir]);
}

async function copyAsync(inFile, outFile) {
  await new Promise((accept, reject) => {
    const input = fs.createReadStream(inFile);
    input.on('error', reject);
    const output = fs.createWriteStream(outFile);
    output.on('error', reject);
    output.on('finish', accept);
    input.pipe(output);
  });
}

function toMap(arr, value = false) {
  const map = new Map();
  arr.forEach(x => map.set(x, value));
  return map;
}

function readlines(file) {
  return new Promise((accept, reject) => {
    const lines = [];
    const stream = fs.createReadStream(file);
    readline.createInterface({
      input: stream
    }).on('line', line => {
      if (line.length > 0) {
        lines.push(line);
      }
    });
    stream
      .on('end', () => accept(lines))
      .on('error', reject);
  });
}

function jsonStream(file, type = '*') {
  let source;
  if (typeof file === 'string') {
    const resolved = path.join(config.dir, file);
    source = fs.createReadStream(resolved);
  } else {
    source = file;
  }

  const deferred = Promise.pending();
  const stream = source.pipe(JSONStream.parse(type));
  stream.once('end', () => deferred.resolve());
  stream.once('error', e => deferred.reject(e));
  stream.promise = deferred.promise;
  return stream;
}

async function read(file, type = '$*') {
  const data = {};
  let count = 0;
  const stream = jsonStream(file, type);
  stream.on('data', obj => {
    data[obj.key] = obj.value;
    if (++count % 10000 === 0) console.log(`Read ${count}...`);
  });
  await stream.promise;
  console.log('Read complete');
  return data;
}

module.exports = {
  mkdirpAsync,
  rmrfAsync,
  copyAsync,
  toMap,
  readlines,
  jsonStream,
  read
};

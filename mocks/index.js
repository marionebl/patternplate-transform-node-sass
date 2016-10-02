'use strict';
const path = require('path');
const fs = require('mz/fs');
const entries = require('lodash').entries;
const merge = require('lodash').merge;

module.exports.data = data;
module.exports.get = get;

function data(name) {
  const baseName = path.basename(name, path.extname(name));
  try {
    const data = require(`./${baseName}`) || {};
    data.dependencies = data.dependencies || {};

    const jobs = entries(data.dependencies)
      .map(dep => {
        return dep[1].then(result => [dep[0], result]);
      })
      .map(dep => {
        return dep.then(result => {
          if (result[0]) {
            data.dependencies[result[0]] = result[1];
          }
          return data;
        });
      });

    return Promise.all(jobs).then(jobs => jobs[0]);
  } catch (err) {
    return Promise.resolve({});
  }
}

function get(name) {
  const filePath = path.resolve(__dirname, name);
  const read = fs.readFile(filePath)
    .then(buffer => ({buffer, path: filePath}));

  const jobs = [read, data(name)];
  return Promise.all(jobs)
    .then(results => {
      return merge.apply(null, results);
    });
}

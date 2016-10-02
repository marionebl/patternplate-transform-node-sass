/* @flow */
'use strict';
const path = require('path');
const fs = require('mz/fs');
const sass = require('node-sass');
const merge = require('lodash').merge;
const nResolve = require('n-resolve');
const fp = require('lodash/fp');
const _ = require('lodash');

module.exports = createTransform;

type Cache = {[key: string]: any};

type Config = {
  opts: {[key: string]: any};
};

type File = {
  buffer: Buffer;
  dependencies: {[path: string]: File};
  path: string;
};

type ImportResult = {
  contents: Buffer & string;
  file: string;
};

type Dependencies = File[];

type SassFunctions = {
  [name: string]: Function
};

type SassOptions = {
  file?: string;
  data?: string;
  functions?: SassFunctions;
  importer?: Function;
};

type SassResult = {
  css: Buffer;
  map: string;
};

function createTransform() : Function {
  return sassTansform;
}

function sassTansform(file: File, _, config: Config) : Promise<File> {
  const source = file.buffer.toString('utf-8');
  const opts = config.opts || {};
  const deps = [file].concat(flatten(file.dependencies || {}));

  opts.indentedSyntax = determineSyntax(file.path);
  opts.file = file.path;
  opts.importer = importer(opts, deps, {});

  const rendering = Promise.resolve(render(source, opts));

  return rendering
    .then(result => {
      file.buffer = result.css;
      return file;
    });
}

function importer(opts: {[key: string]: any}, deps: Dependencies, cache: Cache): Function {
  return function (url: string, prev: string, cb: Function) : void {
    new Promise((resolve, reject) => {
      const context = deps.find(dep => dep.path === prev) || {dependencies: {}, path: ''};
      const match = context ? (context.dependencies || {})[url] : null;

      if (match) {
        const options = merge({}, opts);
        const source = match.buffer.toString('utf-8');
        return render(source, options)
          .then(result => resolve({contents: result.css.toString()}))
          .catch(reject);
      }

      const base = context.path ? process.cwd() : path.dirname(prev);
      const options = {base, resolveKey: 'style', npm: Boolean(context.path)};
      return sassLoad(url, prev, options, cache)
        .then(resolve)
        .catch(reject);
    })
    .then(cb)
    .catch(cb);
  };
}

function sassLoad(url: string, prev: string, options, cache): Promise<ImportResult> {
  return sassResolve(url, prev, options)
    .then(filePath => {
      if (cache[filePath]) {
        return {
          contents: cache[filePath],
          file: filePath
        };
      }
      return fs.readFile(filePath, 'utf-8')
        .then(result => {
          cache[filePath] = result;
          return {
            contents: cache[filePath],
            file: filePath
          };
        });
    });
}

function sassResolve(url: string, prev: string, options): Promise<string> {
  const ext = path.extname(url) || path.extname(prev);
  const fragments = url.split('/').filter(Boolean);
  const isRelative = fragments[0] === '.' || fragments[0] === '..';

  const importableUrl = [
    !isRelative && '.',
    path.dirname(url),
    `_${path.basename(url)}${ext}`
  ].filter(Boolean).join('/');

  const usableUrl = [
    !isRelative && '.',
    path.dirname(url),
    `${path.basename(url)}${ext}`
  ].filter(Boolean).join('/');

  const urls = options.npm ? [url] : [importableUrl, usableUrl];
  const jobs = urls
    .map(u => nResolve(u, options).catch(() => null));

  return Promise.all(jobs)
    .then(results => {
      const result = results.find(r => typeof r === 'string');
      if (!result) {
        throw new Error(`Could not resolve ${url} at ${options.base}. Tried ${urls.join(', ')}`);
      }
      return result;
    });
}

function determineSyntax(filePath: string): boolean {
  const extension = path.extname(filePath);
  return extension === '.sass';
}

function render(data: string, options:SassOptions): Promise<SassResult> {
  return new Promise((resolve, reject) => {
    const settings = fp.merge(options)({data: data || '/*empty file*/'});

    sass.render(settings, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
  });
}

function flatten(dependencyTree, vault) {
  return _.values(dependencyTree || {})
    .reduce((list, item) => {
      list.push(item);
      flatten(item.dependencies, list);
      return list;
    }, vault || []);
}

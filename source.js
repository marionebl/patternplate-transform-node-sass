/* @flow */
/* eslint-disable no-use-before-define */
'use strict';
const path = require('path');
const fs = require('mz/fs');
const sass = require('node-sass');
const merge = require('lodash').merge;
const nResolve = require('n-resolve');
const fp = require('lodash/fp');
const _ = require('lodash');

module.exports = createTransform;

/** Entry point for patternplate */
function createTransform() : Function {
	return sassTansform;
}

/** Consume a patternplate file object and transform its buffer from scss to css */
async function sassTansform(file: File, _, config: Config) : Promise<File> {
	const source = file.buffer.toString('utf-8');
	const opts = config.opts || {};
	const deps = [file].concat(flatten(file.dependencies || {}));

	opts.indentedSyntax = checkIfIsIndentedSyntax(file.path);
	opts.file = file.path;
	opts.importer = importer(opts, deps, {});

	const result = await render(source, opts);
	file.buffer = result.css;
	return file;
}

/** Create a cutom async importer function applicable to node-sass */
function importer(opts: {[key: string]: any}, deps: Dependencies, cache: Cache): Function {
	/** Custom async importer resolving files from /patterns and node_modules */
	return (url: string, prev: string, cb: Function) : any => {
		// IMPORTANT: do not use an async function here – node-sass assumes
		// synchronous operation if this returns **anything**
		new Promise(() => { // eslint-disable-line no-new
			const context = deps.find(dep => dep.path === prev) || {dependencies: {}, path: ''};
			const match = context ? (context.dependencies || {})[url] : null;
			const base = context.path ? process.cwd() : path.dirname(prev);
			const options = {base, resolveKey: 'style', npm: Boolean(context.path)};

			if (match) {
				const options = merge({}, opts);
				const source = match.buffer.toString('utf-8');
				render(source, options)
					.then(({css}) => ({contents: css.toString()}))
					.then(cb)
					.catch(cb);
			}

			sassLoad(url, prev, options, cache)
				.then(cb)
				.catch(cb);
		});
	};
}

/** Render sass source <data> according to <options>  */
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

/** Load sass files outside the pattern tree */
async function sassLoad(url: string, prev: string, options, cache): Promise<ImportResult> {
	const file = await sassResolve(url, prev, options);
	const contents = await readFile(file, cache);
	return {contents, file};
}

/** Resolve sass files outside the pattern tree */
async function sassResolve(url: string, prev: string, options): Promise<string> {
	const urls = options.npm ?
		[url] : [normalizeSassUrl(url, prev, true), normalizeSassUrl(url, prev)];

	const jobs = urls.map(u => tryResolve(u, options));

	const results = await Promise.all(jobs);
	const result = results.find(r => typeof r === 'string');

	if (!result) {
		throw new Error(`Could not resolve ${url} at ${options.base}. Tried ${urls.join(', ')}`);
	}

	return result;
}

function tryResolve(url, options) {
	return Promise.resolve(nResolve(url, options))
		.catch(() => null);
}

/** Normalize a SASS import url to match relative resolve paths */
function normalizeSassUrl(url: string, prev: string, importable: bool = false): string {
	const prefix = importable ? '_' : '';
	const ext = path.extname(url) || path.extname(prev);
	const fragments = url.split('/').filter(Boolean);
	const isRelative = fragments[0] === '.' || fragments[0] === '..';
	return [
		!isRelative && '.',
		path.dirname(url),
		`${prefix}${path.basename(url)}${ext}`
	].filter(Boolean).join('/');
}

/** Read file from path or cache, if available */
async function readFile(filePath: string, cache: Cache = {}) : Promise<string> {
	if (cache[filePath]) {
		return cache[filePath];
	}
	cache[filePath] = await fs.readFile(filePath, 'utf-8');
	return cache[filePath];
}

/** Decide if indented syntax to use based on <filePath> */
function checkIfIsIndentedSyntax(filePath: string): boolean {
	const extension = path.extname(filePath);
	return extension === '.sass';
}

/** Flatten a .dependency tree to a simple array */
function flatten(dependencyTree: FileDependencies, vault: File[] = []): File[] {
	return _.values(dependencyTree || {})
		.reduce((list, item) => {
			list.push(item);
			flatten(item.dependencies, list);
			return list;
		}, vault);
}

/**
 * Flow types
 */
type Cache = {[key: string]: any};

/** patternplate-transform-node-sass configuration */
type Config = {
	opts?: {[key: string]: any};
};

/** A patternplate file object with attached meta data */
type File = {
	buffer: Buffer;
	dependencies: FileDependencies;
	path: string;
};

/** Map of dependencies available to a fiel */
type FileDependencies = {
	[localName: string]: File;
};

/** Result object expected by sass.importer callback */
type ImportResult = {
	contents: string;
	file: string;
};

/** Array of file dependencies */
type Dependencies = File[];

/** Map of custom sass function */
type SassFunctions = {
	[name: string]: Function
};

/** Options supported by sass.render */
type SassOptions = {
	file?: string;
	data?: string;
	functions?: SassFunctions;
	importer?: Function;
};

/** File object returned by SASS */
type SassResult = {
	css: Buffer;
	map: string;
};

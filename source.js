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

/** Create a cutom async importer function applicable to node-sass*/
function importer(opts: {[key: string]: any}, deps: Dependencies, cache: Cache): Function {
	/** Custom async importer resolving files from /patterns and node_modules*/
	return async (url: string, prev: string, cb: Function) : any => {
		const context = deps.find(dep => dep.path === prev) || {dependencies: {}, path: ''};
		const match = context ? (context.dependencies || {})[url] : null;

		if (match) {
			const options = merge({}, opts);
			const source = match.buffer.toString('utf-8');
			const result = await render(source, options);
			const contents = result.css.toString();
			return cb({contents});
		}

		const base = context.path ? process.cwd() : path.dirname(prev);
		const options = {base, resolveKey: 'style', npm: Boolean(context.path)};

		const result = await sassLoad(url, prev, options, cache);
		// console.log(result);
		return cb(result);
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
	cache[file] = cache[file] || await fs.readFile(file, 'utf-8');
	return {contents: cache[file], file};
}

/** Resolve sass files outside the pattern tree */
async function sassResolve(url: string, prev: string, options): Promise<string> {
	const urls = options.npm ? [url] : [normalizeSassUrl(url, prev, true), normalizeSassUrl(url, prev)];
	const jobs = urls.map(async u => {
		try {
			return await nResolve(u, options);
		} catch (err) {
			return null;
		}
	});

	const results = await Promise.all(jobs);
	const result = results.find(r => typeof r === 'string');

	if (!result) {
		throw new Error(`Could not resolve ${url} at ${options.base}. Tried ${urls.join(', ')}`);
	}

	return result;
}

/** Normalize a SASS import url to match relative resolve paths*/
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

/** Decide if indented syntax to use based on <filePath> */
function checkIfIsIndentedSyntax(filePath: string): boolean {
	const extension = path.extname(filePath);
	return extension === '.sass';
}

/** Flatten a .dependency tree to a simple array **/
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

/** patternplate-transform-node-sass configuration*/
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
	contents: Buffer & string;
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

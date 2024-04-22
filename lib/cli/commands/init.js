/* eslint-disable no-console */

import createLogger from 'bunyan-adaptor';
import { oraPromise } from 'ora';
import { peowly } from 'peowly';

import { baseFlags, sortFlags } from '../flags/misc.js';
import { downloadFlags, validateDownloadFlags } from '../flags/download.js';
import { InputError, ndjsonOutput, resolvePkgFields, sortByKey } from '../utils.js';
import { fetchEcosystemDependents } from '../../../index.js';

/** @type {import('peowly-commands').CliCommand} */
export const init = {
  description: 'Initializes a list of module dependents',
  async run (argv, meta, { parentName }) {
    const name = parentName + ' init';

    const input = setupCommand(name, init.description, argv, meta);

    await oraPromise(
      spinner => doTheWork(spinner, input),
      { prefixText: `Listing dependents for ${input.moduleName}` }
    );
  },
};

// Internal functions

/**
 * @param {string} name
 * @param {string} description
 * @param {string[]} args
 * @param {import('peowly-commands').CliMeta} meta
 * @returns {import('../cli-types.d.ts').CommandContextInit}
 */
function setupCommand (name, description, args, { pkg }) {
  const options = /** @satisfies {import('peowly').AnyFlags} */ ({
    ...baseFlags,
    ...downloadFlags,
    ...sortFlags,
  });

  const {
    flags: {
      debug,
      output,
      sort,
      'sort-dependent': sortDependents,
      'sort-download': sortDownloads,
      ...remainingFlags
    },
    input: [moduleName, ...otherInput],
    showHelp,
  } = peowly({
    args,
    description,
    name,
    options,
    pkg,
    usage: '<name-of-npm-module>',
  });

  if (otherInput.length > 0) {
    throw new InputError('Only one name is supported');
  }

  if (!moduleName) {
    showHelp();
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit();
  }

  /** @type {import('../cli-types.d.ts').CommandContextInit} */
  const result = {
    debug,
    moduleName,
    output,
    sort,
    sortDependents,
    sortDownloads,
    ...validateDownloadFlags(remainingFlags),
  };

  return result;
}

/**
 * @param {import('ora').Ora} spinner
 * @param {import('../cli-types.d.ts').CommandContextInit} context
 * @returns {Promise<void>}
 */
async function doTheWork (spinner, context) {
  const {
    debug,
    includePkg,
    maxAge,
    maxPages,
    minDownloads,
    moduleName,
    output,
    pkgFields,
    sort,
    sortDependents,
    sortDownloads,
  } = context;

  const logger = debug ? createLogger({ log: console.error.bind(console) }) : undefined;
  const skipPkg = !(includePkg || pkgFields?.length);
  const nonStreaming = sort || sortDependents || sortDownloads;

  const baseGenerator = fetchEcosystemDependents(moduleName, {
    logger,
    maxAge,
    maxPages,
    minDownloadsLastMonth: minDownloads * 4,
    perPage: 100,
    skipPkg,
  });

  const generator = pkgFields
    ? resolvePkgFields(baseGenerator, pkgFields)
    : baseGenerator;

  if (!nonStreaming) {
    await ndjsonOutput(generator, output);
    spinner.succeed();
    return;
  }

  /** @type {import('../cli-types.d.ts').CliDependentsItem[]} */
  const result = [];
  let count = 0;

  for await (const item of generator) {
    count += 1;
    spinner.text = `${count} dependents listed`;
    result.push(item);
  }

  if (sort) { result.sort(sortByKey('name')); }
  if (sortDependents) { result.sort(sortByKey('dependentCount', true)); }
  if (sortDownloads) { result.sort(sortByKey('downloads', true)); }

  await ndjsonOutput(result, output);
}
import { bufferedAsyncMap } from 'buffered-async-iterable';

import { processEcosystemResponse } from './ecosystem-helpers.js';
import { fetchJsonPages } from './json-helpers.js';
import { getObjectStringValue } from './utils.js';

// TODO: Use got or undici instead of built in fetch?

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @param {string} name
 * @param {import('./interface-types.d.ts').EcosystemDependentsOptions} [options]
 * @returns {AsyncGenerator<import('./interface-types.d.ts').EcosystemDependentsItem, void, undefined>}
 */
export async function * fetchEcosystemDependents (name, options = {}) {
  if (!name || typeof name !== 'string') throw new TypeError('Expected a non-empty string name');

  const {
    filter: baseFilter,
    logger,
    maxAge,
    maxPages,
    minDownloadsLastMonth = 400,
    perPage,
    skipPkg,
  } = options;

  const now = Date.now();

  /** @type {Set<string>} */
  const seen = new Set([name]);

  /** @type {import('./interface-types.d.ts').EcosystemFilterCallback | undefined} */
  const filter = (minDownloadsLastMonth || maxAge)
    ? (item) => {
        if (baseFilter && !baseFilter(item)) {
          return false;
        }

        const {
          downloads,
          latestRelease,
          name: dependent,
        } = item;

        if (downloads < minDownloadsLastMonth) {
          logger && logger.debug(`Skipping "${dependent}", too few downloads: ${downloads}`);
          return false;
        }

        if (maxAge) {
          if (!latestRelease) {
            logger && logger.debug(`Skipping "${dependent}", no timestamp for latest release.`);
            return false;
          }

          const ageInDays = (now - Date.parse(latestRelease)) / MS_PER_DAY;

          if (ageInDays > maxAge) {
            logger && logger.debug(`Skipping "${dependent}", too old: ${Math.ceil(ageInDays)} days old`);
            return false;
          }
        }

        return true;
      }
    : baseFilter;

  /** @type {import('./interface-types.d.ts').PackageLookupOptions} */
  const packageLookupOptions = { filter, logger, skipPkg };

  // Process a couple of items at once
  yield * bufferedAsyncMap(
    fetchJsonPages(`https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/${name}/dependent_packages?latest=true`, logger, {
      maxPages,
      perPage,
    }),
    async function * (item) {
      // Avoid duplicate lookups
      const dependent = getObjectStringValue(item, 'name');

      if (!dependent || seen.has(dependent)) {
        return;
      }

      seen.add(dependent);

      // Process the data into the correct shape and possibly fetch more data
      const result = await processEcosystemResponse(item, packageLookupOptions);

      if (result) {
        yield result;
      }
    });
}

/**
 * @param {string} name
 * @param {import('./interface-types.d.ts').PackageLookupOptions} [options]
 * @returns {Promise<import('./interface-types.d.ts').EcosystemDependentsItem|false|undefined>}
 */
export async function fetchEcosystemPackage (name, options = {}) {
  const { logger } = options;

  logger && logger.debug(`Fetching ecosystem package: ${name}`);

  // TODO: Add error handling
  const res = await fetch(`https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/${name}`);
  const response = await res.json();

  return processEcosystemResponse(response, options);
}

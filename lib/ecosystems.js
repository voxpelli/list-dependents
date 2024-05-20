import { bufferedAsyncMap } from 'buffered-async-iterable';

import { processEcosystemResponse } from './ecosystem-helpers.js';
import { fetchJsonPages } from './json-helpers.js';
import { getObjectStringValue } from './utils.js';
import { getHttpClient } from './utils/got.js';

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
    userAgent,
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
  const packageLookupOptions = {
    dependentOn: name,
    filter,
    logger,
    skipPkg,
  };

  const client = getHttpClient({
    logger,
    userAgent,
  });

  // Process a couple of items at once
  yield * bufferedAsyncMap(
    fetchJsonPages(client, `https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/${name}/dependent_packages?latest=true`, {
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
  const { logger, userAgent } = options;

  const {
    client = getHttpClient({ logger, userAgent }),
  } = options;

  /** @type {unknown} */
  const response = await client(`https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/${name}`, {
    timeout: {
      request: 60000,
    },
  }).json();

  return processEcosystemResponse(response, options);
}

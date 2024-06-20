import { bufferedAsyncMap } from 'buffered-async-iterable';

import { processEcosystemResponse } from './ecosystem-helpers.js';
import { fetchJsonPages } from './json-helpers.js';
import { getObjectStringValue } from './utils.js';
import { getHttpClient } from './utils/got.js';
import { gotQueue } from './utils/got-queue.js';

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
    // TODO: Remove once ecosyste.ms has fully processed the data needed for ?latest=true for all packages
    includeHistoricDependents = false,
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

  const client = getHttpClient({
    logger,
    userAgent,
  });

  /** @type {import('./interface-types.d.ts').PackageLookupOptions} */
  const packageLookupOptions = {
    client: client.extend(gotQueue({ logger })),
    dependentOn: name,
    filter,
    logger,
    skipPkg,
  };

  // Process a couple of items at once
  yield * bufferedAsyncMap(
    fetchJsonPages(client, `https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/${name}/dependent_packages${includeHistoricDependents ? '' : '?latest=true'}`, {
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
 * @param {import('./interface-types.d.ts').PackageLookupOptions & { ecosystemsClient?: import('got').Got }} [options]
 * @returns {Promise<import('./interface-types.d.ts').EcosystemDependentsItem|false|undefined>}
 */
export async function fetchEcosystemPackage (name, options = {}) {
  const { client, ecosystemsClient, logger, userAgent } = options;

  const resolvedClient = ecosystemsClient || client || getHttpClient({ logger, userAgent });

  /** @type {unknown} */
  const response = await resolvedClient(`https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/${name}`, {
    timeout: {
      request: 60000,
    },
  }).json();

  return processEcosystemResponse(response, options);
}

/**
 * Ensures that Retry-After and concurrency is respected
 *
 * @param {import('./interface-types.d.ts').PackageFetchQueueOptions} [queueOptions]
 * @returns {(name: string, options?: import('./interface-types.d.ts').PackageFetchQueueLookupOptions) => ReturnType<fetchEcosystemPackage>}
 */
export function createPackageFetchQueue (queueOptions = {}) {
  const { logger, userAgent } = queueOptions;

  const {
    client = getHttpClient({ logger, userAgent }),
  } = queueOptions;

  return (name, options) => fetchEcosystemPackage(name, {
    ...options,
    client: client.extend(gotQueue({ logger })),
    ecosystemsClient: client,
    logger,
    userAgent,
  });
}

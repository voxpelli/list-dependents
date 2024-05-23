import { messageWithCauses } from 'pony-cause';

import { fetchPackageFromNpm } from './npm-helpers.js';
import { getObjectNumericValue, getObjectStringValue } from './utils.js';
import { getHttpClient } from './utils/got.js';

/**
 * @param {unknown} item
 * @param {import('./interface-types.d.ts').PackageLookupOptions} [options]
 * @returns {Promise<import('./interface-types.d.ts').EcosystemDependentsItem|false|undefined>}
 */
export async function processEcosystemResponse (item, options = {}) {
  const { logger, userAgent } = options;

  const {
    client = getHttpClient({ logger, userAgent }),
    dependentOn,
    filter,
    skipPkg: rawSkipPkg = false,
  } = options;

  const name = getObjectStringValue(item, 'name');

  if (!name) {
    return;
  }

  const downloads = getObjectStringValue(item, 'downloads_period') === 'last-month'
    ? getObjectNumericValue(item, 'downloads')
    : undefined;

  if (downloads === undefined) {
    logger && logger.warn(`Skipping "${name}": Found no download count`);
    return;
  }

  /** @type {import('./interface-types.d.ts').EcosystemDependentsMeta} */
  const meta = {
    dependentCount: getObjectNumericValue(item, 'dependent_packages_count'),
    downloads,
    firstRelease: getObjectStringValue(item, 'first_release_published_at'),
    latestRelease: getObjectStringValue(item, 'latest_release_published_at'),
    latestVersion: getObjectStringValue(item, 'latest_release_number'),
    repositoryUrl: getObjectStringValue(item, 'repository_url'),
    name,
  };

  if (filter && !filter(meta)) {
    return false;
  }

  const skipPkg = typeof rawSkipPkg === 'function' ? rawSkipPkg(meta) : rawSkipPkg;

  if (skipPkg) {
    return meta;
  }

  const pkg = await fetchPackageFromNpm(client, name).catch(err => {
    logger?.warn(`Failed to fetch "${name}" from npm: ${messageWithCauses(err)}`);
  });

  if (!pkg) {
    return;
  }

  const targetVersion = dependentOn && (
    pkg.dependencies?.[dependentOn] ||
    pkg.devDependencies?.[dependentOn] ||
    pkg.peerDependencies?.[dependentOn]
  );

  if (!targetVersion) {
    logger && logger.warn(`Skipping "${name}": Not dependent on the correct module`);
    return false;
  }

  /** @type {import('./interface-types.d.ts').EcosystemDependentsItem} */
  const result = {
    ...meta,
    targetVersion,
    pkg,
  };

  return result;
}

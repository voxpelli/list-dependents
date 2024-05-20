/** @typedef {import('read-pkg').NormalizedPackageJson} NormalizedPackageJson */

// TODO: Use got or undici instead of built in fetch?

/**
 * @param {string} name
 * @param {import('bunyan-adaptor').BunyanLite|undefined} logger
 * @returns {Promise<NormalizedPackageJson|undefined>}
 */
export async function fetchPackageFromNpm (name, logger) {
  logger && logger.debug(`Fetching package: ${name}`);

  /** @type {unknown} */
  let result;

  try {
  const res = await fetch(`https://registry.npmjs.org/${name}/latest`);

    if (res.ok) {
      result = await res.json();
    }
  } catch {
    // TODO: Add retry to enable recovery
    // TODO: Log error but fail silently
  }

  if (
    result && typeof result === 'object' &&
    '_id' in result && typeof result._id === 'string' &&
    'name' in result && typeof result.name === 'string'
  ) {
    logger && logger.trace(`Returning package: ${name}`);
    return /** @type {NormalizedPackageJson} */ (result);
  }

  // TODO: Log error but fail silently
}

/** @typedef {import('read-pkg').NormalizedPackageJson} NormalizedPackageJson */

/**
 * @param {import('got').Got} client
 * @param {string} name
 * @returns {Promise<NormalizedPackageJson>}
 */
export async function fetchPackageFromNpm (client, name) {
  /** @type {unknown} */
  let result;

  try {
    result = await client(`https://registry.npmjs.org/${name}/latest`).json();
  } catch (cause) {
    throw new Error('Failed to fetch package.json from npm', { cause });
  }

  if (
    result && typeof result === 'object' &&
    '_id' in result && typeof result._id === 'string' &&
    'name' in result && typeof result.name === 'string'
  ) {
    return /** @type {NormalizedPackageJson} */ (result);
  }

  throw new TypeError('Invalid package.json returned from npm');
}

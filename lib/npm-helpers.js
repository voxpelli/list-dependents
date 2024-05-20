/** @typedef {import('read-pkg').NormalizedPackageJson} NormalizedPackageJson */

/**
 * @param {import('got').Got} client
 * @param {string} name
 * @returns {Promise<NormalizedPackageJson|undefined>}
 */
export async function fetchPackageFromNpm (client, name) {
  /** @type {unknown} */
  let result;

  try {
    result = await client(`https://registry.npmjs.org/${name}/latest`).json();
  } catch {
    // TODO: Log error but fail silently
  }

  if (
    result && typeof result === 'object' &&
    '_id' in result && typeof result._id === 'string' &&
    'name' in result && typeof result.name === 'string'
  ) {
    return /** @type {NormalizedPackageJson} */ (result);
  }

  // TODO: Log error but fail silently
}

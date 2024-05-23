import { readFile } from 'node:fs/promises';

import got from 'got';

import { gotBunyan } from './got-bunyan.js';

const packagePath = new URL('../../package.json', import.meta.url);
/** @type {import('read-pkg').NormalizedPackageJson} */
// eslint-disable-next-line security/detect-non-literal-fs-filename
const { homepage, name, version } = JSON.parse(await readFile(packagePath, { encoding: 'utf8' }));

const defaultUserAgent = name + '/' + version + ' (' + homepage + ')';

// TODO: Add a file based cache function for got: https://github.com/zaaack/keyv-file

// TODO: Add logging that complies with the `--debug` / `--quiet` flags

/**
 * @param {import('../interface-types.js').HttpClientOptions} options
 * @returns {import('got').Got}
 */
export function getHttpClient (options) {
  const {
    logger,
    userAgent,
  } = options;

  return got.extend(
    gotBunyan(logger),
    {
      headers: {
        'User-Agent': ((userAgent || '') + ' ' + defaultUserAgent).trim(),
      },
      timeout: {
        request: 3000,
      },
    }
  );
}

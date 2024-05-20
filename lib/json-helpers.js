import { typesafeIsArray } from './utils.js';

/**
 * @typedef JsonPagesOptions
 * @property {number|undefined} [maxPages]
 * @property {string|undefined} [pageQueryParam]
 * @property {number|undefined} [pageStart]
 * @property {number|undefined} [perPage]
 * @property {string|undefined} [perPageQueryParam]
 */

/**
 * @param {import('got').Got} client
 * @param {string} baseUrl
 * @param {JsonPagesOptions} options
 * @returns {AsyncGenerator<unknown, void, undefined>}
 */
export async function * fetchJsonPages (client, baseUrl, options = {}) {
  if (!baseUrl || typeof baseUrl !== 'string') throw new TypeError('Expected a non-empty string name');

  const {
    maxPages,
    pageQueryParam = 'page',
    pageStart = 1,
    perPage = 36,
    perPageQueryParam = 'per_page',
  } = options;

  const url = new URL(baseUrl);

  url.searchParams.set(perPageQueryParam, perPage + '');

  let page = pageStart;

  while (true) {
    if (maxPages && page - pageStart >= maxPages) {
      break;
    }

    url.searchParams.set(pageQueryParam, page + '');

    /** @type {unknown} */
    const list = await client(url).json();

    if (!typesafeIsArray(list)) {
      break;
    }

    yield * list;

    if (list.length < perPage) {
      break;
    }

    page += 1;
  }
}

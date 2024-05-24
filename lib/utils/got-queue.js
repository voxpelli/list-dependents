import { setTimeout as setTimeoutPromise } from 'node:timers/promises';

import { Sema } from 'async-sema';
import got from 'got';

/**
 * @param {{ concurrency?: number, logger?: import('bunyan-adaptor').BunyanLite | undefined }} [options]
 * @returns {import('got').Got}
 */
export function gotQueue ({ concurrency = 10, logger } = {}) {
  /**
   * Is initialized to a truthy value 1 to ensure that we start out in non-parallel mode
   *
   * Once the first successful requests has resolved, then the parallel fetches will
   * start to be allowed to happen
   *
   * @type {number|undefined}
   */
  let retryAt = 1;

  const retry = new Sema(1);
  const parallel = new Sema(concurrency);

  return got.extend({
    retry: {
      backoffLimit: 5000,
      limit: 5,
    },
    hooks: {
      beforeRequest: [
        async ({ isStream }) => {
          if (isStream) {
            throw new Error('Streams are not supported by gotQueue()');
          }

          await parallel.acquire();

          if (retryAt) {
            await retry.acquire();

            /** @type {number} */
            let waitTime = retryAt - Date.now();

            while (waitTime > 0) {
              logger && logger.warn(`Waiting for ${waitTime} ms before sending next request`);

              await setTimeoutPromise(waitTime);

              waitTime = retryAt - Date.now();
            }
          }
        },
      ],
      afterResponse: [
        (response) => {
          const isRetry = !retry.tryAcquire();

          retry.release();
          parallel.release();

          if (response.statusCode === 429 || response.statusCode === 503) {
            const retryAfter = getRetryAfter(response);

            if (retryAfter) {
              retryAt = Math.max(Date.now() + retryAfter, retryAt || 0);
            }

            delete response.headers['retry-after'];
          } else if (isRetry) {
            retryAt = undefined;
          }

          return response;
        },
      ],
      beforeRetry: [
        error => {
          if (!error.response) {
            retry.release();
            parallel.release();
          }
        },
      ],
      beforeError: [
        error => {
          if (!error.response) {
            retry.release();
            parallel.release();
          }

          return error;
        },
      ],
    },
  });
}

/**
 * Largely copied from https://github.com/sindresorhus/got/blob/4a44fc40439003e94975e6425b021545b0faaa9a/source/core/index.ts#L357
 *
 * @param {import('got').Response} response
 * @returns {number | undefined}
 */
function getRetryAfter (response) {
  if (!('retry-after' in response.headers) || !response.headers['retry-after']) {
    return;
  }

  let retryAfter = Number(response.headers['retry-after']);

  if (Number.isNaN(retryAfter)) {
    retryAfter = Date.parse(response.headers['retry-after']) - Date.now();
  } else {
    retryAfter *= 1000;
  }

  if (retryAfter <= 0) {
    retryAfter = 1;
  }

  return retryAfter;
}

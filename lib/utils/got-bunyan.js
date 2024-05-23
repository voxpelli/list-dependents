/**
 * @param {import('bunyan-adaptor').BunyanLite|undefined} logger
 * @returns {import('got').ExtendOptions}
 */
export function gotBunyan (logger) {
  if (!logger) {
    return {};
  }

  return {
    handlers: [
      (options, next) => {
        logger.debug(`Sending ${options.method} to ${options.url}`);
        return next(options);
      },
    ],
    hooks: {
      beforeRetry: [
        (error, retryCount) => {
          logger.info(`Retrying [${retryCount}]: ${error.code} for ${error.request?.requestUrl}`);
          // Retrying [1]: ERR_NON_2XX_3XX_RESPONSE
        },
      ],
    },
  };
}

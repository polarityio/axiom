'use strict';

const { request } = require('../request');

/**
 * Fetches the list of all datasets visible to the authenticated token.
 * GET /v1/datasets
 *
 * Used in validateOptions to:
 *   1. Confirm the token is valid (403 → auth failure)
 *   2. Confirm the configured dataset name exists
 *
 * Returns an array of: { id, name, description, created, who, kind }
 */
const getDatasets = async () => {
  const response = await request.run({
    route: '/v1/datasets',
    method: 'GET'
  });
  return Array.isArray(response.body) ? response.body : [];
};

module.exports = { getDatasets };

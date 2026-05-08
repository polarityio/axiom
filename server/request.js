'use strict';

const {
  requests: { PolarityRequest }
} = require('polarity-integration-utils');

const { getOptionValue } = require('./assembleLookupResults');

const AXIOM_API_BASE = 'https://api.axiom.co';

/**
 * Shared PolarityRequest instance.
 * IMPORTANT: Set `request.userOptions = options` at the start of doLookup and onMessage
 * before calling any server functions that use this instance.
 *
 * Axiom.co uses static bearer tokens — no OAuth2 flow:
 *   Method A (API Token): Authorization: Bearer <apiToken>
 *   Method B (PAT):       Authorization: Bearer <pat> + x-axiom-org-id: <orgId>
 */
const request = new PolarityRequest();

request.preprocessRequestOptions = async (requestOptions, userOptions) => {
  const apiToken = getOptionValue(userOptions.apiToken);
  const pat = getOptionValue(userOptions.pat);
  const orgId = getOptionValue(userOptions.orgId);

  // API Token takes precedence; fall back to PAT
  const token = apiToken || pat;

  const headers = {
    ...requestOptions.headers,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // x-axiom-org-id is required only when using a PAT (not an API Token)
  if (!apiToken && pat && orgId) {
    headers['x-axiom-org-id'] = orgId;
  }

  return {
    ...requestOptions,
    url: `${AXIOM_API_BASE}${requestOptions.route}`,
    headers,
    json: true
  };
};

module.exports = { request };

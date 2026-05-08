'use strict';

const {
  logging: { setLogger, getLogger },
  errors: { parseErrorToReadableJson }
} = require('polarity-integration-utils');

const { request } = require('./server/request');
const { queryDataset } = require('./server/queries/queryDataset');
const { getDatasets } = require('./server/queries/getDatasets');
const { assembleLookupResults, getOptionValue } = require('./server/assembleLookupResults');
const { createDeepLink } = require('./server/dataTransformations');

const doLookup = async (entities, options, cb) => {
  const Logger = getLogger();
  try {
    Logger.debug({ entities }, 'Entities');

    // MUST set before any HTTP calls so preprocessRequestOptions has access to options
    request.userOptions = options;

    const queryResults = await Promise.allSettled(
      entities.map((entity) => queryDataset(entity, options))
    );

    const lookupResults = assembleLookupResults(entities, queryResults, options);

    Logger.trace({ lookupResults }, 'Lookup Results');
    cb(null, lookupResults);
  } catch (error) {
    const err = parseErrorToReadableJson(error);
    Logger.error({ error, formattedError: err }, 'Lookup Failed');
    cb({ detail: error.message || 'Lookup failed', err });
  }
};

const onMessage = async ({ action, data }, options, cb) => {
  const Logger = getLogger();
  try {
    request.userOptions = options;

    if (action === 'RUN_QUERY') {
      const { entityValue, entityType } = data;
      const entity = { value: entityValue, type: entityType };

      const result = await queryDataset(entity, options);
      const deepLink = createDeepLink(getOptionValue(options.deepLinkUrl), entity);

      return cb(null, {
        events: result.events,
        rowsMatched: result.rowsMatched,
        rowsExamined: result.rowsExamined,
        isPartial: result.isPartial,
        elapsedMs: result.elapsedMs,
        query: result.query,
        datasetName: result.datasetName,
        deepLink
      });
    }

    cb({ detail: `Unknown action: ${action}` });
  } catch (error) {
    const err = parseErrorToReadableJson(error);
    Logger.error({ error, formattedError: err }, 'onMessage Failed');
    cb({ detail: error.message || 'Action failed', err });
  }
};

const validateOptions = async (options, callback) => {
  const errors = [];
  const Logger = getLogger();

  const apiToken = getOptionValue(options.apiToken);
  const pat = getOptionValue(options.pat);
  const orgId = getOptionValue(options.orgId);
  const datasetName = getOptionValue(options.datasetName);
  const aplTemplate = getOptionValue(options.aplTemplate);

  // At least one auth token required
  if (!apiToken && !pat) {
    errors.push({
      key: 'apiToken',
      message: 'You must provide either an API Token or a Personal Access Token (PAT).'
    });
  }

  // PAT requires Org ID
  if (pat && !orgId) {
    errors.push({
      key: 'orgId',
      message: 'Org ID is required when using a Personal Access Token (PAT).'
    });
  }

  if (!datasetName) {
    errors.push({ key: 'datasetName', message: 'You must provide a Dataset Name.' });
  }

  if (!aplTemplate || !aplTemplate.includes('{{entity}}')) {
    errors.push({
      key: 'aplTemplate',
      message: 'The APL Query Template must contain the {{entity}} placeholder.'
    });
  }

  if (aplTemplate && !aplTemplate.includes('{{dataset}}')) {
    errors.push({
      key: 'aplTemplate',
      message: 'The APL Query Template must contain the {{dataset}} placeholder.'
    });
  }

  // Live validation: verify auth + dataset existence
  if (errors.length === 0) {
    try {
      request.userOptions = options;
      const datasets = await getDatasets();
      const found = datasets.some((d) => d.name === datasetName || d.id === datasetName);
      if (!found) {
        const available = datasets.map((d) => d.name).join(', ') || 'none';
        errors.push({
          key: 'datasetName',
          message: `Dataset '${datasetName}' was not found in your Axiom organization. Available: ${available}`
        });
      }
    } catch (authError) {
      Logger.error({ authError }, 'validateOptions: dataset check failed');
      errors.push({
        key: apiToken ? 'apiToken' : 'pat',
        message: `Authentication failed: ${authError.message || 'Please verify your API Token and Org ID.'}`
      });
    }
  }

  callback(null, errors);
};

module.exports = {
  startup: setLogger,
  doLookup,
  onMessage,
  validateOptions
};

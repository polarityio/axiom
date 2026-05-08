'use strict';

const { createDeepLink } = require('./dataTransformations');

/**
 * Returns the resolved string value of a Polarity option, handling single-
 * and double-wrapped select objects as well as plain string/boolean values.
 * Apply this to every options.* access to be safe across Polarity server versions.
 */
const getOptionValue = (opt) => {
  if (opt === null || opt === undefined) return '';
  if (typeof opt !== 'object') return opt;
  const v = opt.value;
  if (v !== null && v !== undefined && typeof v === 'object' && 'value' in v) return v.value;
  return v ?? '';
};

/**
 * Assembles doLookup results from Promise.allSettled query results.
 * Entities with no matches still get an overlay with summary: ['No Results']
 * so the analyst sees consistent feedback and can re-run queries.
 */
const assembleLookupResults = (entities, queryResults, options) => {
  const deepLinkUrl = getOptionValue(options.deepLinkUrl);

  return entities.map((entity, index) => {
    const result = queryResults[index];

    if (result.status === 'rejected') {
      // Surface auth failures as a visible error overlay
      const errMsg =
        (result.reason && result.reason.message) || 'Query failed.';
      return {
        entity,
        data: {
          summary: ['Error'],
          details: {
            events: [],
            rowsMatched: 0,
            rowsExamined: 0,
            elapsedMs: 0,
            isPartial: false,
            datasetName: getOptionValue(options.datasetName),
            query: '',
            deepLink: createDeepLink(deepLinkUrl, entity),
            noResults: true,
            queryError: errMsg
          }
        }
      };
    }

    const {
      events,
      rowsMatched,
      rowsExamined,
      elapsedMs,
      isPartial,
      query,
      datasetName
    } = result.value;

    const deepLink = createDeepLink(deepLinkUrl, entity);

    if (!events || events.length === 0) {
      return {
        entity,
        data: {
          summary: ['No Results'],
          details: {
            events: [],
            rowsMatched: 0,
            rowsExamined,
            elapsedMs,
            isPartial,
            datasetName,
            query,
            deepLink,
            noResults: true,
            queryError: null
          }
        }
      };
    }

    return {
      entity,
      data: {
        summary: buildSummaryTags(rowsMatched, datasetName),
        details: {
          events,
          rowsMatched,
          rowsExamined,
          elapsedMs,
          isPartial,
          datasetName,
          query,
          deepLink,
          noResults: false,
          queryError: null
        }
      }
    };
  });
};

const buildSummaryTags = (rowsMatched, datasetName) => {
  const matchLabel = rowsMatched === 1 ? '1 Match' : `${rowsMatched} Matches`;
  const tags = [matchLabel];
  if (datasetName) tags.push(datasetName);
  return tags;
};

module.exports = { assembleLookupResults, getOptionValue, buildSummaryTags };

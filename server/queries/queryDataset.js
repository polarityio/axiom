'use strict';

const { request } = require('../request');
const {
  createQueryString,
  transposeTabularResponse,
  formatTimestamp
} = require('../dataTransformations');
const { getOptionValue } = require('../assembleLookupResults');

/**
 * Executes a synchronous APL query against the configured Axiom dataset.
 *
 * POST /v1/datasets/_apl?format=tabular
 *
 * IMPORTANT: Axiom queries are synchronous — results come back in the HTTP
 * response body. There is NO job ID, NO polling, NO async status check.
 * This is the primary difference from the CrowdStrike NG-SIEM prior art.
 *
 * NOTE: The documented endpoint /v1/query/_apl returns 404. The correct
 * endpoint confirmed via live API testing is /v1/datasets/_apl.
 */
const queryDataset = async (entity, options) => {
  const datasetName = getOptionValue(options.datasetName);
  const aplTemplate =
    getOptionValue(options.aplTemplate) ||
    `['{{dataset}}'] | where * has "{{entity}}" | limit 25`;
  const startTime = getOptionValue(options.startTime);
  const endTime = getOptionValue(options.endTime);

  const query = createQueryString(aplTemplate, entity, datasetName);

  const body = { apl: query };
  if (startTime) body.startTime = startTime;
  if (endTime) body.endTime = endTime;

  const response = await request.run({
    route: '/v1/datasets/_apl?format=tabular',
    method: 'POST',
    body
  });

  const { status = {}, tables = [] } = response.body;
  const table = tables[0] || { fields: [], columns: [] };
  const rawRows = transposeTabularResponse(table);

  // Enrich each row with a formatted timestamp for display in the Fields tab
  const events = rawRows.map((row) => {
    const enriched = { ...row };
    const ts = row['_time'] || row['@timestamp'] || row['timestamp'];
    if (ts) enriched.__formattedTimestamp = formatTimestamp(ts);
    return enriched;
  });

  return {
    entity,
    query,
    events,
    rowsMatched: status.rowsMatched || 0,
    rowsExamined: status.rowsExamined || 0,
    elapsedMs: Math.round((status.elapsedTime || 0) / 1000),
    isPartial: status.isPartial || false,
    datasetName
  };
};

module.exports = { queryDataset };

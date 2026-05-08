'use strict';

/**
 * Builds the APL query string by substituting {{entity}} and {{dataset}}
 * tokens in the configured template.
 */
const createQueryString = (template, entity, datasetName) => {
  const base =
    template || `['{{dataset}}'] | where * has "{{entity}}" | limit 25`;
  return base
    .replace(/{{entity}}/gi, escapeForApl(entity.value))
    .replace(/{{dataset}}/gi, datasetName || '');
};

/**
 * Escape a value for safe embedding inside an APL quoted string.
 * Removes newlines and escapes double-quotes.
 */
const escapeForApl = (value) =>
  value.replace(/(\r\n|\n|\r)/g, '').replace(/"/g, '\\"');

/**
 * Transposes an Axiom tabular response table into an array of flat row objects.
 *
 * Axiom returns columns in column-major order:
 *   fields  = [{ name: "_time" }, { name: "ip_src" }]
 *   columns = [["2025-05-08", "2025-05-07"], ["10.0.0.1", "10.0.0.2"]]
 *
 * This function produces:
 *   [{ "_time": "2025-05-08", "ip_src": "10.0.0.1" }, ...]
 */
const transposeTabularResponse = (table) => {
  if (!table || !table.fields || !table.columns || table.columns.length === 0) {
    return [];
  }

  const fieldNames = table.fields.map((f) => f.name);
  const numRows = table.columns[0].length;

  return Array.from({ length: numRows }, (_, rowIdx) => {
    const row = {};
    fieldNames.forEach((name, colIdx) => {
      row[name] = table.columns[colIdx][rowIdx];
    });
    return row;
  });
};

/**
 * Builds a deep-link URL into the Axiom console.
 * Simply returns the configured base URL — analysts navigate
 * from the console home to their dataset.
 */
const createDeepLink = (deepLinkUrl, entity) => {
  const base = (deepLinkUrl || 'https://app.axiom.co').replace(/\/$/, '');
  return `${base}?q=${encodeURIComponent(entity.value)}`;
};

/**
 * Formats a timestamp value for human-readable display.
 * Handles:
 *   - ISO 8601 strings (Axiom _time field is ISO 8601)
 *   - Unix epoch milliseconds as string or number
 * Returns "YYYY-MM-DD HH:MM:SS UTC" or the raw value if unparseable.
 */
const formatTimestamp = (ts) => {
  if (!ts) return 'N/A';
  let ms;
  if (typeof ts === 'number') {
    ms = ts;
  } else if (typeof ts === 'string') {
    if (/^\d{10,15}$/.test(ts.trim())) {
      ms = parseInt(ts, 10);
    } else {
      ms = Date.parse(ts);
    }
  }
  if (!ms || isNaN(ms)) return String(ts);
  const d = new Date(ms);
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
};

const parseErrorToReadableJSON = (error) =>
  Object.getOwnPropertyNames(error).reduce((acc, key) => {
    acc[key] = error[key];
    return acc;
  }, {});

module.exports = {
  createQueryString,
  transposeTabularResponse,
  createDeepLink,
  formatTimestamp,
  parseErrorToReadableJSON
};

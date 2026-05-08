polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),

  hasEvents: Ember.computed('details.events.[]', function () {
    const events = this.get('details.events') || [];
    return events.length > 0;
  }),

  formattedRowsExamined: Ember.computed('details.rowsExamined', function () {
    const n = this.get('details.rowsExamined') || 0;
    return n.toLocaleString();
  }),

  init() {
    this._super(...arguments);
    if (!this.get('block._state')) {
      this.set('block._state', {
        isQuerying: false,
        error: null
      });
    }
    const events = this.get('details.events') || [];
    this._initEventTabs(events);
    this._buildReadableJson(events);
    this._buildDisplayFields(events);
  },

  _initEventTabs(events) {
    (events || []).forEach(function (event) {
      if (!event.__activeTab) {
        Ember.set(event, '__activeTab', 'fields');
      }
    });
  },

  // Priority fields surface the most forensically-relevant data first
  _PRIORITY_KEYS: [
    { key: '__formattedTimestamp', label: 'Timestamp' },
    { key: 'ip',         label: 'IP' },
    { key: 'ip_src',     label: 'Source IP' },
    { key: 'ip_dst',     label: 'Dest IP' },
    { key: 'host',       label: 'Host' },
    { key: 'hostname',   label: 'Hostname' },
    { key: 'username',   label: 'Username' },
    { key: 'user',       label: 'User' },
    { key: 'event_type', label: 'Event Type' },
    { key: 'severity',   label: 'Severity' },
    { key: 'message',    label: 'Message' }
  ],

  _buildDisplayFields(events) {
    const priorityKeys = this._PRIORITY_KEYS;
    const priorityKeyNames = priorityKeys.map(function (p) { return p.key; });
    // Fields to skip in the remaining alphabetical list
    const skipKeys = priorityKeyNames.concat(['_time', '@timestamp', 'timestamp']);

    (events || []).forEach(function (event) {
      const fields = [];

      // Priority fields first — in defined order, skip missing/empty
      priorityKeys.forEach(function (pk) {
        const val = event[pk.key];
        if (val !== undefined && val !== null && val !== '') {
          fields.push({ key: pk.label, value: String(val) });
        }
      });

      // Remaining fields alphabetically — skip internals and priority keys
      const remainingKeys = Object.keys(event)
        .filter(function (k) {
          return !k.startsWith('__') && skipKeys.indexOf(k) === -1;
        })
        .sort();

      remainingKeys.forEach(function (k) {
        const val = event[k];
        if (val !== undefined && val !== null && val !== '') {
          fields.push({ key: k, value: String(val) });
        }
      });

      Ember.set(event, '__displayFields', fields);
    });
  },

  _buildReadableJson(events) {
    const self = this;
    (events || []).forEach(function (event) {
      const clean = {};
      Object.keys(event).forEach(function (k) {
        if (!k.startsWith('__')) clean[k] = event[k];
      });
      Ember.set(event, '__jsonHighlighted', self._syntaxHighlight(JSON.stringify(clean, null, 2)));
    });
  },

  _syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        var cls = 'axm-json-number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'axm-json-key' : 'axm-json-string';
        } else if (/true|false/.test(match)) {
          cls = 'axm-json-boolean';
        } else if (/null/.test(match)) {
          cls = 'axm-json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      }
    );
  },

  actions: {
    runQuery() {
      this.set('block._state.error', null);
      this.set('block._state.isQuerying', true);

      const entity = this.get('block.entity');
      this.sendIntegrationMessage({
        action: 'RUN_QUERY',
        data: { entityValue: entity.value, entityType: entity.type }
      })
        .then((response) => {
          this.set('block._state.isQuerying', false);
          this.set('block.data.details.events', response.events || []);
          this.set('block.data.details.rowsMatched', response.rowsMatched);
          this.set('block.data.details.rowsExamined', response.rowsExamined);
          this.set('block.data.details.isPartial', response.isPartial);
          this.set('block.data.details.elapsedMs', response.elapsedMs);
          this.set('block.data.details.query', response.query);
          this.set('block.data.details.datasetName', response.datasetName);
          this.set('block.data.details.deepLink', response.deepLink);
          this.set('block.data.details.noResults', !response.events || response.events.length === 0);

          const events = response.events || [];
          this._initEventTabs(events);
          this._buildReadableJson(events);
          this._buildDisplayFields(events);
        })
        .catch((err) => {
          this.set('block._state.isQuerying', false);
          this.set('block._state.error', (err && err.detail) || 'Query failed. Please try again.');
        });
    },

    changeTab(tabName, eventIndex) {
      const events = this.get('details.events') || [];
      if (events[eventIndex]) {
        Ember.set(events[eventIndex], '__activeTab', tabName);
      }
    }
  }
});

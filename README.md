# Axiom — Polarity Integration

Search [Axiom.co](https://axiom.co) datasets using APL queries to cross-correlate IOCs and indicators against forensic event data. When an analyst highlights an IP address, hash, domain, email, URL, or custom entity in Polarity, this integration runs an on-demand APL search against a configured Axiom dataset and displays matching events directly in the overlay.

## Features

- On-demand APL full-text search (`where * has "entity"`) across a configured Axiom dataset
- Configurable APL query template with `{{entity}}` and `{{dataset}}` substitution
- Tabbed event view: **Fields** (priority fields first) and **JSON** (syntax-highlighted raw event)
- Summary tags: match count + dataset name
- Deep link to Axiom console
- Supports both API Token and Personal Access Token (PAT) authentication
- Supports all standard entity types + custom types via `supportsAdditionalCustomTypes`

## Installation

1. Install the integration on your Polarity server per standard procedure.
2. Run `npm install` in the integration directory.
3. Configure the options below.
4. Click **Save** — the integration will validate your token and dataset name.

## Configuration Options

### Authentication

Two auth methods are supported. Configure **one** of the following:

**Option A — API Token (Recommended)**
- Set `API Token` to a scoped Axiom API Token
- Leave `Personal Access Token` and `Org ID` blank
- API Tokens are scoped to specific datasets and actions — preferred for least privilege

**Option B — Personal Access Token (PAT)**
- Leave `API Token` blank
- Set `Personal Access Token` to your Axiom PAT
- Set `Org ID` to your Axiom organization ID (found in Axiom org settings → General)

### Options

| Option | Required | Default | Description |
|---|---|---|---|
| API Token | Conditional | — | Scoped API Token. Required if PAT is not set. |
| Personal Access Token (PAT) | Conditional | — | Full-access PAT. Required if API Token is not set. |
| Org ID | Conditional | — | Required when using PAT. Found in Axiom org settings. |
| Dataset Name | Required | — | Exact dataset name in your Axiom org (e.g., `forensic-events`). |
| Query Start Time | Optional | — | ISO 8601 start time (e.g., `2025-01-01T00:00:00Z`). Leave blank for Axiom default. |
| Query End Time | Optional | — | ISO 8601 end time. Leave blank to default to now. |
| APL Query Template | Required | `['{{dataset}}'] \| where * has "{{entity}}" \| limit 25` | APL query template. Must contain `{{entity}}` and `{{dataset}}`. |
| Deep Link URL | Required | `https://app.axiom.co` | Base URL for your Axiom console. Used to build the "Open in Axiom" link. |

### APL Query Template Customization

The default template performs a full-text search across all fields:
```
['{{dataset}}'] | where * has "{{entity}}" | limit 25
```

For faster, targeted queries when your dataset schema is known:
```
['{{dataset}}'] | where ip_src == "{{entity}}" | limit 25
```

`{{dataset}}` is replaced with the Dataset Name option value. `{{entity}}` is replaced with the highlighted entity value.

## Entity Types

Supports: IPv4, IPv6, IPv4CIDR, MD5, SHA1, SHA256, Email, Domain, URL, CVE, and any custom types configured via Polarity's custom entity settings.

## Supported Polarity Versions

Polarity 4.x and later with `polarity-integration-utils` v3.x.

## Prior Art / Reference

This integration is architecturally derived from [`polarityio/crowdstrike-ngsiem`](https://github.com/polarityio/crowdstrike-ngsiem). Key difference: Axiom uses **synchronous** queries (single POST → immediate results). The CrowdStrike NG-SIEM async polling pattern (createQueryJob → pollQueryJob) is **not** used here.

## License

Copyright © Polarity, Inc. All rights reserved.

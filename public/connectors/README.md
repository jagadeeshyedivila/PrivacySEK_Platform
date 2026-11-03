# Connector logos

Used by Data Discovery (Connect Tools & Services, connection lists). Served from `/connectors/<key>.svg`.

| File | Source | Licence |
|---|---|---|
| postgresql, mysql, oracle, mssql, salesforce, azureblob | [Devicon](https://github.com/devicons/devicon) v2.16.0 | MIT |
| snowflake, bigquery, gcs, gdrive, hana, s3 | [Simple Icons](https://github.com/simple-icons/simple-icons) v13.21.0, filled with the brand colour | CC0 1.0 |

`gcs.svg` uses Google blue (#4285F4) instead of Simple Icons' pale #AECBFA, which is unreadable on the white logo plate.

OneDrive has no logo in either set (Microsoft asked Simple Icons to remove its marks), so the UI shows a lettered badge.

All product names and logos are trademarks of their respective owners. They are used here only to identify the
service a connector integrates with, not to imply endorsement. Check each vendor's brand guidelines before
shipping beyond a demo.

To add a connector: drop `<key>.svg` here and set `logo: "<key>"` on its entry in
`src/modules/discovery/discoveryConfig.js`. SVGs must not contain scripts or external references.

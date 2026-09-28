# Hlonyane Google Sheets tenant backend

1. Open the Hlonyane tenant workbook while signed in as OMNI Data Manager.
2. Go to Extensions → Apps Script.
3. Replace the default Code.gs with the repository file `google-apps-script/Code.gs`.
4. Deploy → New deployment → Web app.
5. Execute as: Me.
6. Who has access: Anyone.
7. Copy the `/exec` Web App URL.
8. Put that URL into `tenant-data-config.js` as `window.HLONYANE_TENANT_DATA_API_URL`.

Admin writes are validated against the active Supabase admin session and only the configured Hlonyane admin email addresses are accepted.

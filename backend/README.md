# Secure portal backend

This folder contains the server-side foundation for the next deployment milestone. It is designed for Cloudflare D1 and keeps passwords, tenant enrollment, property assignment, furnishing status, sessions, and home/away dates off the browser.

The current static preview continues to work locally. Once D1 is connected, set `HLONYANE_API_URL` for the frontend and route these operations through the Worker/API layer rather than local storage.

Before production use: enable HTTPS, add rate limiting, rotate session tokens, seed administrators through a protected migration, and never store plaintext passwords.

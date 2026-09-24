# Portal API contract

- `POST /api/auth/login` → `{email,password}` → tenant session and assigned property.
- `POST /api/auth/logout` → invalidates the current session.
- `GET /api/tenant/me` → profile, property, furnishing, rent, and presence.
- `PATCH /api/tenant/password` → `{currentPassword,newPassword}`.
- `PATCH /api/tenant/presence` → `{awayFrom,awayTo}`.
- `POST /api/tenant/notice` → `{startsOn}` → creates a notice and queues landlord notification.
- `GET /api/admin/tenants` → enrolled tenants with home/away and notice status.
- `POST /api/admin/tenants` → enrol a tenant.
- `PATCH /api/admin/tenants/:id` → update assignment, furnishing, password, or active state.
- `POST /api/admin/tenants/:id/notice/acknowledge` → landlord acknowledges the notice and completes the vacancy update.

All tenant and admin endpoints must validate the server-side session and authorization before reading or changing records.

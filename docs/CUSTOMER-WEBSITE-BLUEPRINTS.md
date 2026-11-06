# Configurable customer websites — concept blueprints

The future customer-facing application is distinct from the owner dashboard. Customers should not each require a separately maintained codebase. Use a shared application with tenant-specific branding, enabled modules and permissions. Custom domains or bespoke pages are later options, not initial commitments.

## Template A: Heritage railway / museum
Top bar: organisation logo, site selector, alerts, user menu.
Slide-out sidebar: Home, Who's on site, Volunteers, Attendance, Rota, Events, Maintenance, Assets, Reports, Documents, Settings.
Home cards: people currently on site, today's tasks, upcoming events, open defects.
Core flow: volunteer clocks in on approved site device → appears on site list → authorised person closes shift → hours available in reports.
Controls: permission-based maintenance access, audit trail, printable records.

## Template B: Charity / community centre
Sidebar: Home, People, Shifts, Events, Rooms, Tasks, Reports, Documents, Settings.
Home: upcoming sessions, rota gaps, attendance totals, urgent tasks.
Core flow: coordinator publishes shift → volunteer accepts → attendance recorded → report exported.
Avoid storing unnecessary sensitive information about beneficiaries.

## Template C: Small maintenance business
Sidebar: Home, Sites, Assets, Work orders, Inspections, Staff, Schedule, Reports, Settings.
Home: overdue jobs, asset status, assigned jobs, inspection reminders.
Core flow: supervisor creates work order → assigns technician → technician adds outcome → supervisor signs off.
Photos, offline mode and integrations are future requirements to validate, not existing features.

## Template D: Small visitor attraction / hospitality
Sidebar: Home, Team, Shifts, Events, Equipment, Checklists, Reports, Settings.
Home: today's staffing, checks due, events, open incidents.
Sales integration is optional and should not be assumed.

## Configuration model
organisationId; displayName; logo; theme (header, accent, background); enabledModules; sites; roles; navigationOrder; customFields; plan.
Branding changes appearance only; never grants permissions.
Every module checks server-side entitlement and role, and every record is scoped to organisationId.

## Example page structure
Desktop: 56px header; collapsible left menu; title and action bar; compact summary cards; searchable table; detail drawer.
Mobile: header with hamburger; slide-out menu; cards stack; tables become readable rows; primary action stays visible.
Use EVLT's straightforward green header and practical information boxes as a design reference, without assuming all customers share its colours.

## Prototype acceptance
- Each example tenant has clearly different navigation and branding.
- No cross-tenant data or shared credentials.
- Mobile menu opens/closes predictably.
- Empty, loading, error and permission-denied states.
- Print/export layout is usable.
- Accessibility: keyboard, contrast, focus, labels and touch targets.

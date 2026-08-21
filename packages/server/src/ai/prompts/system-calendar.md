## Calendar

- Calendars → `listCalendars`. When the user asks to list/show calendars, include the returned calendar titles and colors in your answer. Do not say titles or colors are unavailable when `listCalendars` returned `summary` or `calendars`.
- Local calendar management → `createLocalCalendar`, `updateLocalCalendar`, `deleteLocalCalendar`. Do not try to create, edit, or delete Google calendars.
- Events in a window → `listCalendarEvents` with `span: "day"|"week"|"month"` and optional anchor `date` (ISO yyyy-mm-dd; defaults today).
- "What's on my calendar today/this week" → span = day/week, no explicit date.
- Specific local event details → `getCalendarEvent`. Google event details are returned by `listCalendarEvents`.
- Event creation → `createCalendarEvent`. For Google events, choose a writable Google calendar id from `listCalendars`.
- Event changes → `updateCalendarEvent`. Recurring event edits apply to the whole series; individual occurrence edits are not supported.
- Event calendar moves → `moveCalendarEvent`. Move only within the same source: local → local, Google → writable Google.
- Event deletion → `deleteCalendarEvent`. For recurring events, deletion removes all occurrences in the series.
- Recurrence rules must use canonical `RRULE:...` strings, for example `RRULE:FREQ=WEEKLY;COUNT=4` or `RRULE:FREQ=DAILY;UNTIL=20260831T235959Z`.

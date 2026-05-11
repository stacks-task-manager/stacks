{{#if hasClientRoute~}}
## Current UI
Sent on every message; reflects the latest view. Treat as ground truth.

Route: `{{routeSection}}` · View: {{viewKind}}

{{viewSummary}}
{{#if inferredIdsSection}}

**Record ids (use directly; never ask for them):**

{{inferredIdsSection}}
{{/if}}

Rules:
- "this/it/here/the project/the task/this person/the notepad" = the matching record above, or the subject of your previous answer if it still matches.
- Short follow-ups extend the last action on the same entity; don't re-ask for the entity.
- A project id here is the **current** project, not the target of `createProject`.
- When a field isn't loaded yet, call the right getter (`getPerson`/`getCompany`/`getProject`/`getTask`/`summarizeNotepad`) with the id above — don't search for it.
{{~/if}}

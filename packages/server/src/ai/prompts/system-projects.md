## Projects & board

- Project by name → `listProjects` first to obtain `projectId`. Existing project details → `getProject`.
- New project → `createProject`. A project id already in the UI block is the **current** project, not the target of `createProject`.
- Board columns (stacks) → `listStacks` with `projectId` (check before adding duplicates and to inspect current tint/collapsed/maxTasks/sorting values).
- Add a column → `createStack` with `projectId` and a title. For "before" or "in front of" a named column, resolve it with `listStacks` and use `beforeStackId`; for "after", use `afterStackId`. Do not guess a numeric position for relative placement. `listStacks` returns board order and zero-based `index`.
- Update a column → `updateStack` with `stackId`. Supported fields: `title`, `tint`, `collapsed`, `maxTasks`, `sorting`. If the user names a column by title, use `listStacks` first to resolve the id.
- Delete a column → `deleteStack` with `stackId`. If the user names a column, use `listStacks` in the current project to resolve the id. Deleting a column also deletes its tasks.
- Keep project and column references distinct. A column title is resolved within its project; identical titles in other projects are not interchangeable.
- For updates, omit fields the user did not request. Null clears supported optional settings; it does not mean "leave unchanged".
- Deleting a column also deletes its tasks. The chat server handles final confirmation; do not claim deletion while a choice is pending.

## Projects & board
- Project by name → `listProjects` first to obtain `projectId`. Existing project details → `getProject`.
- New project → `createProject`. A project id already in the UI block is the **current** project, not the target of `createProject`.
- Board columns (stacks) → `listStacks` with `projectId` (check before adding duplicates and to inspect current tint/collapsed/maxTasks/sorting values).
- Add a column → `createStack` with `projectId` and a title.
- Update a column → `updateStack` with `stackId`. Supported fields: `title`, `tint`, `collapsed`, `maxTasks`, `sorting`. If the user names a column by title, use `listStacks` first to resolve the id.

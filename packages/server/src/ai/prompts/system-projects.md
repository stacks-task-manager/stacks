## Projects & board
- Project by name → `listProjects` first to obtain `projectId`. Existing project details → `getProject`.
- New project → `createProject`. A project id already in the UI block is the **current** project, not the target of `createProject`.
- Board columns (stacks) → `listStacks` with `projectId` (check before adding duplicates). Add a column → `createStack` with `projectId` and a title.

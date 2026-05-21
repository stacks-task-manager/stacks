# API client

How `@stacks/app` talks to the API server. Everything HTTP-related funnels through one Axios instance with a handful of behaviors that are easy to miss if you're skimming.

The actual implementation is [`src/app/api/request.ts`](../src/app/api/request.ts) (~150 lines). This page documents *why* it's shaped the way it is, plus the conventions for the per-domain modules that wrap it.

## Table of Contents

- [At a glance](#at-a-glance)
- [The per-domain module pattern](#the-per-domain-module-pattern)
- [The shared Axios instance](#the-shared-axios-instance)
- [Request interceptor](#request-interceptor)
    - [`X-Instance-ID`](#x-instance-id)
    - [Date round-tripping](#date-round-tripping)
- [Response interceptor](#response-interceptor)
    - [Envelope unwrapping](#envelope-unwrapping)
    - [Date round-tripping (response side)](#date-round-tripping-response-side)
    - [Blob responses](#blob-responses)
- [Error handling](#error-handling)
    - [Opting out of the auto-toast](#opting-out-of-the-auto-toast)
    - [When *not* to use `silent`](#when-not-to-use-silent)
- [Adding a new endpoint](#adding-a-new-endpoint)
- [Gotchas](#gotchas)
- [Related](#related)

## At a glance

```
┌─────────────────────────────────────────────────────────────────┐
│ src/app/api/<domain>.ts            (TasksAPI, ProjectsAPI, …)   │
│   ↳ thin wrappers: return request.get/post/patch/delete(...)    │
├─────────────────────────────────────────────────────────────────┤
│ src/app/api/request.ts             (the single Axios instance)  │
│   • paramsSerializer (qs, arrayFormat: "repeat")                │
│   • request  interceptor:  Date → ISO, attach X-Instance-ID     │
│   • response interceptor:  ISO → Date, unwrap .data, toast err  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ axios
                         API server (/api/*)
```

There is **one** instance for the whole app — exported as the default export of `request.ts`. Domain modules import it and call its HTTP methods.

## The per-domain module pattern

Every backend resource has a matching file under [`src/app/api/`](../src/app/api/). They look like this ([`api/tasks.ts`](../src/app/api/tasks.ts) is a representative example):

```ts
import { ITask } from "@stacks/types";
import request from "./request";

export const TasksAPI = {
    list(params: TaskLoadParams): Promise<ITask[]> {
        return request.get("/api/tasks", { params });
    },
    create(task: Partial<ITask>): Promise<ITask> {
        return request.post("/api/tasks", { task });
    },
    update(taskId: string, data: Partial<ITask>): Promise<ITask> {
        return request.patch(`/api/tasks/${taskId}`, data);
    },
    delete(taskId: string): Promise<boolean> {
        return request.delete(`/api/tasks/${taskId}`);
    },
};
```

Three conventions:

- **Exported as `XAPI` object**, not loose functions. Lets callers do `import { TasksAPI } from "app/api"` and read `TasksAPI.update(...)` at the call site.
- **Returns the typed payload directly** (`Promise<ITask[]>`, not `Promise<AxiosResponse<ITask[]>>`). The response interceptor unwraps for you.
- **No `try`/`catch` here.** Errors propagate; actions decide whether to swallow or rethrow. The default behavior surfaces a toast either way (see [Error handling](#error-handling)).

Re-export each `XAPI` from the [`api/index.ts`](../src/app/api/index.ts) barrel.

## The shared Axios instance

```ts
const instance = axios.create({
    paramsSerializer: params => qs.stringify(params, { arrayFormat: "repeat" }),
});
```

The `paramsSerializer` is set so query arrays come out as `?ids=a&ids=b` (Hono's `c.req.queries("ids")` expects this form) rather than Axios's default `?ids[]=a&ids[]=b` or `?ids=a,b`.

There are no other options on the instance — base URL is implicit (same-origin), no default headers, no timeout. Everything else is in the interceptors.

## Request interceptor

```ts
instance.interceptors.request.use(config => {
    // 1. X-Instance-ID
    if (window.updatePoller?.instanceId) {
        config.headers["X-Instance-ID"] = window.updatePoller.instanceId;
    }

    // 2. Date → ISO on POST/PATCH bodies (skipped for FormData)
    if ((config.method === "post" || config.method === "patch")
        && config.data && !(config.data instanceof FormData)) {
        config.data = transformRequestData(config.data);  // recursive, mutates a clone
    }

    return config;
});
```

### `X-Instance-ID`

Every request carries an `X-Instance-ID: <uuid>` header that uniquely identifies this browser tab. It's generated once by `UpdatePoller` at boot ([ARCHITECTURE.md → Real-time updates](ARCHITECTURE.md#real-time-updates)) and stays the same for the life of the tab.

The server uses it to **distinguish self-originated mutations from peer mutations** when it broadcasts an update over WebSocket. If your tab posts `PATCH /api/tasks/abc`, the server still emits a `POLLINGTYPE.TASK` update — but it carries the same `X-Instance-ID`, so the client knows it triggered the change and can skip a redundant re-fetch.

You don't need to set this header anywhere. It's automatic for any request that goes through the shared instance.

### Date round-tripping

`Date` instances inside POST/PATCH bodies are serialized to ISO 8601 strings via `transformRequestData`:

```js
new Date()  ───►  "2026-05-15T14:32:10.123Z"
```

The recursion handles plain objects and arrays. It deliberately:

- **Skips `FormData`** so file uploads aren't touched.
- **Skips non-plain-object class instances** (`obj.constructor === Object` check). If you ever pass a `Map`, a `Set`, or a custom class as the body, it's passed through unchanged — which is almost certainly not what you want. Use a plain object.
- **Converts `undefined` to `null`** so JSON.stringify doesn't drop the key.

GET/DELETE requests are not touched — query params don't carry `Date` objects in practice. If you need to send a date as a query param, convert it explicitly (`.toISOString()` or your preferred format).

## Response interceptor

```ts
instance.interceptors.response.use(
    response => {
        if (response.config.responseType === "blob") return response.data;
        const { data } = response.data;                  // unwrap server envelope
        return transformDates(data) ?? null;             // ISO → Date
    },
    async error => { /* error handling, see below */ },
);
```

### Envelope unwrapping

The server wraps every JSON response in an envelope:

```json
{ "ok": true, "data": <the actual payload>, "message": "..." }
```

The interceptor returns just `response.data.data` — so your call site receives the bare payload:

```ts
const tasks: ITask[] = await request.get("/api/tasks");  // not { data: { data: ... } }
```

`null` is returned if the server response has no `data` field (e.g. some 204-shaped endpoints that still send a body).

### Date round-tripping (response side)

Incoming JSON strings that match an ISO timestamp or the app's local format `YYYY-MM-DD HH:mm:ss` are converted to `Date` instances by `transformDates`:

```js
"2026-05-15T14:32:10.123Z"   ───►  Date
"2026-05-15 14:32:10"        ───►  Date
"hello"                      ───►  "hello"
```

This is recursive — every string field in the response is checked. For typical task/project records that means `created`, `updated`, `startdate`, `duedate`, etc. all come back as `Date` instances ready to feed `date-fns`.

> **Heads-up:** the regex is forgiving (`/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/`). If you accept user free-text that happens to look like an ISO timestamp, it'll be coerced to a `Date` too. For domains like that, prefer a non-date-shaped key in the API contract.

### Blob responses

Endpoints used for file downloads set `responseType: "blob"` in the call:

```ts
return request.get(`/api/files/${id}/download`, { responseType: "blob" });
```

The interceptor short-circuits and returns the raw `response.data` blob without unwrapping or date-transforming.

## Error handling

The error branch of the response interceptor:

- **401 Unauthorized** → hard-redirects to `/login`. The server's auth check returns 401 for missing/invalid sessions; the client never tries to "recover" from this.
- **417 Expectation Failed** → returns silently (no toast). Used by the chunked upload progress endpoint; not a user-facing error.
- **Any other non-2xx** → shows a Blueprint toast with the error message, then **re-rejects the promise** so caller `try`/`catch` still works.

Toast intent and timeout depend on the status:

| Status | Intent | Timeout |
| --- | --- | --- |
| 404 | `WARNING` | 3 s |
| Everything else | `DANGER` | 30 s |

The message comes from `response.data.message`, falling back to `statusText`, then `error.message`, then `"Unknown error"`. Blob error payloads are read with `.text()` and parsed as JSON when possible — handy for download endpoints that fail.

### Opting out of the auto-toast

Pass `silent: true` in the request config when you want to handle the error yourself:

```ts
import request, { SilencedAxiosRequestConfig } from "app/api/request";

try {
    await request.get("/api/some-thing", { silent: true } as SilencedAxiosRequestConfig);
} catch (err) {
    // surface a custom error UI; no toast was shown by the interceptor
}
```

Typical uses: probing endpoints (where a 404 isn't really an error), background sync that shouldn't surface to the user, validation calls where the form already shows the error inline.

The `SilencedAxiosRequestConfig` type is exported from `request.ts` for convenience.

### When *not* to use `silent`

If the action genuinely failed and the user should know about it, let the toast fire. Adding a `try`/`catch` that re-toasts the same message is a common antipattern in PRs — the interceptor already did it.

## Adding a new endpoint

1. **Confirm the server route exists** (or add it — see [`docs/packages/server.md`](../../../docs/packages/server.md)).
2. **Create or extend the matching `XAPI` module** under [`src/app/api/`](../src/app/api/). Type the return as the bare payload, not the envelope. Import shared shapes from `@stacks/types`.
3. **Re-export from [`api/index.ts`](../src/app/api/index.ts)** if it's a new file.
4. **Call it from an action**, not a component. The action handles loading state, mutation of the store, and optimistic updates if applicable.
5. **For uploads**, build a `FormData` and pass it as `data`. The request interceptor will skip the date transform automatically. Most file flows go through `FileUploader` in `src/app/utils/` — check there before rolling your own.

## Gotchas

- **The Axios instance is the default export** — `import request from "./request"`. There's also a named export `SilencedAxiosRequestConfig` for type-narrowing.
- **`response.data.data`** is the canonical envelope. If you start seeing `{ ok, data, message }` shapes in your component, you've forgotten to use the shared instance.
- **Dates are real `Date` objects in the response.** Don't `new Date(task.created)` — that double-wraps. Conversely, in component props that came from a query string or URL param, you do still have a string.
- **No retries.** Failed requests reject; the caller (or the user) is responsible for retrying. The WebSocket layer has its own reconnect logic — that's separate.
- **No request cancellation by default.** If a view unmounts mid-request, the response will still resolve and (if it succeeds) mutate the store. Most flows tolerate this; if yours doesn't, plumb an `AbortController` through the action and pass `signal` in the request config.
- **CORS in dev is permissive.** In production set `CORS_ORIGINS` server-side (see [`docs/INSTALLATION.md`](../../../docs/INSTALLATION.md)).

## Related

- [ONBOARDING.md](ONBOARDING.md) — getting started, where API modules fit in the layout
- [ARCHITECTURE.md](ARCHITECTURE.md#real-time-updates) — how `X-Instance-ID` interacts with the WebSocket update stream
- [`docs/packages/server.md`](../../../docs/packages/server.md) — the API surface on the server side, including the auth model

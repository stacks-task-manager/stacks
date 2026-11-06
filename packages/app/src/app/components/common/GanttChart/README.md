# GanttChart

App-local React/TypeScript task timeline. The project view converts shared task/stack entities into
`GanttRow` trees; the chart owns only transient presentation and interaction state.

- Pass rows, `onActivate(id)`, and an awaited `onDatesChange(id, { startDate, endDate })` callback.
- Dates use local calendar days and inclusive end dates. Moving preserves the start time; moving or
  resizing the end normalizes it to end of day. Resizing cannot cross the other endpoint.
- The project action saves to the existing task API before applying dates to the store. The chart shows
  pending previews and restores the current row data if saving rejects; the API layer reports errors.
- Rows and timeline headers render within the visible viewport with overscan. Expansion state survives
  row updates, and scale/origin changes preserve the visible calendar date.
- Task names and bars open details. The row's date button opens a keyboard-accessible date editor;
  focused bars also support F2. Expanders expose `aria-expanded`; the divider supports arrow keys.
- Pointer gestures move, resize, or schedule an existing undated task. Escape cancels; edge scrolling
  begins after movement. The task pane can be resized or hidden independently of the timeline.
- The scroll viewport is keyboard-focusable. The toolbar exposes Today and return-to-top controls.

Pure calendar/hierarchy helpers and component behavior have colocated Jest tests. The project adapter
and persistence action have separate tests. Browser flows live in `playwright/tests/project/gantt.spec.ts`;
its 1,000-row load fixture is mocked and is not evidence of server persistence. The date-edit workflow
uses real records and checks dates after reload. Test records and changed preferences are restored.

The Gantt includes subtasks independently of the board's subtask-visibility toggle. Other project
filters still apply. Task-pane elbow arrows identify child rows even before dates are assigned;
SVG arrows connect scheduled parent bars to their immediate child bars. These are hierarchy links,
not scheduling dependencies. Links follow date previews, disappear with collapsed descendants, and
render only for the visible row window, including children whose parent has scrolled above it.

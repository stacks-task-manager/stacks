export default {
  esm: "rollup",
  cjs: "rollup",
  cssModule: true,
  extraExternal: [
    "react-dom",
    "lodash/debounce",
    "lodash/find",
    "lodash/throttle",
  ],
}

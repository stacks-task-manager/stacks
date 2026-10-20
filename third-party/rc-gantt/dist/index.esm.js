import { usePersistFn, useClickAway, useSize } from 'ahooks';
import React, { createContext, useContext, useState, useMemo, useRef, useCallback, createRef, memo, useEffect, useImperativeHandle } from 'react';
import { observer } from 'mobx-react-lite';
import classNames from 'classnames';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import debounce from 'lodash/debounce';
import find from 'lodash/find';
import throttle from 'lodash/throttle';
import { observable, action, computed, runInAction, toJS } from 'mobx';

function _arrayLikeToArray(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function _arrayWithHoles(r) {
  if (Array.isArray(r)) return r;
}
function _arrayWithoutHoles(r) {
  if (Array.isArray(r)) return _arrayLikeToArray(r);
}
function asyncGeneratorStep(n, t, e, r, o, a, c) {
  try {
    var i = n[a](c),
      u = i.value;
  } catch (n) {
    return void e(n);
  }
  i.done ? t(u) : Promise.resolve(u).then(r, o);
}
function _asyncToGenerator(n) {
  return function () {
    var t = this,
      e = arguments;
    return new Promise(function (r, o) {
      var a = n.apply(t, e);
      function _next(n) {
        asyncGeneratorStep(a, r, o, _next, _throw, "next", n);
      }
      function _throw(n) {
        asyncGeneratorStep(a, r, o, _next, _throw, "throw", n);
      }
      _next(void 0);
    });
  };
}
function _classCallCheck(a, n) {
  if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
}
function _defineProperties(e, r) {
  for (var t = 0; t < r.length; t++) {
    var o = r[t];
    o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o);
  }
}
function _createClass(e, r, t) {
  return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", {
    writable: !1
  }), e;
}
function _createForOfIteratorHelper(r, e) {
  var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (!t) {
    if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) {
      t && (r = t);
      var n = 0,
        F = function () {};
      return {
        s: F,
        n: function () {
          return n >= r.length ? {
            done: !0
          } : {
            done: !1,
            value: r[n++]
          };
        },
        e: function (r) {
          throw r;
        },
        f: F
      };
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  var o,
    a = !0,
    u = !1;
  return {
    s: function () {
      t = t.call(r);
    },
    n: function () {
      var r = t.next();
      return a = r.done, r;
    },
    e: function (r) {
      u = !0, o = r;
    },
    f: function () {
      try {
        a || null == t.return || t.return();
      } finally {
        if (u) throw o;
      }
    }
  };
}
function _defineProperty(e, r, t) {
  return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[r] = t, e;
}
function _iterableToArray(r) {
  if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r);
}
function _iterableToArrayLimit(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e,
      n,
      i,
      u,
      a = [],
      f = !0,
      o = !1;
    try {
      if (i = (t = t.call(r)).next, 0 === l) {
        if (Object(t) !== t) return;
        f = !1;
      } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0);
    } catch (r) {
      o = !0, n = r;
    } finally {
      try {
        if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function (r) {
      return Object.getOwnPropertyDescriptor(e, r).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), !0).forEach(function (r) {
      _defineProperty(e, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return e;
}
function _objectWithoutProperties(e, t) {
  if (null == e) return {};
  var o,
    r,
    i = _objectWithoutPropertiesLoose(e, t);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
  }
  return i;
}
function _objectWithoutPropertiesLoose(r, e) {
  if (null == r) return {};
  var t = {};
  for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
    if (-1 !== e.indexOf(n)) continue;
    t[n] = r[n];
  }
  return t;
}
function _regeneratorRuntime() {
  _regeneratorRuntime = function () {
    return e;
  };
  var t,
    e = {},
    r = Object.prototype,
    n = r.hasOwnProperty,
    o = Object.defineProperty || function (t, e, r) {
      t[e] = r.value;
    },
    i = "function" == typeof Symbol ? Symbol : {},
    a = i.iterator || "@@iterator",
    c = i.asyncIterator || "@@asyncIterator",
    u = i.toStringTag || "@@toStringTag";
  function define(t, e, r) {
    return Object.defineProperty(t, e, {
      value: r,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }), t[e];
  }
  try {
    define({}, "");
  } catch (t) {
    define = function (t, e, r) {
      return t[e] = r;
    };
  }
  function wrap(t, e, r, n) {
    var i = e && e.prototype instanceof Generator ? e : Generator,
      a = Object.create(i.prototype),
      c = new Context(n || []);
    return o(a, "_invoke", {
      value: makeInvokeMethod(t, r, c)
    }), a;
  }
  function tryCatch(t, e, r) {
    try {
      return {
        type: "normal",
        arg: t.call(e, r)
      };
    } catch (t) {
      return {
        type: "throw",
        arg: t
      };
    }
  }
  e.wrap = wrap;
  var h = "suspendedStart",
    l = "suspendedYield",
    f = "executing",
    s = "completed",
    y = {};
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  var p = {};
  define(p, a, function () {
    return this;
  });
  var d = Object.getPrototypeOf,
    v = d && d(d(values([])));
  v && v !== r && n.call(v, a) && (p = v);
  var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p);
  function defineIteratorMethods(t) {
    ["next", "throw", "return"].forEach(function (e) {
      define(t, e, function (t) {
        return this._invoke(e, t);
      });
    });
  }
  function AsyncIterator(t, e) {
    function invoke(r, o, i, a) {
      var c = tryCatch(t[r], t, o);
      if ("throw" !== c.type) {
        var u = c.arg,
          h = u.value;
        return h && "object" == typeof h && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) {
          invoke("next", t, i, a);
        }, function (t) {
          invoke("throw", t, i, a);
        }) : e.resolve(h).then(function (t) {
          u.value = t, i(u);
        }, function (t) {
          return invoke("throw", t, i, a);
        });
      }
      a(c.arg);
    }
    var r;
    o(this, "_invoke", {
      value: function (t, n) {
        function callInvokeWithMethodAndArg() {
          return new e(function (e, r) {
            invoke(t, n, e, r);
          });
        }
        return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
      }
    });
  }
  function makeInvokeMethod(e, r, n) {
    var o = h;
    return function (i, a) {
      if (o === f) throw Error("Generator is already running");
      if (o === s) {
        if ("throw" === i) throw a;
        return {
          value: t,
          done: !0
        };
      }
      for (n.method = i, n.arg = a;;) {
        var c = n.delegate;
        if (c) {
          var u = maybeInvokeDelegate(c, n);
          if (u) {
            if (u === y) continue;
            return u;
          }
        }
        if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) {
          if (o === h) throw o = s, n.arg;
          n.dispatchException(n.arg);
        } else "return" === n.method && n.abrupt("return", n.arg);
        o = f;
        var p = tryCatch(e, r, n);
        if ("normal" === p.type) {
          if (o = n.done ? s : l, p.arg === y) continue;
          return {
            value: p.arg,
            done: n.done
          };
        }
        "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg);
      }
    };
  }
  function maybeInvokeDelegate(e, r) {
    var n = r.method,
      o = e.iterator[n];
    if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y;
    var i = tryCatch(o, e.iterator, r.arg);
    if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y;
    var a = i.arg;
    return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y);
  }
  function pushTryEntry(t) {
    var e = {
      tryLoc: t[0]
    };
    1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e);
  }
  function resetTryEntry(t) {
    var e = t.completion || {};
    e.type = "normal", delete e.arg, t.completion = e;
  }
  function Context(t) {
    this.tryEntries = [{
      tryLoc: "root"
    }], t.forEach(pushTryEntry, this), this.reset(!0);
  }
  function values(e) {
    if (e || "" === e) {
      var r = e[a];
      if (r) return r.call(e);
      if ("function" == typeof e.next) return e;
      if (!isNaN(e.length)) {
        var o = -1,
          i = function next() {
            for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next;
            return next.value = t, next.done = !0, next;
          };
        return i.next = i;
      }
    }
    throw new TypeError(typeof e + " is not iterable");
  }
  return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", {
    value: GeneratorFunctionPrototype,
    configurable: !0
  }), o(GeneratorFunctionPrototype, "constructor", {
    value: GeneratorFunction,
    configurable: !0
  }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) {
    var e = "function" == typeof t && t.constructor;
    return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name));
  }, e.mark = function (t) {
    return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t;
  }, e.awrap = function (t) {
    return {
      __await: t
    };
  }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () {
    return this;
  }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) {
    void 0 === i && (i = Promise);
    var a = new AsyncIterator(wrap(t, r, n, o), i);
    return e.isGeneratorFunction(r) ? a : a.next().then(function (t) {
      return t.done ? t.value : a.next();
    });
  }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () {
    return this;
  }), define(g, "toString", function () {
    return "[object Generator]";
  }), e.keys = function (t) {
    var e = Object(t),
      r = [];
    for (var n in e) r.push(n);
    return r.reverse(), function next() {
      for (; r.length;) {
        var t = r.pop();
        if (t in e) return next.value = t, next.done = !1, next;
      }
      return next.done = !0, next;
    };
  }, e.values = values, Context.prototype = {
    constructor: Context,
    reset: function (e) {
      if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t);
    },
    stop: function () {
      this.done = !0;
      var t = this.tryEntries[0].completion;
      if ("throw" === t.type) throw t.arg;
      return this.rval;
    },
    dispatchException: function (e) {
      if (this.done) throw e;
      var r = this;
      function handle(n, o) {
        return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o;
      }
      for (var o = this.tryEntries.length - 1; o >= 0; --o) {
        var i = this.tryEntries[o],
          a = i.completion;
        if ("root" === i.tryLoc) return handle("end");
        if (i.tryLoc <= this.prev) {
          var c = n.call(i, "catchLoc"),
            u = n.call(i, "finallyLoc");
          if (c && u) {
            if (this.prev < i.catchLoc) return handle(i.catchLoc, !0);
            if (this.prev < i.finallyLoc) return handle(i.finallyLoc);
          } else if (c) {
            if (this.prev < i.catchLoc) return handle(i.catchLoc, !0);
          } else {
            if (!u) throw Error("try statement without catch or finally");
            if (this.prev < i.finallyLoc) return handle(i.finallyLoc);
          }
        }
      }
    },
    abrupt: function (t, e) {
      for (var r = this.tryEntries.length - 1; r >= 0; --r) {
        var o = this.tryEntries[r];
        if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
          var i = o;
          break;
        }
      }
      i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
      var a = i ? i.completion : {};
      return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a);
    },
    complete: function (t, e) {
      if ("throw" === t.type) throw t.arg;
      return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y;
    },
    finish: function (t) {
      for (var e = this.tryEntries.length - 1; e >= 0; --e) {
        var r = this.tryEntries[e];
        if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y;
      }
    },
    catch: function (t) {
      for (var e = this.tryEntries.length - 1; e >= 0; --e) {
        var r = this.tryEntries[e];
        if (r.tryLoc === t) {
          var n = r.completion;
          if ("throw" === n.type) {
            var o = n.arg;
            resetTryEntry(r);
          }
          return o;
        }
      }
      throw Error("illegal catch attempt");
    },
    delegateYield: function (e, r, n) {
      return this.delegate = {
        iterator: values(e),
        resultName: r,
        nextLoc: n
      }, "next" === this.method && (this.arg = t), y;
    }
  }, e;
}
function _slicedToArray(r, e) {
  return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
}
function _toConsumableArray(r) {
  return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread();
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _unsupportedIterableToArray(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
  }
}

var context = /*#__PURE__*/createContext({});

/**
 * 将树形数据向下递归为一维数组
 *
 * @param {any} arr 数据源
 */
function flattenDeep() {
  var array = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var depth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var parent = arguments.length > 2 ? arguments[2] : undefined;
  var index = 0;
  return array.reduce(function (flat, item) {
    item._depth = depth;
    item._parent = parent;
    item._index = index;
    index += 1;
    return [].concat(_toConsumableArray(flat), [item], _toConsumableArray(item.children && !item.collapsed ? flattenDeep(item.children, depth + 1, item) : []));
  }, []);
}
function getMaxRange(bar) {
  var minTranslateX = 0;
  var maxTranslateX = 0;
  var temporary = [bar];
  while (temporary.length > 0) {
    var current = temporary.shift();
    if (current) {
      var _current$translateX = current.translateX,
        translateX = _current$translateX === void 0 ? 0 : _current$translateX,
        _current$width = current.width,
        width = _current$width === void 0 ? 0 : _current$width;
      if (minTranslateX === 0) minTranslateX = translateX || 0;
      if (translateX) {
        minTranslateX = Math.min(translateX, minTranslateX);
        maxTranslateX = Math.max(translateX + width, maxTranslateX);
      }
      if (current.task.children && current.task.children.length > 0) {
        var _iterator = _createForOfIteratorHelper(current.task.children),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var t = _step.value;
            if (t._bar) temporary.push(t._bar);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }
    }
  }
  return {
    translateX: minTranslateX,
    width: maxTranslateX - minTranslateX
  };
}
var genKey = function () {
  var key = 0;
  return function () {
    return key++;
  };
}();
function transverseData() {
  var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var startDateKey = arguments.length > 1 ? arguments[1] : undefined;
  var endDateKey = arguments.length > 2 ? arguments[2] : undefined;
  var result = [];
  var _iterator2 = _createForOfIteratorHelper(data),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var record = _step2.value;
      var item = {
        key: genKey(),
        record: record,
        content: '',
        group: record.group,
        startDate: record[startDateKey] || '',
        endDate: record[endDateKey] || '',
        collapsed: record.collapsed || false,
        children: transverseData(record.children || [], startDateKey, endDateKey)
      };
      result.push(item);
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  return result;
}

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (!css || typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z$h = ".index_gantt-group-bar__4ZNZl {\n  position: absolute;\n  top: 0;\n  left: 0;\n  display: flex;\n}\n.index_gantt-group-bar__4ZNZl .index_gantt-bar__2G8GM {\n  position: relative;\n  top: -3px;\n}\n";
styleInject(css_248z$h);

var height = 8;
var GroupBar = function GroupBar(_ref) {
  var data = _ref.data;
  var _useContext = useContext(context),
    prefixCls = _useContext.prefixCls,
    renderGroupBar = _useContext.renderGroupBar;
  var translateY = data.translateY;
  var _getMaxRange = getMaxRange(data),
    translateX = _getMaxRange.translateX,
    width = _getMaxRange.width;
  return /*#__PURE__*/React.createElement("div", {
    role: "none",
    className: classNames("".concat(prefixCls, "-group-bar")),
    style: {
      transform: "translate(".concat(translateX, "px, ").concat(translateY, "px)")
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixCls, "-bar")
  }, renderGroupBar ? renderGroupBar(data, {
    width: width,
    height: height
  }) : (/*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    version: "1.1",
    width: width + 1,
    height: height + 8,
    viewBox: "0 0 ".concat(width + 1, " ").concat(height + 8)
  }, /*#__PURE__*/React.createElement("path", {
    fill: data.record.background || '#7B809E',
    d: "\n              M".concat(width - 2, ",0.5\n              l-").concat(width - 4, ",0\n              c-0.41421,0 -0.78921,0.16789 -1.06066,0.43934\n              c-0.27145,0.27145 -0.43934,0.64645 -0.43934,1.06066\n              l0,13.65\n              l6,-7\n              l").concat(width - 12, ",0\n              l6,7\n              l0,-13.65\n              c-0.03256,-0.38255 -0.20896,-0.724 -0.47457,-0.97045\n              c-0.26763,-0.24834 -0.62607,-0.40013 -1.01995,-0.40013z\n            ")
  }))))));
};
var GroupBar$1 = observer(GroupBar);

var AutoScroller = /*#__PURE__*/_createClass(function AutoScroller(_ref) {
  var _this = this;
  var scroller = _ref.scroller,
    _ref$rate = _ref.rate,
    rate = _ref$rate === void 0 ? 5 : _ref$rate,
    _ref$space = _ref.space,
    space = _ref$space === void 0 ? 50 : _ref$space,
    onAutoScroll = _ref.onAutoScroll,
    reachEdge = _ref.reachEdge;
  _classCallCheck(this, AutoScroller);
  this.scroller = null;
  this.autoScrollPos = 0;
  this.clientX = null;
  this.scrollTimer = null;
  this.handleDraggingMouseMove = function (event) {
    _this.clientX = event.clientX;
  };
  this.handleScroll = function (position) {
    if (_this.reachEdge(position)) {
      return;
    }
    if (position === 'left') {
      _this.autoScrollPos -= _this.rate;
      _this.onAutoScroll(-_this.rate);
    } else if (position === 'right') {
      _this.autoScrollPos += _this.rate;
      _this.onAutoScroll(_this.rate);
    }
  };
  this.start = function () {
    _this.autoScrollPos = 0;
    document.addEventListener('mousemove', _this.handleDraggingMouseMove);
    var _scrollFunc = function scrollFunc() {
      var _a, _b;
      if (_this.scroller && _this.clientX !== null) {
        if (_this.clientX + _this.space > ((_a = _this.scroller) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect().right)) {
          _this.handleScroll('right');
        } else if (_this.clientX - _this.space < ((_b = _this.scroller) === null || _b === void 0 ? void 0 : _b.getBoundingClientRect().left)) {
          _this.handleScroll('left');
        }
      }
      _this.scrollTimer = requestAnimationFrame(_scrollFunc);
    };
    _this.scrollTimer = requestAnimationFrame(_scrollFunc);
  };
  // 停止自动滚动
  this.stop = function () {
    document.removeEventListener('mousemove', _this.handleDraggingMouseMove);
    if (_this.scrollTimer) {
      cancelAnimationFrame(_this.scrollTimer);
    }
  };
  this.scroller = scroller || null;
  this.rate = rate;
  this.space = space;
  this.onAutoScroll = onAutoScroll;
  this.reachEdge = reachEdge;
});

var _excluded = ["type", "onBeforeResize", "onResize", "onResizeEnd", "minWidth", "grid", "defaultSize", "scroller", "autoScroll", "onAutoScroll", "reachEdge", "clickStart", "children", "disabled"];
var snap = function snap(n, size) {
  return Math.round(n / size) * size;
};
var DragResize = function DragResize(_ref) {
  var type = _ref.type,
    onBeforeResize = _ref.onBeforeResize,
    onResize = _ref.onResize,
    onResizeEnd = _ref.onResizeEnd,
    _ref$minWidth = _ref.minWidth,
    minWidth = _ref$minWidth === void 0 ? 0 : _ref$minWidth,
    grid = _ref.grid,
    _ref$defaultSize = _ref.defaultSize,
    defaultX = _ref$defaultSize.x,
    defaultWidth = _ref$defaultSize.width,
    scroller = _ref.scroller,
    _ref$autoScroll = _ref.autoScroll,
    enableAutoScroll = _ref$autoScroll === void 0 ? true : _ref$autoScroll,
    onAutoScroll = _ref.onAutoScroll,
    _ref$reachEdge = _ref.reachEdge,
    reachEdge = _ref$reachEdge === void 0 ? function () {
      return false;
    } : _ref$reachEdge,
    _ref$clickStart = _ref.clickStart,
    clickStart = _ref$clickStart === void 0 ? false : _ref$clickStart,
    children = _ref.children,
    _ref$disabled = _ref.disabled,
    disabled = _ref$disabled === void 0 ? false : _ref$disabled,
    otherProps = _objectWithoutProperties(_ref, _excluded);
  var _useState = useState(false),
    _useState2 = _slicedToArray(_useState, 2),
    resizing = _useState2[0],
    setResizing = _useState2[1];
  var handleAutoScroll = usePersistFn(function (delta) {
    updateSize();
    onAutoScroll(delta);
  });
  // TODO persist reachEdge
  var autoScroll = useMemo(function () {
    return new AutoScroller({
      scroller: scroller,
      onAutoScroll: handleAutoScroll,
      reachEdge: reachEdge
    });
  }, [handleAutoScroll, scroller, reachEdge]);
  var positionRef = useRef({
    clientX: 0,
    width: defaultWidth,
    x: defaultX
  });
  var moveRef = useRef({
    clientX: 0
  });
  var updateSize = usePersistFn(function () {
    if (disabled) return;
    var distance = moveRef.current.clientX - positionRef.current.clientX + autoScroll.autoScrollPos;
    switch (type) {
      case 'left':
        {
          var width = positionRef.current.width - distance;
          if (minWidth !== undefined) width = Math.max(width, minWidth);
          if (grid) width = snap(width, grid);
          var pos = width - positionRef.current.width;
          var x = positionRef.current.x - pos;
          onResize({
            width: width,
            x: x
          });
          break;
        }
      // 向右，x不变，只变宽度
      case 'right':
        {
          var _width = positionRef.current.width + distance;
          if (minWidth !== undefined) _width = Math.max(_width, minWidth);
          if (grid) _width = snap(_width, grid);
          var _x = positionRef.current.x;
          onResize({
            width: _width,
            x: _x
          });
          break;
        }
      case 'move':
        {
          var _width2 = positionRef.current.width;
          var rightDistance = distance;
          if (grid) rightDistance = snap(distance, grid);
          var _x2 = positionRef.current.x + rightDistance;
          onResize({
            width: _width2,
            x: _x2
          });
          break;
        }
    }
  });
  var handleMouseMove = usePersistFn(function (event) {
    if (disabled) return;
    if (!resizing) {
      setResizing(true);
      if (!clickStart) onBeforeResize && onBeforeResize();
    }
    moveRef.current.clientX = event.clientX;
    updateSize();
  });
  var handleMouseUp = usePersistFn(function () {
    if (disabled) return;
    autoScroll.stop();
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    if (resizing) {
      setResizing(false);
      onResizeEnd && onResizeEnd({
        x: positionRef.current.x,
        width: positionRef.current.width
      });
    }
  });
  var handleMouseDown = usePersistFn(function (event) {
    if (disabled) return;
    event.stopPropagation();
    if (enableAutoScroll && scroller) autoScroll.start();
    if (clickStart) {
      onBeforeResize && onBeforeResize();
      setResizing(true);
    }
    positionRef.current.clientX = event.clientX;
    positionRef.current.x = defaultX;
    positionRef.current.width = defaultWidth;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  });
  return /*#__PURE__*/React.createElement("div", _objectSpread2({
    role: 'none',
    onMouseDown: handleMouseDown
  }, otherProps), resizing && /*#__PURE__*/createPortal(/*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      zIndex: 9999,
      cursor: disabled ? 'not-allowed' : 'col-resize'
    }
  }), document.body), children);
};
var DragResize$1 = observer(DragResize);

var css_248z$g = ".index_gantt-invalid-task-bar__2h7Dt {\n  position: absolute;\n  left: 0;\n  width: 100vw;\n}\n.index_gantt-invalid-task-bar-block__33wph {\n  position: absolute;\n  width: 16px;\n  min-width: 8px;\n  height: 9px;\n  left: 0;\n  border: 1px solid;\n  border-radius: 2px;\n  cursor: pointer;\n  z-index: 1;\n}\n.index_gantt-invalid-task-bar-date__6z_uT {\n  position: absolute;\n  top: -6px;\n  white-space: nowrap;\n  color: #262626;\n  font-size: 12px;\n}\n";
styleInject(css_248z$g);

var barH = 8;
var startX = 0;
var renderInvalidBarDefault = function renderInvalidBarDefault(element) {
  return element;
};
var InvalidTaskBar = function InvalidTaskBar(_ref) {
  var data = _ref.data;
  var _useContext = useContext(context),
    store = _useContext.store,
    prefixCls = _useContext.prefixCls,
    _useContext$renderInv = _useContext.renderInvalidBar,
    renderInvalidBar = _useContext$renderInv === void 0 ? renderInvalidBarDefault : _useContext$renderInv;
  var triggerRef = useRef(null);
  var translateY = data.translateY,
    translateX = data.translateX,
    width = data.width,
    dateTextFormat = data.dateTextFormat,
    record = data.record;
  var _useState = useState(false),
    _useState2 = _slicedToArray(_useState, 2),
    visible = _useState2[0],
    setVisible = _useState2[1];
  var _ref2 = record || {},
    _ref2$disabled = _ref2.disabled,
    disabled = _ref2$disabled === void 0 ? false : _ref2$disabled;
  var viewTranslateX = store.translateX,
    rowHeight = store.rowHeight;
  var top = translateY;
  var prefixClsInvalidTaskBar = "".concat(prefixCls, "-invalid-task-bar");
  var handleMouseEnter = useCallback(function () {
    var _a, _b;
    if (data.stepGesture === 'moving') return;
    startX = ((_b = (_a = triggerRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect()) === null || _b === void 0 ? void 0 : _b.left) || 0;
    setVisible(true);
  }, [data.stepGesture]);
  var handleMouseLeave = useCallback(function () {
    if (data.stepGesture === 'moving') return;
    setVisible(false);
    store.handleInvalidBarLeave();
  }, [data.stepGesture, store]);
  var handleMouseMove = useCallback(function (event) {
    if (data.stepGesture === 'moving') return;
    var pointerX = viewTranslateX + (event.clientX - startX);
    // eslint-disable-next-line no-shadow
    var _store$startXRectBar = store.startXRectBar(pointerX),
      left = _store$startXRectBar.left,
      width = _store$startXRectBar.width;
    store.handleInvalidBarHover(data, left, Math.ceil(width));
  }, [data, store, viewTranslateX]);
  var handleBeforeResize = function handleBeforeResize() {
    store.handleInvalidBarDragStart(data);
  };
  var handleResize = useCallback(function (_ref3) {
    var newWidth = _ref3.width,
      x = _ref3.x;
    store.updateBarSize(data, {
      width: newWidth,
      x: x
    });
  }, [data, store]);
  var handleLeftResizeEnd = useCallback(function (oldSize) {
    store.handleInvalidBarDragEnd(data, oldSize);
  }, [data, store]);
  var handleAutoScroll = useCallback(function (delta) {
    store.setTranslateX(store.translateX + delta);
  }, [store]);
  var reachEdge = usePersistFn(function (position) {
    return position === 'left' && store.translateX <= 0;
  });
  if (disabled) return null;
  return /*#__PURE__*/React.createElement(DragResize$1, {
    onMouseMove: handleMouseMove,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onResize: handleResize,
    onResizeEnd: handleLeftResizeEnd,
    defaultSize: {
      x: translateX,
      width: width
    },
    minWidth: 30,
    grid: 30,
    type: 'right',
    scroller: store.chartElementRef.current || undefined,
    onAutoScroll: handleAutoScroll,
    reachEdge: reachEdge,
    onBeforeResize: handleBeforeResize,
    clickStart: true
  }, /*#__PURE__*/React.createElement("div", {
    ref: triggerRef,
    className: prefixClsInvalidTaskBar,
    style: {
      left: viewTranslateX,
      height: rowHeight,
      transform: "translateY(".concat(top - (rowHeight - barH) / 2, "px")
    }
  }), visible && renderInvalidBar(/*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsInvalidTaskBar, "-block"),
    "aria-haspopup": 'true',
    "aria-expanded": 'false',
    style: {
      left: translateX,
      width: Math.ceil(width),
      transform: "translateY(".concat(top, "px)"),
      backgroundColor: '#7B90FF',
      borderColor: '#7B90FF'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsInvalidTaskBar, "-date"),
    style: {
      right: Math.ceil(width + 6)
    }
  }, dateTextFormat(translateX)), /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsInvalidTaskBar, "-date"),
    style: {
      left: Math.ceil(width + 6)
    }
  }, dateTextFormat(translateX + width - width / store.pxUnitAmp))), data));
};
var InvalidTaskBar$1 = observer(InvalidTaskBar);

var ROW_HEIGHT = 40;
var HEADER_HEIGHT = 56;
var BAR_HEIGHT = 8;
var TOP_PADDING = 0;
var TABLE_INDENT = 30;

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn) {
  var module = { exports: {} };
	return fn(module, module.exports), module.exports;
}

var advancedFormat = createCommonjsModule(function (module, exports) {
!function(e,t){module.exports=t();}(commonjsGlobal,(function(){return function(e,t){var r=t.prototype,n=r.format;r.format=function(e){var t=this,r=this.$locale();if(!this.isValid())return n.bind(this)(e);var s=this.$utils(),a=(e||"YYYY-MM-DDTHH:mm:ssZ").replace(/\[([^\]]+)]|Q|wo|ww|w|WW|W|zzz|z|gggg|GGGG|Do|X|x|k{1,2}|S/g,(function(e){switch(e){case"Q":return Math.ceil((t.$M+1)/3);case"Do":return r.ordinal(t.$D);case"gggg":return t.weekYear();case"GGGG":return t.isoWeekYear();case"wo":return r.ordinal(t.week(),"W");case"w":case"ww":return s.s(t.week(),"w"===e?1:2,"0");case"W":case"WW":return s.s(t.isoWeek(),"W"===e?1:2,"0");case"k":case"kk":return s.s(String(0===t.$H?24:t.$H),"k"===e?1:2,"0");case"X":return Math.floor(t.$d.getTime()/1e3);case"x":return t.$d.getTime();case"z":return "["+t.offsetName()+"]";case"zzz":return "["+t.offsetName("long")+"]";default:return e}}));return n.bind(this)(a)};}}));
});

var isBetween = createCommonjsModule(function (module, exports) {
!function(e,i){module.exports=i();}(commonjsGlobal,(function(){return function(e,i,t){i.prototype.isBetween=function(e,i,s,f){var n=t(e),o=t(i),r="("===(f=f||"()")[0],u=")"===f[1];return (r?this.isAfter(n,s):!this.isBefore(n,s))&&(u?this.isBefore(o,s):!this.isAfter(o,s))||(r?this.isBefore(n,s):!this.isAfter(n,s))&&(u?this.isAfter(o,s):!this.isBefore(o,s))};}}));
});

var isLeapYear = createCommonjsModule(function (module, exports) {
!function(e,t){module.exports=t();}(commonjsGlobal,(function(){return function(e,t){t.prototype.isLeapYear=function(){return this.$y%4==0&&this.$y%100!=0||this.$y%400==0};}}));
});

var quarterOfYear = createCommonjsModule(function (module, exports) {
!function(t,n){module.exports=n();}(commonjsGlobal,(function(){var t="month",n="quarter";return function(e,i){var r=i.prototype;r.quarter=function(t){return this.$utils().u(t)?Math.ceil((this.month()+1)/3):this.month(this.month()%3+3*(t-1))};var s=r.add;r.add=function(e,i){return e=Number(e),this.$utils().p(i)===n?this.add(3*e,t):s.bind(this)(e,i)};var u=r.startOf;r.startOf=function(e,i){var r=this.$utils(),s=!!r.u(i)||i;if(r.p(e)===n){var o=this.quarter()-1;return s?this.month(3*o).startOf(t).startOf("day"):this.month(3*o+2).endOf(t).endOf("day")}return u.bind(this)(e,i)};}}));
});

var weekday = createCommonjsModule(function (module, exports) {
!function(e,t){module.exports=t();}(commonjsGlobal,(function(){return function(e,t){t.prototype.weekday=function(e){var t=this.$locale().weekStart||0,i=this.$W,n=(i<t?i+7:i)-t;return this.$utils().u(e)?n:this.subtract(n,"day").add(e,"day")};}}));
});

var weekOfYear = createCommonjsModule(function (module, exports) {
!function(e,t){module.exports=t();}(commonjsGlobal,(function(){var e="week",t="year";return function(i,n,r){var f=n.prototype;f.week=function(i){if(void 0===i&&(i=null),null!==i)return this.add(7*(i-this.week()),"day");var n=this.$locale().yearStart||1;if(11===this.month()&&this.date()>25){var f=r(this).startOf(t).add(1,t).date(n),s=r(this).endOf(e);if(f.isBefore(s))return 1}var a=r(this).startOf(t).date(n).startOf(e).subtract(1,"millisecond"),o=this.diff(a,e,!0);return o<0?r(this).startOf("week").week():Math.ceil(o)},f.weeks=function(e){return void 0===e&&(e=null),this.week(e)};}}));
});

var Gantt;
(function (Gantt) {
  (function (ESightValues) {
    ESightValues[ESightValues["day"] = 2880] = "day";
    ESightValues[ESightValues["week"] = 3600] = "week";
    ESightValues[ESightValues["month"] = 14400] = "month";
    ESightValues[ESightValues["quarter"] = 86400] = "quarter";
    ESightValues[ESightValues["halfYear"] = 115200] = "halfYear";
  })(Gantt.ESightValues || (Gantt.ESightValues = {}));
})(Gantt || (Gantt = {}));

dayjs.extend(weekday);
dayjs.extend(weekOfYear);
dayjs.extend(quarterOfYear);
dayjs.extend(advancedFormat);
dayjs.extend(isBetween);
dayjs.extend(isLeapYear);
var ONE_DAY_MS = 86400000;
// 视图日视图、周视图、月视图、季视图、年视图
var getViewTypeList = function getViewTypeList(locale) {
  return [{
    type: 'day',
    label: locale.day,
    value: Gantt.ESightValues.day
  }, {
    type: 'week',
    label: locale.week,
    value: Gantt.ESightValues.week
  }, {
    type: 'month',
    label: locale.month,
    value: Gantt.ESightValues.month
  }, {
    type: 'quarter',
    label: locale.quarter,
    value: Gantt.ESightValues.quarter
  }, {
    type: 'halfYear',
    label: locale.halfYear,
    value: Gantt.ESightValues.halfYear
  }];
};
function isRestDay(date) {
  var calc = [0, 6];
  return calc.includes(dayjs(date).weekday());
}
var GanttStore = /*#__PURE__*/function () {
  function GanttStore(_ref) {
    var _this = this;
    var rowHeight = _ref.rowHeight,
      _ref$disabled = _ref.disabled,
      disabled = _ref$disabled === void 0 ? false : _ref$disabled,
      customSights = _ref.customSights,
      locale = _ref.locale,
      columnsWidth = _ref.columnsWidth;
    _classCallCheck(this, GanttStore);
    this.locale = _objectSpread2({}, defaultLocale);
    this.data = [];
    this.originData = [];
    this.columns = [];
    this.dependencies = [];
    this.scrolling = false;
    this.scrollTop = 0;
    this.collapse = false;
    this.showSelectionIndicator = false;
    this.selectionIndicatorTop = 0;
    this.dragging = null;
    this.draggingType = null;
    this.disabled = false;
    this.viewTypeList = getViewTypeList(this.locale);
    this.gestureKeyPress = false;
    this.mainElementRef = /*#__PURE__*/createRef();
    this.chartElementRef = /*#__PURE__*/createRef();
    this.isPointerPress = false;
    this.startDateKey = 'startDate';
    this.endDateKey = 'endDate';
    this.autoScrollPos = 0;
    this.clientX = 0;
    this.onUpdate = function () {
      return Promise.resolve(true);
    };
    this.isRestDay = isRestDay;
    this.getWidthByDate = function (startDate, endDate) {
      return (endDate.valueOf() - startDate.valueOf()) / _this.pxUnitAmp;
    };
    this.startXRectBar = function (startX) {
      var date = dayjs(startX * _this.pxUnitAmp);
      var dayRect = function dayRect() {
        var stAmp = date.startOf('day');
        var endAmp = date.endOf('day');
        // @ts-ignore
        var left = stAmp / _this.pxUnitAmp;
        // @ts-ignore
        var width = (endAmp - stAmp) / _this.pxUnitAmp;
        return {
          left: left,
          width: width
        };
      };
      var weekRect = function weekRect() {
        if (date.weekday() === 0) date = date.add(-1, 'week');
        var left = date.weekday(1).startOf('day').valueOf() / _this.pxUnitAmp;
        var width = (7 * 24 * 60 * 60 * 1000 - 1000) / _this.pxUnitAmp;
        return {
          left: left,
          width: width
        };
      };
      var monthRect = function monthRect() {
        var stAmp = date.startOf('month').valueOf();
        var endAmp = date.endOf('month').valueOf();
        var left = stAmp / _this.pxUnitAmp;
        var width = (endAmp - stAmp) / _this.pxUnitAmp;
        return {
          left: left,
          width: width
        };
      };
      var map = {
        day: dayRect,
        week: weekRect,
        month: weekRect,
        quarter: monthRect,
        halfYear: monthRect
      };
      return map[_this.sightConfig.type]();
    };
    this.handleWheel = function (event) {
      if (event.deltaX !== 0) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (_this._wheelTimer) clearTimeout(_this._wheelTimer);
      // 水平滚动
      if (Math.abs(event.deltaX) > 0) {
        _this.scrolling = true;
        _this.setTranslateX(_this.translateX + event.deltaX);
      }
      _this._wheelTimer = window.setTimeout(function () {
        _this.scrolling = false;
      }, 100);
    };
    this.handleScroll = function (event) {
      var scrollTop = event.currentTarget.scrollTop;
      _this.scrollY(scrollTop);
    };
    this.scrollY = throttle(function (scrollTop) {
      _this.scrollTop = scrollTop;
    }, 100);
    this.handleMouseMove = debounce(function (event) {
      if (!_this.isPointerPress) _this.showSelectionBar(event);
    }, 5);
    this.getHovered = function (top) {
      var baseTop = top - top % _this.rowHeight;
      return _this.selectionIndicatorTop >= baseTop && _this.selectionIndicatorTop <= baseTop + _this.rowHeight;
    };
    this.width = 1320;
    this.height = 418;
    this.viewTypeList = customSights.length ? customSights : getViewTypeList(locale);
    var sightConfig = customSights.length ? customSights[0] : getViewTypeList(locale)[0];
    var translateX = dayjs(this.getStartDate()).valueOf() / (sightConfig.value * 1000);
    var bodyWidth = this.width;
    var viewWidth = 704;
    var tableWidth = columnsWidth !== null && columnsWidth !== void 0 ? columnsWidth : 500;
    this.viewWidth = viewWidth;
    this.tableWidth = tableWidth;
    this.translateX = translateX;
    this.sightConfig = sightConfig;
    this.bodyWidth = bodyWidth;
    this.rowHeight = rowHeight;
    this.disabled = disabled;
    this.locale = locale;
  }
  return _createClass(GanttStore, [{
    key: "getStartDate",
    value: function getStartDate() {
      return dayjs().subtract(10, 'day').toString();
    }
  }, {
    key: "setIsRestDay",
    value: function setIsRestDay(function_) {
      this.isRestDay = function_ || isRestDay;
    }
  }, {
    key: "setData",
    value: function setData(data, startDateKey, endDateKey) {
      this.startDateKey = startDateKey;
      this.endDateKey = endDateKey;
      this.originData = data;
      this.data = transverseData(data, startDateKey, endDateKey);
    }
  }, {
    key: "toggleCollapse",
    value: function toggleCollapse() {
      if (this.tableWidth > 0) {
        this.tableWidth = 0;
        this.viewWidth = this.width - this.tableWidth;
      } else {
        this.initWidth();
      }
    }
  }, {
    key: "setRowCollapse",
    value: function setRowCollapse(item, collapsed) {
      item.collapsed = collapsed;
      // this.barList = this.getBarList();
    }
  }, {
    key: "setOnUpdate",
    value: function setOnUpdate(onUpdate) {
      this.onUpdate = onUpdate;
    }
  }, {
    key: "setColumns",
    value: function setColumns(columns) {
      this.columns = columns;
    }
  }, {
    key: "setDependencies",
    value: function setDependencies(dependencies) {
      this.dependencies = dependencies;
    }
  }, {
    key: "setHideTable",
    value: function setHideTable() {
      var isHidden = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      if (isHidden) {
        this.tableWidth = 0;
        this.viewWidth = this.width - this.tableWidth;
      } else {
        this.initWidth();
      }
    }
  }, {
    key: "handlePanMove",
    value: function handlePanMove(translateX) {
      this.scrolling = true;
      this.setTranslateX(translateX);
    }
  }, {
    key: "handlePanEnd",
    value: function handlePanEnd() {
      this.scrolling = false;
    }
  }, {
    key: "syncSize",
    value: function syncSize(size) {
      if (!size.height || !size.width) return;
      var width = size.width,
        height = size.height;
      if (this.height !== height) this.height = height;
      if (this.width !== width) {
        this.width = width;
        this.initWidth();
      }
    }
  }, {
    key: "handleResizeTableWidth",
    value: function handleResizeTableWidth(width) {
      var columnsWidthArr = this.columns.filter(function (column) {
        return column.width > 0;
      });
      if (this.columns.length === columnsWidthArr.length) return;
      this.tableWidth = width;
      this.viewWidth = this.width - this.tableWidth;
    }
  }, {
    key: "initWidth",
    value: function initWidth() {
      this.tableWidth = this.totalColumnWidth || 250;
      this.viewWidth = this.width - this.tableWidth;
      // 图表宽度不能小于 200
      if (this.viewWidth < 200) {
        this.viewWidth = 200;
        this.tableWidth = this.width - this.viewWidth;
      }
    }
  }, {
    key: "setTranslateX",
    value: function setTranslateX(translateX) {
      this.translateX = Math.max(translateX, 0);
    }
  }, {
    key: "switchSight",
    value: function switchSight(type) {
      var target = find(this.viewTypeList, {
        type: type
      });
      if (target) {
        this.sightConfig = target;
        this.setTranslateX(dayjs(this.getStartDate()).valueOf() / (target.value * 1000));
      }
    }
  }, {
    key: "scrollToToday",
    value: function scrollToToday() {
      var translateX = this.todayTranslateX - this.viewWidth / 2;
      this.setTranslateX(translateX);
    }
  }, {
    key: "getTranslateXByDate",
    value: function getTranslateXByDate(date) {
      return dayjs(date).startOf('day').valueOf() / this.pxUnitAmp;
    }
  }, {
    key: "todayTranslateX",
    get: function get() {
      return dayjs().startOf('day').valueOf() / this.pxUnitAmp;
    }
  }, {
    key: "scrollBarWidth",
    get: function get() {
      var MIN_WIDTH = 30;
      return Math.max(this.viewWidth / this.scrollWidth * 160, MIN_WIDTH);
    }
  }, {
    key: "scrollLeft",
    get: function get() {
      var rate = this.viewWidth / this.scrollWidth;
      var currentDate = dayjs(this.translateAmp).toString();
      // 默认滚动条在中间
      var half = (this.viewWidth - this.scrollBarWidth) / 2;
      var viewScrollLeft = half + rate * (this.getTranslateXByDate(currentDate) - this.getTranslateXByDate(this.getStartDate()));
      return Math.min(Math.max(viewScrollLeft, 0), this.viewWidth - this.scrollBarWidth);
    }
  }, {
    key: "scrollWidth",
    get: function get() {
      // TODO 待研究
      // 最小宽度
      var init = this.viewWidth + 200;
      return Math.max(Math.abs(this.viewWidth + this.translateX - this.getTranslateXByDate(this.getStartDate())), init);
    }
    // 内容区滚动高度
  }, {
    key: "bodyClientHeight",
    get: function get() {
      // 1是边框
      return this.height - HEADER_HEIGHT - 1;
    }
  }, {
    key: "getColumnsWidth",
    get: function get() {
      var _a;
      if (this.columns.length === 1 && ((_a = this.columns[0]) === null || _a === void 0 ? void 0 : _a.width) < 200) return [200];
      var totalColumnWidth = this.columns.reduce(function (width, item) {
        return width + (item.width || 0);
      }, 0);
      var totalFlex = this.columns.reduce(function (total, item) {
        return total + (item.width ? 0 : item.flex || 1);
      }, 0);
      var restWidth = this.tableWidth - totalColumnWidth;
      return this.columns.map(function (column) {
        if (column.width) return column.width;
        if (column.flex) return restWidth * (column.flex / totalFlex);
        return restWidth * (1 / totalFlex);
      });
    }
  }, {
    key: "totalColumnWidth",
    get: function get() {
      return this.getColumnsWidth.reduce(function (width, item) {
        return width + (item || 0);
      }, 0);
    }
    // 内容区滚动区域域高度
  }, {
    key: "bodyScrollHeight",
    get: function get() {
      var height = this.getBarList.length * this.rowHeight + TOP_PADDING;
      if (height < this.bodyClientHeight) height = this.bodyClientHeight;
      return height;
    }
    // 1px对应的毫秒数
  }, {
    key: "pxUnitAmp",
    get: function get() {
      return this.sightConfig.value * 1000;
    }
    /** 当前开始时间毫秒数 */
  }, {
    key: "translateAmp",
    get: function get() {
      var translateX = this.translateX;
      return this.pxUnitAmp * translateX;
    }
  }, {
    key: "getDurationAmp",
    value: function getDurationAmp() {
      var clientWidth = this.viewWidth;
      return this.pxUnitAmp * clientWidth;
    }
  }, {
    key: "getMajorList",
    value: function getMajorList() {
      var majorFormatMap = {
        day: this.locale.majorFormat.day,
        week: this.locale.majorFormat.week,
        month: this.locale.majorFormat.month,
        quarter: this.locale.majorFormat.quarter,
        halfYear: this.locale.majorFormat.halfYear
      };
      var translateAmp = this.translateAmp;
      var endAmp = translateAmp + this.getDurationAmp();
      var type = this.sightConfig.type;
      var format = majorFormatMap[type];
      var getNextDate = function getNextDate(start) {
        if (type === 'day' || type === 'week') return start.add(1, 'month');
        return start.add(1, 'year');
      };
      var getStart = function getStart(date) {
        if (type === 'day' || type === 'week') return date.startOf('month');
        return date.startOf('year');
      };
      var getEnd = function getEnd(date) {
        if (type === 'day' || type === 'week') return date.endOf('month');
        return date.endOf('year');
      };
      // 初始化当前时间
      var currentDate = dayjs(translateAmp);
      var dates = [];
      // 对可视区域内的时间进行迭代
      while (currentDate.isBetween(translateAmp - 1, endAmp + 1)) {
        var majorKey = currentDate.format(format);
        var start = currentDate;
        var end = getEnd(start);
        if (dates.length > 0) start = getStart(currentDate);
        dates.push({
          label: majorKey,
          startDate: start,
          endDate: end
        });
        // 获取下次迭代的时间
        start = getStart(currentDate);
        currentDate = getNextDate(start);
      }
      return this.majorAmp2Px(dates);
    }
  }, {
    key: "majorAmp2Px",
    value: function majorAmp2Px(ampList) {
      var pxUnitAmp = this.pxUnitAmp;
      return ampList.map(function (item) {
        var startDate = item.startDate;
        var endDate = item.endDate;
        var label = item.label;
        var left = startDate.valueOf() / pxUnitAmp;
        var width = (endDate.valueOf() - startDate.valueOf()) / pxUnitAmp;
        return {
          label: label,
          left: left,
          width: width,
          key: startDate.format('YYYY-MM-DD HH:mm:ss')
        };
      });
    }
  }, {
    key: "getMinorList",
    value: function getMinorList() {
      var _this2 = this;
      var minorFormatMap = {
        day: this.locale.minorFormat.day,
        week: this.locale.minorFormat.week,
        month: this.locale.minorFormat.month,
        quarter: this.locale.minorFormat.quarter,
        halfYear: this.locale.minorFormat.halfYear
      };
      var fstHalfYear = new Set([0, 1, 2, 3, 4, 5]);
      var startAmp = this.translateAmp;
      var endAmp = startAmp + this.getDurationAmp();
      var format = minorFormatMap[this.sightConfig.type];
      // eslint-disable-next-line unicorn/consistent-function-scoping
      var getNextDate = function getNextDate(start) {
        var map = {
          day: function day() {
            return start.add(1, 'day');
          },
          week: function week() {
            return start.add(1, 'week');
          },
          month: function month() {
            return start.add(1, 'month');
          },
          quarter: function quarter() {
            return start.add(1, 'quarter');
          },
          halfYear: function halfYear() {
            return start.add(6, 'month');
          }
        };
        return map[_this2.sightConfig.type]();
      };
      var setStart = function setStart(date) {
        var map = {
          day: function day() {
            return date.startOf('day');
          },
          week: function week() {
            return date.weekday(1).hour(0).minute(0).second(0);
          },
          month: function month() {
            return date.startOf('month');
          },
          quarter: function quarter() {
            return date.startOf('quarter');
          },
          halfYear: function halfYear() {
            if (fstHalfYear.has(date.month())) return date.month(0).startOf('month');
            return date.month(6).startOf('month');
          }
        };
        return map[_this2.sightConfig.type]();
      };
      var setEnd = function setEnd(start) {
        var map = {
          day: function day() {
            return start.endOf('day');
          },
          week: function week() {
            return start.weekday(7).hour(23).minute(59).second(59);
          },
          month: function month() {
            return start.endOf('month');
          },
          quarter: function quarter() {
            return start.endOf('quarter');
          },
          halfYear: function halfYear() {
            if (fstHalfYear.has(start.month())) return start.month(5).endOf('month');
            return start.month(11).endOf('month');
          }
        };
        return map[_this2.sightConfig.type]();
      };
      var getMinorKey = function getMinorKey(date) {
        if (_this2.sightConfig.type === 'halfYear') return date.format(format) + (fstHalfYear.has(date.month()) ? _this2.locale.firstHalf : _this2.locale.secondHalf);
        return date.format(format);
      };
      // 初始化当前时间
      var currentDate = dayjs(startAmp);
      var dates = [];
      while (currentDate.isBetween(startAmp - 1, endAmp + 1)) {
        var minorKey = getMinorKey(currentDate);
        var start = setStart(currentDate);
        var end = setEnd(start);
        dates.push({
          label: minorKey.split('-').pop(),
          startDate: start,
          endDate: end
        });
        currentDate = getNextDate(start);
      }
      return this.minorAmp2Px(dates);
    }
  }, {
    key: "minorAmp2Px",
    value: function minorAmp2Px(ampList) {
      var _this3 = this;
      var pxUnitAmp = this.pxUnitAmp;
      return ampList.map(function (item) {
        var startDate = item.startDate;
        var endDate = item.endDate;
        var label = item.label;
        var left = startDate.valueOf() / pxUnitAmp;
        var width = (endDate.valueOf() - startDate.valueOf()) / pxUnitAmp;
        var isWeek = false;
        if (_this3.sightConfig.type === 'day') isWeek = _this3.isRestDay(startDate.toString());
        return {
          label: label,
          left: left,
          width: width,
          isWeek: isWeek,
          key: startDate.format('YYYY-MM-DD HH:mm:ss')
        };
      });
    }
  }, {
    key: "getTaskBarThumbVisible",
    value: function getTaskBarThumbVisible(barInfo) {
      var width = barInfo.width,
        barTranslateX = barInfo.translateX,
        invalidDateRange = barInfo.invalidDateRange;
      if (invalidDateRange) return false;
      var rightSide = this.translateX + this.viewWidth;
      return barTranslateX + width < this.translateX || barTranslateX - rightSide > 0;
    }
  }, {
    key: "scrollToBar",
    value: function scrollToBar(barInfo, type) {
      var barTranslateX = barInfo.translateX,
        width = barInfo.width;
      var translateX1 = this.translateX + this.viewWidth / 2;
      var translateX2 = barTranslateX + width;
      var diffX = Math.abs(translateX2 - translateX1);
      var translateX = this.translateX + diffX;
      if (type === 'left') translateX = this.translateX - diffX;
      this.setTranslateX(translateX);
    }
  }, {
    key: "getBarList",
    get: function get() {
      var _this4 = this;
      var pxUnitAmp = this.pxUnitAmp,
        data = this.data;
      // 最小宽度
      var minStamp = 11 * pxUnitAmp;
      // TODO 去除高度读取
      var height = 8;
      var baseTop = TOP_PADDING + this.rowHeight / 2 - height / 2;
      var topStep = this.rowHeight;
      var dateTextFormat = function dateTextFormat(startX) {
        return dayjs(startX * pxUnitAmp).format('YYYY-MM-DD');
      };
      var getDateWidth = function getDateWidth(start, endX) {
        var startDate = dayjs(start * pxUnitAmp);
        var endDate = dayjs(endX * pxUnitAmp);
        return "".concat(startDate.diff(endDate, 'day') + 1);
      };
      var flattenData = flattenDeep(data);
      var barList = flattenData.map(function (item, index) {
        var valid = item.startDate && item.endDate;
        var startAmp = dayjs(item.startDate || 0).startOf('day').valueOf();
        var endAmp = dayjs(item.endDate || 0).endOf('day').valueOf();
        // 开始结束日期相同默认一天
        if (Math.abs(endAmp - startAmp) < minStamp) {
          startAmp = dayjs(item.startDate || 0).startOf('day').valueOf();
          endAmp = dayjs(item.endDate || 0).endOf('day').add(minStamp, 'millisecond').valueOf();
        }
        var width = valid ? (endAmp - startAmp) / pxUnitAmp : 0;
        var translateX = valid ? startAmp / pxUnitAmp : 0;
        var translateY = baseTop + index * topStep;
        var _parent = item._parent;
        var record = _objectSpread2(_objectSpread2({}, item.record), {}, {
          disabled: _this4.disabled
        });
        var bar = {
          key: item.key,
          task: item,
          record: record,
          translateX: translateX,
          translateY: translateY,
          width: width,
          label: item.content,
          stepGesture: 'end',
          invalidDateRange: !item.endDate || !item.startDate,
          dateTextFormat: dateTextFormat,
          getDateWidth: getDateWidth,
          loading: false,
          _group: item.group,
          _collapsed: item.collapsed,
          _depth: item._depth,
          _index: item._index,
          _parent: _parent,
          _childrenCount: !item.children ? 0 : item.children.length // 子任务
        };
        item._bar = bar;
        return bar;
      });
      // 进行展开扁平
      return observable(barList);
    }
    // 虚拟滚动
  }, {
    key: "getVisibleRows",
    get: function get() {
      var visibleHeight = this.bodyClientHeight;
      // 多渲染几个，减少空白
      var visibleRowCount = Math.ceil(visibleHeight / this.rowHeight) + 10;
      var start = Math.max(Math.ceil(this.scrollTop / this.rowHeight) - 5, 0);
      return {
        start: start,
        count: visibleRowCount
      };
    }
  }, {
    key: "handleMouseLeave",
    value: function handleMouseLeave() {
      this.showSelectionIndicator = false;
    }
  }, {
    key: "showSelectionBar",
    value: function showSelectionBar(event) {
      var _a, _b;
      var scrollTop = ((_a = this.mainElementRef.current) === null || _a === void 0 ? void 0 : _a.scrollTop) || 0;
      var _ref2 = ((_b = this.mainElementRef.current) === null || _b === void 0 ? void 0 : _b.getBoundingClientRect()) || {
          top: 0
        },
        top = _ref2.top;
      // 内容区高度
      var contentHeight = this.getBarList.length * this.rowHeight;
      var offsetY = event.clientY - top + scrollTop;
      if (offsetY - contentHeight > TOP_PADDING) {
        this.showSelectionIndicator = false;
      } else {
        var topValue = Math.floor((offsetY - TOP_PADDING) / this.rowHeight) * this.rowHeight + TOP_PADDING;
        this.showSelectionIndicator = true;
        this.selectionIndicatorTop = topValue;
      }
    }
  }, {
    key: "handleDragStart",
    value: function handleDragStart(barInfo, type) {
      this.dragging = barInfo;
      this.draggingType = type;
      barInfo.stepGesture = 'start';
      this.isPointerPress = true;
    }
  }, {
    key: "handleDragEnd",
    value: function handleDragEnd() {
      if (this.dragging) {
        this.dragging.stepGesture = 'end';
        this.dragging = null;
      }
      this.draggingType = null;
      this.isPointerPress = false;
    }
  }, {
    key: "handleInvalidBarLeave",
    value: function handleInvalidBarLeave() {
      this.handleDragEnd();
    }
  }, {
    key: "handleInvalidBarHover",
    value: function handleInvalidBarHover(barInfo, left, width) {
      barInfo.translateX = left;
      barInfo.width = width;
      this.handleDragStart(barInfo, 'create');
    }
  }, {
    key: "handleInvalidBarDragStart",
    value: function handleInvalidBarDragStart(barInfo) {
      barInfo.stepGesture = 'moving';
    }
  }, {
    key: "handleInvalidBarDragEnd",
    value: function handleInvalidBarDragEnd(barInfo, oldSize) {
      barInfo.invalidDateRange = false;
      this.handleDragEnd();
      this.updateTaskDate(barInfo, oldSize, 'create');
    }
  }, {
    key: "updateBarSize",
    value: function updateBarSize(barInfo, _ref3) {
      var width = _ref3.width,
        x = _ref3.x;
      barInfo.width = width;
      barInfo.translateX = Math.max(x, 0);
      barInfo.stepGesture = 'moving';
    }
  }, {
    key: "getMovedDay",
    value: function getMovedDay(ms) {
      return Math.round(ms / ONE_DAY_MS);
    }
    /** 更新时间 */
  }, {
    key: "updateTaskDate",
    value: (function () {
      var _updateTaskDate = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(barInfo, oldSize, type) {
        var translateX, width, task, record, oldStartDate, oldEndDate, startDate, endDate, moveTime, _moveTime, _moveTime2, success;
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              translateX = barInfo.translateX, width = barInfo.width, task = barInfo.task, record = barInfo.record;
              oldStartDate = barInfo.task.startDate;
              oldEndDate = barInfo.task.endDate;
              startDate = oldStartDate;
              endDate = oldEndDate;
              if (type === 'move') {
                moveTime = this.getMovedDay((translateX - oldSize.x) * this.pxUnitAmp); // 移动，只根据移动距离偏移
                startDate = dayjs(oldStartDate).add(moveTime, 'day').format('YYYY-MM-DD HH:mm:ss');
                endDate = dayjs(oldEndDate).add(moveTime, 'day').hour(23).minute(59).second(59).format('YYYY-MM-DD HH:mm:ss');
              } else if (type === 'left') {
                _moveTime = this.getMovedDay((translateX - oldSize.x) * this.pxUnitAmp); // 左侧移动，只改变开始时间
                startDate = dayjs(oldStartDate).add(_moveTime, 'day').format('YYYY-MM-DD HH:mm:ss');
              } else if (type === 'right') {
                _moveTime2 = this.getMovedDay((width - oldSize.width) * this.pxUnitAmp); // 右侧移动，只改变结束时间
                endDate = dayjs(oldEndDate).add(_moveTime2, 'day').hour(23).minute(59).second(59).format('YYYY-MM-DD HH:mm:ss');
              } else if (type === 'create') {
                // 创建
                startDate = dayjs(translateX * this.pxUnitAmp).format('YYYY-MM-DD HH:mm:ss');
                endDate = dayjs((translateX + width) * this.pxUnitAmp).subtract(1).hour(23).minute(59).second(59).format('YYYY-MM-DD HH:mm:ss');
              }
              if (!(startDate === oldStartDate && endDate === oldEndDate)) {
                _context.next = 8;
                break;
              }
              return _context.abrupt("return");
            case 8:
              runInAction(function () {
                barInfo.loading = true;
              });
              _context.next = 11;
              return this.onUpdate(toJS(record), startDate, endDate);
            case 11:
              success = _context.sent;
              if (success) {
                runInAction(function () {
                  task.startDate = startDate;
                  task.endDate = endDate;
                });
              } else {
                barInfo.width = oldSize.width;
                barInfo.translateX = oldSize.x;
              }
            case 13:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function updateTaskDate(_x, _x2, _x3) {
        return _updateTaskDate.apply(this, arguments);
      }
      return updateTaskDate;
    }())
  }, {
    key: "isToday",
    value: function isToday(key) {
      var now = dayjs().format('YYYY-MM-DD');
      var target = dayjs(key).format('YYYY-MM-DD');
      return target === now;
    }
  }]);
}();
__decorate([observable], GanttStore.prototype, "data", void 0);
__decorate([observable], GanttStore.prototype, "originData", void 0);
__decorate([observable], GanttStore.prototype, "columns", void 0);
__decorate([observable], GanttStore.prototype, "dependencies", void 0);
__decorate([observable], GanttStore.prototype, "scrolling", void 0);
__decorate([observable], GanttStore.prototype, "scrollTop", void 0);
__decorate([observable], GanttStore.prototype, "collapse", void 0);
__decorate([observable], GanttStore.prototype, "tableWidth", void 0);
__decorate([observable], GanttStore.prototype, "viewWidth", void 0);
__decorate([observable], GanttStore.prototype, "width", void 0);
__decorate([observable], GanttStore.prototype, "height", void 0);
__decorate([observable], GanttStore.prototype, "bodyWidth", void 0);
__decorate([observable], GanttStore.prototype, "translateX", void 0);
__decorate([observable], GanttStore.prototype, "sightConfig", void 0);
__decorate([observable], GanttStore.prototype, "showSelectionIndicator", void 0);
__decorate([observable], GanttStore.prototype, "selectionIndicatorTop", void 0);
__decorate([observable], GanttStore.prototype, "dragging", void 0);
__decorate([observable], GanttStore.prototype, "draggingType", void 0);
__decorate([observable], GanttStore.prototype, "disabled", void 0);
__decorate([action], GanttStore.prototype, "setData", null);
__decorate([action], GanttStore.prototype, "toggleCollapse", null);
__decorate([action], GanttStore.prototype, "setRowCollapse", null);
__decorate([action], GanttStore.prototype, "setOnUpdate", null);
__decorate([action], GanttStore.prototype, "setColumns", null);
__decorate([action], GanttStore.prototype, "setDependencies", null);
__decorate([action], GanttStore.prototype, "setHideTable", null);
__decorate([action], GanttStore.prototype, "handlePanMove", null);
__decorate([action], GanttStore.prototype, "handlePanEnd", null);
__decorate([action], GanttStore.prototype, "syncSize", null);
__decorate([action], GanttStore.prototype, "handleResizeTableWidth", null);
__decorate([action], GanttStore.prototype, "initWidth", null);
__decorate([action], GanttStore.prototype, "setTranslateX", null);
__decorate([action], GanttStore.prototype, "switchSight", null);
__decorate([action], GanttStore.prototype, "scrollToToday", null);
__decorate([computed], GanttStore.prototype, "todayTranslateX", null);
__decorate([computed], GanttStore.prototype, "scrollBarWidth", null);
__decorate([computed], GanttStore.prototype, "scrollLeft", null);
__decorate([computed], GanttStore.prototype, "scrollWidth", null);
__decorate([computed], GanttStore.prototype, "bodyClientHeight", null);
__decorate([computed], GanttStore.prototype, "getColumnsWidth", null);
__decorate([computed], GanttStore.prototype, "totalColumnWidth", null);
__decorate([computed], GanttStore.prototype, "bodyScrollHeight", null);
__decorate([computed], GanttStore.prototype, "pxUnitAmp", null);
__decorate([computed], GanttStore.prototype, "translateAmp", null);
__decorate([computed], GanttStore.prototype, "getBarList", null);
__decorate([action], GanttStore.prototype, "handleWheel", void 0);
__decorate([computed], GanttStore.prototype, "getVisibleRows", null);
__decorate([action], GanttStore.prototype, "showSelectionBar", null);
__decorate([action], GanttStore.prototype, "handleDragStart", null);
__decorate([action], GanttStore.prototype, "handleDragEnd", null);
__decorate([action], GanttStore.prototype, "handleInvalidBarLeave", null);
__decorate([action], GanttStore.prototype, "handleInvalidBarHover", null);
__decorate([action], GanttStore.prototype, "handleInvalidBarDragStart", null);
__decorate([action], GanttStore.prototype, "handleInvalidBarDragEnd", null);
__decorate([action], GanttStore.prototype, "updateBarSize", null);
__decorate([action], GanttStore.prototype, "updateTaskDate", null);

var css_248z$f = ".index_gantt-task-bar__30WmO {\n  position: absolute;\n  top: 0;\n  left: 0;\n  display: flex;\n}\n.index_gantt-task-bar-loading__1swHo {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  cursor: not-allowed;\n  z-index: 9;\n}\n.index_gantt-task-bar-bar__u9Yq- {\n  position: relative;\n  height: 8px;\n  line-height: 8px;\n  border-radius: 4px;\n  top: -1px;\n  cursor: pointer;\n}\n.index_gantt-task-bar-invalid-date-range__1B-Qh {\n  display: none;\n}\n.index_gantt-task-bar-resize-bg__3zr0q {\n  position: absolute;\n  left: 0;\n  top: -5px;\n  border-radius: 4px;\n  box-shadow: 0 2px 4px 0 #f7f7f7;\n  border: 1px solid #f0f0f0;\n  background-color: #fff;\n}\n.index_gantt-task-bar-resize-bg-compact__3RbLw {\n  height: 17px;\n}\n.index_gantt-task-bar-resize-handle__3mfmB {\n  position: absolute;\n  left: 0;\n  top: -4px;\n  width: 14px;\n  height: 16px;\n  z-index: 3;\n  background: white;\n}\n.index_gantt-task-bar-resize-handle__3mfmB:after,\n.index_gantt-task-bar-resize-handle__3mfmB:before {\n  position: absolute;\n  top: 4px;\n  bottom: 16px;\n  width: 2px;\n  height: 8px;\n  border-radius: 2px;\n  background-color: #d9d9d9;\n  content: '';\n}\n.index_gantt-task-bar-resize-handle-disabled__2kSKC {\n  cursor: not-allowed !important;\n}\n.index_gantt-task-bar-resize-handle-left__1fcW2 {\n  cursor: col-resize;\n}\n.index_gantt-task-bar-resize-handle-left__1fcW2:before {\n  left: 4px;\n}\n.index_gantt-task-bar-resize-handle-left__1fcW2:after {\n  right: 4px;\n}\n.index_gantt-task-bar-resize-handle-right__3aJOJ {\n  cursor: col-resize;\n}\n.index_gantt-task-bar-resize-handle-right__3aJOJ:before {\n  left: 4px;\n}\n.index_gantt-task-bar-resize-handle-right__3aJOJ:after {\n  right: 4px;\n}\n.index_gantt-task-bar-date-text__nhXvs {\n  color: #262626;\n}\n.index_gantt-task-bar-date-text__nhXvs,\n.index_gantt-task-bar-label__2obG3 {\n  position: absolute;\n  white-space: nowrap;\n  font-size: 12px;\n  top: -4px;\n}\n.index_gantt-task-bar-label__2obG3 {\n  overflow: hidden;\n  max-width: 200px;\n  color: #595959;\n  text-overflow: ellipsis;\n  word-break: keep-all;\n  line-height: 16px;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n  height: 16px;\n  cursor: pointer;\n  top: -14px;\n}\n";
styleInject(css_248z$f);

var TaskBar = function TaskBar(_ref) {
  var data = _ref.data;
  var _useContext = useContext(context),
    store = _useContext.store,
    getBarColor = _useContext.getBarColor,
    renderBar = _useContext.renderBar,
    onBarClick = _useContext.onBarClick,
    prefixCls = _useContext.prefixCls,
    barHeight = _useContext.barHeight,
    alwaysShowTaskBar = _useContext.alwaysShowTaskBar,
    renderLeftText = _useContext.renderLeftText,
    renderRightText = _useContext.renderRightText;
  var width = data.width,
    translateX = data.translateX,
    translateY = data.translateY,
    invalidDateRange = data.invalidDateRange,
    stepGesture = data.stepGesture,
    dateTextFormat = data.dateTextFormat,
    record = data.record,
    loading = data.loading,
    getDateWidth = data.getDateWidth;
  var _ref2 = record || {},
    _ref2$disabled = _ref2.disabled,
    disabled = _ref2$disabled === void 0 ? false : _ref2$disabled;
  var prefixClsTaskBar = "".concat(prefixCls, "-task-bar");
  var selectionIndicatorTop = store.selectionIndicatorTop,
    showSelectionIndicator = store.showSelectionIndicator,
    rowHeight = store.rowHeight,
    locale = store.locale;
  var showDragBar = useMemo(function () {
    if (!showSelectionIndicator) return false;
    // 差值
    var baseTop = TOP_PADDING + rowHeight / 2 - barHeight / 2;
    return selectionIndicatorTop === translateY - baseTop;
  }, [showSelectionIndicator, selectionIndicatorTop, translateY, rowHeight, barHeight]);
  var themeColor = useMemo(function () {
    if (translateX + width >= dayjs().valueOf() / store.pxUnitAmp) return ['#95DDFF', '#64C7FE'];
    return ['#FD998F', '#F96B5D'];
  }, [store.pxUnitAmp, translateX, width]);
  var handleBeforeResize = function handleBeforeResize(type) {
    return function () {
      if (disabled) return;
      store.handleDragStart(data, type);
    };
  };
  var handleResize = useCallback(function (_ref3) {
    var newWidth = _ref3.width,
      x = _ref3.x;
    if (disabled) return;
    store.updateBarSize(data, {
      width: newWidth,
      x: x
    });
  }, [data, store, disabled]);
  var handleLeftResizeEnd = useCallback(function (oldSize) {
    store.handleDragEnd();
    store.updateTaskDate(data, oldSize, 'left');
  }, [data, store]);
  var handleRightResizeEnd = useCallback(function (oldSize) {
    store.handleDragEnd();
    store.updateTaskDate(data, oldSize, 'right');
  }, [data, store]);
  var handleMoveEnd = useCallback(function (oldSize) {
    store.handleDragEnd();
    store.updateTaskDate(data, oldSize, 'move');
  }, [data, store]);
  var handleAutoScroll = useCallback(function (delta) {
    store.setTranslateX(store.translateX + delta);
  }, [store]);
  var allowDrag = showDragBar && !loading;
  var handleClick = useCallback(function (e) {
    e.stopPropagation();
    if (onBarClick) onBarClick(data.record);
  }, [data.record, onBarClick]);
  var reachEdge = usePersistFn(function (position) {
    return position === 'left' && store.translateX <= 0;
  });
  // 根据不同的视图确定拖动时的单位，在任何视图下都以一天为单位
  var grid = useMemo(function () {
    return ONE_DAY_MS / store.pxUnitAmp;
  }, [store.pxUnitAmp]);
  var moveCalc = -(width / store.pxUnitAmp);
  var days = useMemo(function () {
    var daysWidth = Number(getDateWidth(translateX + width + moveCalc, translateX));
    return "".concat(daysWidth, " ").concat(daysWidth > 1 ? locale.days : locale.day);
  }, [translateX, width, moveCalc, translateX]);
  return /*#__PURE__*/React.createElement("div", {
    role: 'none',
    className: classNames(prefixClsTaskBar, _defineProperty(_defineProperty({}, "".concat(prefixClsTaskBar, "-invalid-date-range"), invalidDateRange), "".concat(prefixClsTaskBar, "-overdue"), !invalidDateRange)),
    style: {
      transform: "translate(".concat(translateX, "px, ").concat(translateY, "px)")
    },
    onClick: handleClick
  }, loading && /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsTaskBar, "-loading")
  }), /*#__PURE__*/React.createElement("div", null, allowDrag && (/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DragResize$1, {
    className: classNames("".concat(prefixClsTaskBar, "-resize-handle"), "".concat(prefixClsTaskBar, "-resize-handle-left"), _defineProperty({}, "".concat(prefixClsTaskBar, "-resize-handle-disabled"), disabled)),
    style: {
      left: -14
    },
    onResize: handleResize,
    onResizeEnd: handleLeftResizeEnd,
    defaultSize: {
      x: translateX,
      width: width
    },
    minWidth: 30,
    grid: grid,
    type: 'left',
    scroller: store.chartElementRef.current || undefined,
    onAutoScroll: handleAutoScroll,
    reachEdge: reachEdge,
    onBeforeResize: handleBeforeResize('left'),
    disabled: disabled
  }), /*#__PURE__*/React.createElement(DragResize$1, {
    className: classNames("".concat(prefixClsTaskBar, "-resize-handle"), "".concat(prefixClsTaskBar, "-resize-handle-right"), _defineProperty({}, "".concat(prefixClsTaskBar, "-resize-handle-disabled"), disabled)),
    style: {
      left: width + 1
    },
    onResize: handleResize,
    onResizeEnd: handleRightResizeEnd,
    defaultSize: {
      x: translateX,
      width: width
    },
    minWidth: 30,
    grid: grid,
    type: 'right',
    scroller: store.chartElementRef.current || undefined,
    onAutoScroll: handleAutoScroll,
    reachEdge: reachEdge,
    onBeforeResize: handleBeforeResize('right'),
    disabled: disabled
  }), /*#__PURE__*/React.createElement("div", {
    className: classNames("".concat(prefixClsTaskBar, "-resize-bg"), "".concat(prefixClsTaskBar, "-resize-bg-compact")),
    style: {
      width: width + 30,
      left: -14
    }
  }))), /*#__PURE__*/React.createElement(DragResize$1, {
    className: "".concat(prefixClsTaskBar, "-bar"),
    onResize: handleResize,
    onResizeEnd: handleMoveEnd,
    defaultSize: {
      x: translateX,
      width: width
    },
    minWidth: 30,
    grid: grid,
    type: 'move',
    scroller: store.chartElementRef.current || undefined,
    onAutoScroll: handleAutoScroll,
    reachEdge: reachEdge,
    onBeforeResize: handleBeforeResize('move')
  }, renderBar ? renderBar(data, {
    width: width + 1,
    height: barHeight + 1
  }) : (/*#__PURE__*/React.createElement("svg", {
    xmlns: 'http://www.w3.org/2000/svg',
    version: '1.1',
    width: width + 1,
    height: barHeight + 1,
    viewBox: "0 0 ".concat(width + 1, " ").concat(barHeight + 1)
  }, /*#__PURE__*/React.createElement("path", {
    fill: record.backgroundColor || getBarColor && getBarColor(record).backgroundColor || themeColor[0],
    stroke: record.borderColor || getBarColor && getBarColor(record).borderColor || themeColor[1],
    d: "\n              M".concat(width - 2, ",0.5\n              l-").concat(width - 5, ",0\n              c-0.41421,0 -0.78921,0.16789 -1.06066,0.43934\n              c-0.27145,0.27145 -0.43934,0.64645 -0.43934,1.06066\n              l0,5.3\n\n              c0.03256,0.38255 0.20896,0.724 0.47457,0.97045\n              c0.26763,0.24834 0.62607,0.40013 1.01995,0.40013\n              l4,0\n\n              l").concat(width - 12, ",0\n\n              l4,0\n              c0.41421,0 0.78921,-0.16789 1.06066,-0.43934\n              c0.27145,-0.27145 0.43934,-0.64645 0.43934,-1.06066\n\n              l0,-5.3\n              c-0.03256,-0.38255 -0.20896,-0.724 -0.47457,-0.97045\n              c-0.26763,-0.24834 -0.62607,-0.40013 -1.01995,-0.40013z\n            ")
  }))))), (allowDrag || disabled || alwaysShowTaskBar) && (/*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsTaskBar, "-label"),
    style: {
      left: width / 2 - 10
    }
  }, days)), (stepGesture === 'moving' || allowDrag || alwaysShowTaskBar) && (/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsTaskBar, "-date-text"),
    style: {
      left: width + 16
    }
  }, renderRightText ? renderRightText(data) : dateTextFormat(translateX + width + moveCalc)), /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsTaskBar, "-date-text"),
    style: {
      right: width + 16
    }
  }, renderLeftText ? renderLeftText(data) : dateTextFormat(translateX)))));
};
var TaskBar$1 = observer(TaskBar);

/* eslint-disable no-underscore-dangle */
var BarList = function BarList() {
  var _useContext = useContext(context),
    store = _useContext.store;
  var barList = store.getBarList;
  var _store$getVisibleRows = store.getVisibleRows,
    count = _store$getVisibleRows.count,
    start = _store$getVisibleRows.start;
  return /*#__PURE__*/React.createElement(React.Fragment, null, barList.slice(start, start + count).map(function (bar) {
    if (bar._group) return /*#__PURE__*/React.createElement(GroupBar$1, {
      key: bar.key,
      data: bar
    });
    return bar.invalidDateRange ? /*#__PURE__*/React.createElement(InvalidTaskBar$1, {
      key: bar.key,
      data: bar
    }) : /*#__PURE__*/React.createElement(TaskBar$1, {
      key: bar.key,
      data: bar
    });
  }));
};
var BarList$1 = observer(BarList);

var css_248z$e = ".index_gantt-task-bar-thumb__27yPH {\n  position: absolute;\n  cursor: pointer;\n  white-space: nowrap;\n  z-index: 2;\n  overflow: hidden;\n  max-width: 200px;\n  color: #595959;\n  text-overflow: ellipsis;\n  word-break: keep-all;\n  line-height: 16px;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  font-size: 12px;\n  padding-right: 16px;\n  display: flex;\n  align-items: center;\n}\n.index_gantt-task-bar-thumb-left__GZSOy {\n  transform: translate(0);\n}\n.index_gantt-task-bar-thumb-right__Kuywg {\n  transform: translate(-100%);\n}\n.index_gantt-task-bar-thumb-circle-left__2wIdM {\n  height: 10px;\n  width: 10px;\n  border-radius: 50%;\n  margin-right: 10px;\n}\n.index_gantt-task-bar-thumb-circle-right__10_Bp {\n  height: 10px;\n  width: 10px;\n  border-radius: 50%;\n  margin-left: 10px;\n}\n";
styleInject(css_248z$e);

var TaskBarThumb = function TaskBarThumb(_ref) {
  var data = _ref.data;
  var _useContext = useContext(context),
    store = _useContext.store,
    renderBarThumb = _useContext.renderBarThumb,
    prefixCls = _useContext.prefixCls,
    getBarColor = _useContext.getBarColor;
  var prefixClsTaskBarThumb = "".concat(prefixCls, "-task-bar-thumb");
  var viewTranslateX = store.translateX,
    viewWidth = store.viewWidth;
  var translateX = data.translateX,
    translateY = data.translateY,
    label = data.label,
    record = data.record;
  var type = useMemo(function () {
    var rightSide = viewTranslateX + viewWidth;
    return translateX - rightSide > 0 ? 'right' : 'left';
  }, [translateX, viewTranslateX, viewWidth]);
  var left = useMemo(function () {
    return type === 'right' ? viewTranslateX + viewWidth - 5 : viewTranslateX + 2;
  }, [type, viewTranslateX, viewWidth]);
  var handleClick = useCallback(function (e) {
    e.stopPropagation();
    store.scrollToBar(data, type);
  }, [data, store, type]);
  var getBackgroundColor = useMemo(function () {
    return record.backgroundColor || getBarColor && getBarColor(record).backgroundColor;
  }, [record]);
  return /*#__PURE__*/React.createElement("div", {
    role: 'none',
    className: classNames(prefixClsTaskBarThumb, _defineProperty(_defineProperty({}, "".concat(prefixClsTaskBarThumb, "-left"), type === 'left'), "".concat(prefixClsTaskBarThumb, "-right"), type === 'right')),
    style: {
      left: left,
      top: translateY - 5
    },
    onClick: handleClick
  }, type === 'left' && (/*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsTaskBarThumb, "-circle-left"),
    style: {
      backgroundColor: getBackgroundColor
    }
  })), renderBarThumb ? renderBarThumb(data.record, type) : label, type === 'right' && (/*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsTaskBarThumb, "-circle-right"),
    style: {
      backgroundColor: getBackgroundColor
    }
  })));
};
var TaskBarThumb$1 = observer(TaskBarThumb);

/* eslint-disable no-underscore-dangle */
var BarThumbList = function BarThumbList() {
  var _useContext = useContext(context),
    store = _useContext.store;
  var barList = store.getBarList;
  var _store$getVisibleRows = store.getVisibleRows,
    count = _store$getVisibleRows.count,
    start = _store$getVisibleRows.start;
  return /*#__PURE__*/React.createElement(React.Fragment, null, barList.slice(start, start + count).map(function (bar) {
    if (store.getTaskBarThumbVisible(bar)) return /*#__PURE__*/React.createElement(TaskBarThumb$1, {
      data: bar,
      key: bar.key
    });
    return null;
  }));
};
var BarThumbList$1 = observer(BarThumbList);

var css_248z$d = ".Dependence_task-dependency-line__2M0K6 {\n  z-index: -1;\n}\n.Dependence_task-dependency-line__2M0K6 .Dependence_line__3jymp {\n  stroke: #f87872;\n}\n";
var styles = {"task-dependency-line":"Dependence_task-dependency-line__2M0K6","line":"Dependence_line__3jymp"};
styleInject(css_248z$d);

var spaceX = 10;
var spaceY = 10;
/**
 * 获取关键点
 *
 * @param from
 * @param to
 */
function getPoints(from, to, type) {
  var fromX = from.x,
    fromY = from.y;
  var toX = to.x,
    toY = to.y;
  var sameSide = type === 'finish_finish' || type === 'start_start';
  // 同向，只需要两个关键点
  if (sameSide) {
    if (type === 'start_start') {
      return [{
        x: Math.min(fromX - spaceX, toX - spaceX),
        y: fromY
      }, {
        x: Math.min(fromX - spaceX, toX - spaceX),
        y: toY
      }];
    }
    return [{
      x: Math.max(fromX + spaceX, toX + spaceX),
      y: fromY
    }, {
      x: Math.max(fromX + spaceX, toX + spaceX),
      y: toY
    }];
  }
  // 不同向，需要四个关键点
  return [{
    x: type === 'finish_start' ? fromX + spaceX : fromX - spaceX,
    y: fromY
  }, {
    x: type === 'finish_start' ? fromX + spaceX : fromX - spaceX,
    y: toY - spaceY
  }, {
    x: type === 'finish_start' ? toX - spaceX : toX + spaceX,
    y: toY - spaceY
  }, {
    x: type === 'finish_start' ? toX - spaceX : toX + spaceX,
    y: toY
  }];
}
var Dependence = function Dependence(_ref) {
  var data = _ref.data;
  var _useContext = useContext(context),
    store = _useContext.store,
    barHeight = _useContext.barHeight;
  var from = data.from,
    to = data.to,
    type = data.type,
    _data$color = data.color,
    color = _data$color === void 0 ? '#f87872' : _data$color;
  var barList = store.getBarList;
  var fromBar = find(barList, function (bar) {
    return bar.record.id === from;
  });
  var toBar = find(barList, function (bar) {
    return bar.record.id === to;
  });
  if (!fromBar || !toBar) return null;
  var posY = barHeight / 2;
  var _ref2 = function () {
      return [{
        x: type === 'finish_finish' || type === 'finish_start' ? fromBar.translateX + fromBar.width : fromBar.translateX,
        y: fromBar.translateY + posY
      }, {
        x: type === 'finish_finish' || type === 'start_finish' ? toBar.translateX + toBar.width : toBar.translateX,
        y: toBar.translateY + posY
      }];
    }(),
    _ref3 = _slicedToArray(_ref2, 2),
    start = _ref3[0],
    end = _ref3[1];
  var points = [].concat(_toConsumableArray(getPoints(start, end, type)), [end]);
  var endPosition = type === 'start_finish' || type === 'finish_finish' ? -1 : 1;
  return /*#__PURE__*/React.createElement("g", {
    stroke: color,
    className: styles['task-dependency-line']
  }, /*#__PURE__*/React.createElement("path", {
    style: {
      stroke: color
    },
    d: "\n          M".concat(start.x, ",").concat(start.y, "\n          ").concat(points.map(function (point) {
      return "L".concat(point.x, ",").concat(point.y);
    }).join('\n'), "\n          L").concat(end.x, ",").concat(end.y, "\n          "),
    strokeWidth: '1',
    fill: 'none'
  }), /*#__PURE__*/React.createElement("path", {
    name: 'arrow',
    strokeWidth: '1',
    fill: color,
    d: "\n        M".concat(end.x, ",").concat(end.y, " \n        L").concat(end.x - 4 * endPosition, ",").concat(end.y - 3 * endPosition, " \n        L").concat(end.x - 4 * endPosition, ",").concat(end.y + 3 * endPosition, " \n        Z")
  }));
};
var Dependence$1 = observer(Dependence);

var Dependencies = function Dependencies() {
  var _useContext = useContext(context),
    store = _useContext.store;
  var dependencies = store.dependencies;
  return /*#__PURE__*/React.createElement(React.Fragment, null, dependencies.map(function (dependence) {
    return /*#__PURE__*/React.createElement(Dependence$1, {
      key: JSON.stringify(dependence),
      data: dependence
    });
  }));
};
var Dependencies$1 = observer(Dependencies);

/**
 * 拖动时的提示条
 */
var DragPresent = function DragPresent() {
  var _useContext = useContext(context),
    store = _useContext.store;
  var dragging = store.dragging,
    draggingType = store.draggingType,
    bodyScrollHeight = store.bodyScrollHeight;
  if (!dragging) {
    return null;
  }
  // 和当前拖动的块一样长
  var width = dragging.width,
    translateX = dragging.translateX;
  var left = translateX;
  var right = translateX + width;
  var leftLine = draggingType === 'left' || draggingType === 'move';
  var rightLine = draggingType === 'right' || draggingType === 'move';
  return /*#__PURE__*/React.createElement("g", {
    fill: "#DAE0FF",
    stroke: "#7B90FF"
  }, leftLine && /*#__PURE__*/React.createElement("path", {
    d: "M".concat(left, ",0 L").concat(left, ",").concat(bodyScrollHeight)
  }), /*#__PURE__*/React.createElement("rect", {
    x: left,
    y: "0",
    width: width,
    height: bodyScrollHeight,
    strokeWidth: "0"
  }), rightLine && /*#__PURE__*/React.createElement("path", {
    d: "M".concat(right, ",0 L").concat(right, ",").concat(bodyScrollHeight)
  }));
};
var DragPresent$1 = observer(DragPresent);

var css_248z$c = ".index_gantt-today__g45gc {\n  position: absolute;\n  top: 0;\n  background: #096dd9;\n  width: 1px;\n  height: 1px;\n  text-align: center;\n  line-height: 1px;\n  border-radius: 50%;\n  font-size: 12px;\n  color: #ffffff;\n  pointer-events: none;\n}\n.index_gantt-today_line__1A8DG {\n  width: 1px;\n  background: #096dd9;\n  margin-left: 15px;\n}\n";
styleInject(css_248z$c);

var Today = function Today() {
  var _useContext = useContext(context),
    store = _useContext.store,
    prefixCls = _useContext.prefixCls;
  return /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixCls, "-today"),
    style: {
      transform: "translate(".concat(store.todayTranslateX, "px)")
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixCls, "-today_line"),
    style: {
      height: store.bodyScrollHeight
    }
  }));
};
var Today$1 = observer(Today);

var css_248z$b = ".index_gantt-chart__3TGV- {\n  position: absolute;\n  top: 0;\n  overflow-x: hidden;\n  overflow-y: hidden;\n}\n.index_gantt-chart-svg-renderer__39zlv {\n  position: absolute;\n  top: 0;\n  left: 0;\n}\n.index_gantt-render-chunk__28Tbt {\n  position: absolute;\n  top: 0;\n  left: 0;\n  will-change: transform;\n}\n";
styleInject(css_248z$b);

var Chart = function Chart() {
  var _useContext = useContext(context),
    store = _useContext.store,
    prefixCls = _useContext.prefixCls;
  var tableWidth = store.tableWidth,
    viewWidth = store.viewWidth,
    bodyScrollHeight = store.bodyScrollHeight,
    translateX = store.translateX,
    chartElementRef = store.chartElementRef;
  var minorList = store.getMinorList();
  var handleMouseMove = useCallback(function (event) {
    event.persist();
    store.handleMouseMove(event);
  }, [store]);
  var handleMouseLeave = useCallback(function () {
    store.handleMouseLeave();
  }, [store]);
  useEffect(function () {
    var element = chartElementRef.current;
    if (element) element.addEventListener('wheel', store.handleWheel);
    return function () {
      if (element) element.removeEventListener('wheel', store.handleWheel);
    };
  }, [chartElementRef, store]);
  return /*#__PURE__*/React.createElement("div", {
    ref: chartElementRef,
    className: "".concat(prefixCls, "-chart"),
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    style: {
      left: tableWidth,
      width: viewWidth,
      height: bodyScrollHeight
    }
  }, /*#__PURE__*/React.createElement("svg", {
    className: "".concat(prefixCls, "-chart-svg-renderer"),
    xmlns: 'http://www.w3.org/2000/svg',
    version: '1.1',
    width: viewWidth,
    height: bodyScrollHeight,
    viewBox: "".concat(translateX, " 0 ").concat(viewWidth, " ").concat(bodyScrollHeight)
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("pattern", {
    id: 'repeat',
    width: '4.5',
    height: '10',
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(70 50 50)'
  }, /*#__PURE__*/React.createElement("line", {
    stroke: '#c6c6c6',
    strokeWidth: '1px',
    y2: '10'
  }))), minorList.map(function (item) {
    return item.isWeek ? (/*#__PURE__*/React.createElement("g", {
      key: item.key,
      stroke: '#f0f0f0'
    }, /*#__PURE__*/React.createElement("path", {
      d: "M".concat(item.left, ",0 L").concat(item.left, ",").concat(bodyScrollHeight)
    }), /*#__PURE__*/React.createElement("rect", {
      fill: 'url(#repeat)',
      opacity: '0.5',
      strokeWidth: '0',
      x: item.left,
      y: 0,
      width: item.width,
      height: bodyScrollHeight
    }))) : (/*#__PURE__*/React.createElement("g", {
      key: item.key,
      stroke: '#f0f0f0'
    }, /*#__PURE__*/React.createElement("path", {
      d: "M".concat(item.left, ",0 L").concat(item.left, ",").concat(bodyScrollHeight)
    })));
  }), /*#__PURE__*/React.createElement(DragPresent$1, null), /*#__PURE__*/React.createElement(Dependencies$1, null)), /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixCls, "-render-chunk"),
    style: {
      height: bodyScrollHeight,
      transform: "translateX(-".concat(translateX, "px")
    }
  }, /*#__PURE__*/React.createElement(BarThumbList$1, null), /*#__PURE__*/React.createElement(BarList$1, null), /*#__PURE__*/React.createElement(Today$1, null)));
};
var Chart$1 = /*#__PURE__*/memo(observer(Chart));

function useDragResize(handleResize, _ref) {
  var initSize = _ref.initSize,
    minWidthConfig = _ref.minWidth,
    maxWidthConfig = _ref.maxWidth;
  var _useState = useState(false),
    _useState2 = _slicedToArray(_useState, 2),
    resizing = _useState2[0],
    setResizing = _useState2[1];
  var positionRef = useRef({
    left: 0
  });
  var initSizeRef = useRef(initSize);
  var handleMouseMove = usePersistFn(/*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(event) {
      var distance, width;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            distance = event.clientX - positionRef.current.left;
            width = initSizeRef.current.width + distance;
            if (minWidthConfig !== undefined) {
              width = Math.max(width, minWidthConfig);
            }
            if (maxWidthConfig !== undefined) {
              width = Math.min(width, maxWidthConfig);
            }
            handleResize({
              width: width
            });
          case 5:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    return function (_x) {
      return _ref2.apply(this, arguments);
    };
  }());
  var handleMouseUp = useCallback(function () {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    setResizing(false);
  }, [handleMouseMove]);
  var handleMouseDown = useCallback(function (event) {
    positionRef.current.left = event.clientX;
    initSizeRef.current = initSize;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    setResizing(true);
  }, [handleMouseMove, handleMouseUp, initSize]);
  return [handleMouseDown, resizing];
}

var css_248z$a = ".index_gantt-divider__2J89p {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  cursor: col-resize;\n}\n.index_gantt-divider__2J89p:hover hr {\n  border-color: #3b88f4;\n}\n.index_gantt-divider__2J89p:hover hr:before {\n  background: #3b88f4;\n}\n.index_gantt-divider__2J89p:hover .index_gantt-divider-icon-wrapper__lyyO9 {\n  background-color: #3b88f4;\n  border-color: #3b88f4;\n  border-top: 0;\n  border-bottom: 0;\n  cursor: pointer;\n}\n.index_gantt-divider__2J89p:hover .index_gantt-divider-icon-wrapper__lyyO9:after {\n  content: '';\n  right: -3px;\n  position: absolute;\n  width: 2px;\n  height: 30px;\n  background-color: transparent;\n}\n.index_gantt-divider__2J89p:hover .index_gantt-divider-icon-wrapper__lyyO9 .index_gantt-divider-arrow__-V0FJ:after,\n.index_gantt-divider__2J89p:hover .index_gantt-divider-icon-wrapper__lyyO9 .index_gantt-divider-arrow__-V0FJ:before {\n  background-color: #fff;\n}\n.index_gantt-divider__2J89p > hr {\n  margin: 0;\n  height: 100%;\n  width: 0;\n  border: none;\n  border-right: 1px solid transparent;\n}\n.index_gantt-divider__2J89p > .index_gantt-divider-icon-wrapper__lyyO9 {\n  position: absolute;\n  left: 1px;\n  top: 50%;\n  transform: translateY(-50%);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 14px;\n  height: 30px;\n  border-radius: 0 4px 4px 0;\n  border: 1px solid #f0f0f0;\n  border-left: 0;\n  background-color: #fff;\n}\n.index_gantt-divider-arrow__-V0FJ:before {\n  bottom: -1px;\n  transform: rotate(30deg);\n}\n.index_gantt-divider-arrow__-V0FJ:after {\n  top: -1px;\n  transform: rotate(-30deg);\n}\n.index_gantt-divider-arrow__-V0FJ:after,\n.index_gantt-divider-arrow__-V0FJ:before {\n  content: '';\n  display: block;\n  position: relative;\n  width: 2px;\n  height: 8px;\n  background-color: #bfbfbf;\n  border-radius: 1px;\n}\n.index_gantt-divider-arrow__-V0FJ.index_gantt-divider-reverse__3IXkT:before {\n  transform: rotate(-30deg);\n}\n.index_gantt-divider-arrow__-V0FJ.index_gantt-divider-reverse__3IXkT:after {\n  transform: rotate(30deg);\n}\n.index_gantt-divider_only__1dr27 > hr:before {\n  content: '';\n  position: absolute;\n  border-top: 7px solid white;\n  border-bottom: 7px solid white;\n  background: #a7add0;\n  z-index: 2;\n  height: 26px;\n  top: 50%;\n  transform: translateY(-50%);\n  width: 2px;\n}\n.index_gantt-divider_only__1dr27 > hr {\n  border-color: #a7add0;\n}\n";
styleInject(css_248z$a);

var Divider = function Divider() {
  var _useContext = useContext(context),
    store = _useContext.store,
    tableCollapseAble = _useContext.tableCollapseAble,
    prefixCls = _useContext.prefixCls;
  var prefixClsDivider = "".concat(prefixCls, "-divider");
  var tableWidth = store.tableWidth;
  var handleClick = useCallback(function (event) {
    event.stopPropagation();
    store.toggleCollapse();
  }, [store]);
  var left = tableWidth;
  var handleResize = useCallback(function (_ref) {
    var width = _ref.width;
    store.handleResizeTableWidth(width);
  }, [store]);
  var _useDragResize = useDragResize(handleResize, {
      initSize: {
        width: tableWidth
      },
      minWidth: 200,
      maxWidth: store.width * 0.6
    }),
    _useDragResize2 = _slicedToArray(_useDragResize, 2),
    handleMouseDown = _useDragResize2[0],
    resizing = _useDragResize2[1];
  return /*#__PURE__*/React.createElement("div", {
    role: 'none',
    className: classNames(prefixClsDivider, _defineProperty({}, "".concat(prefixClsDivider, "_only"), !tableCollapseAble)),
    style: {
      left: left - 1
    },
    onMouseDown: tableWidth === 0 ? undefined : handleMouseDown
  }, resizing && (/*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      zIndex: 9999,
      cursor: 'col-resize'
    }
  })), /*#__PURE__*/React.createElement("hr", null), tableCollapseAble && (/*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsDivider, "-icon-wrapper"),
    role: 'none',
    onMouseDown: function onMouseDown(e) {
      return e.stopPropagation();
    },
    onClick: handleClick
  }, /*#__PURE__*/React.createElement("i", {
    className: classNames("".concat(prefixClsDivider, "-arrow"), _defineProperty({}, "".concat(prefixClsDivider, "-reverse"), left <= 0))
  }))));
};
var Divider$1 = observer(Divider);

var css_248z$9 = ".index_gantt-scroll_bar__G1DE7 {\n  position: absolute;\n  bottom: 0;\n  left: 16px;\n  height: 12px;\n}\n.index_gantt-scroll_bar-thumb__32zlz {\n  position: absolute;\n  height: 100%;\n  border-radius: 4px;\n  background-color: #262626;\n  opacity: 0.2;\n  cursor: pointer;\n  will-change: transform;\n}\n";
styleInject(css_248z$9);

var ScrollBar = function ScrollBar() {
  var _useContext = useContext(context),
    store = _useContext.store,
    prefixCls = _useContext.prefixCls;
  var tableWidth = store.tableWidth,
    viewWidth = store.viewWidth;
  var width = store.scrollBarWidth;
  var prefixClsScrollBar = "".concat(prefixCls, "-scroll_bar");
  var _useState = useState(false),
    _useState2 = _slicedToArray(_useState, 2),
    resizing = _useState2[0],
    setResizing = _useState2[1];
  var positionRef = useRef({
    scrollLeft: 0,
    left: 0,
    translateX: 0
  });
  var handleMouseMove = usePersistFn(function (event) {
    var distance = event.clientX - positionRef.current.left;
    // TODO 调整倍率
    store.setTranslateX(distance * (store.viewWidth / store.scrollBarWidth) + positionRef.current.translateX);
  });
  var handleMouseUp = useCallback(function () {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    setResizing(false);
  }, [handleMouseMove]);
  var handleMouseDown = useCallback(function (event) {
    positionRef.current.left = event.clientX;
    positionRef.current.translateX = store.translateX;
    positionRef.current.scrollLeft = store.scrollLeft;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    setResizing(true);
  }, [handleMouseMove, handleMouseUp, store.scrollLeft, store.translateX]);
  return /*#__PURE__*/React.createElement("div", {
    role: 'none',
    className: prefixClsScrollBar,
    style: {
      left: tableWidth,
      width: viewWidth
    },
    onMouseDown: handleMouseDown
  }, resizing && (/*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      zIndex: 9999,
      cursor: 'col-resize'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsScrollBar, "-thumb"),
    style: {
      width: width,
      left: store.scrollLeft
    }
  }));
};
var ScrollBar$1 = /*#__PURE__*/memo(observer(ScrollBar));

var css_248z$8 = ".index_gantt-scroll_top__h_HBr {\n  position: absolute;\n  right: 24px;\n  bottom: 8px;\n  width: 40px;\n  height: 40px;\n  cursor: pointer;\n  background-image: url('./Top.svg');\n  background-size: contain;\n}\n.index_gantt-scroll_top__h_HBr:hover {\n  background-image: url('./Top_hover.svg');\n}\n";
styleInject(css_248z$8);

var ScrollTop = function ScrollTop() {
  var _useContext = useContext(context),
    store = _useContext.store,
    scrollTopConfig = _useContext.scrollTop,
    prefixCls = _useContext.prefixCls;
  var scrollTop = store.scrollTop;
  var handleClick = useCallback(function () {
    if (store.mainElementRef.current) {
      store.mainElementRef.current.scrollTop = 0;
    }
  }, [store.mainElementRef]);
  if (scrollTop <= 100 || !store.mainElementRef.current) {
    return null;
  }
  var prefixClsScrollTop = "".concat(prefixCls, "-scroll_top");
  return /*#__PURE__*/React.createElement("div", {
    className: prefixClsScrollTop,
    style: scrollTopConfig instanceof Object ? scrollTopConfig : undefined,
    onClick: handleClick
  });
};
var ScrollTop$1 = observer(ScrollTop);

var css_248z$7 = ".index_gantt-selection-indicator__1XfEW {\n  position: absolute;\n  width: 100%;\n  background: rgba(0, 0, 0, 0.04);\n  pointer-events: none;\n  z-index: 10;\n}\n";
styleInject(css_248z$7);

/**
 * 鼠标hover效果模拟
 */
var SelectionIndicator = function SelectionIndicator() {
  var _useContext = useContext(context),
    store = _useContext.store,
    prefixCls = _useContext.prefixCls;
  var showSelectionIndicator = store.showSelectionIndicator,
    selectionIndicatorTop = store.selectionIndicatorTop,
    rowHeight = store.rowHeight;
  var prefixClsSelectionIndicator = "".concat(prefixCls, "-selection-indicator");
  return showSelectionIndicator ? (/*#__PURE__*/React.createElement("div", {
    className: prefixClsSelectionIndicator,
    style: {
      height: rowHeight,
      top: selectionIndicatorTop
    }
  })) : null;
};
var SelectionIndicator$1 = observer(SelectionIndicator);

var css_248z$6 = ".RowToggler_gantt-row-toggler__1g-xK {\n  width: 24px;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  color: #d9d9d9;\n  cursor: pointer;\n  position: relative;\n  z-index: 5;\n}\n.RowToggler_gantt-row-toggler__1g-xK:hover {\n  color: #8c8c8c;\n}\n.RowToggler_gantt-row-toggler__1g-xK > i {\n  width: 20px;\n  height: 20px;\n  background: white;\n}\n.RowToggler_gantt-row-toggler__1g-xK > i > svg {\n  transition: transform 218ms;\n  fill: currentColor;\n}\n.RowToggler_gantt-row-toggler-collapsed__2fIL1 > i > svg {\n  transform: rotate(-90deg);\n}\n";
styleInject(css_248z$6);

var RowToggler = function RowToggler(_ref) {
  var onClick = _ref.onClick,
    collapsed = _ref.collapsed,
    level = _ref.level,
    _ref$prefixCls = _ref.prefixCls,
    prefixCls = _ref$prefixCls === void 0 ? '' : _ref$prefixCls;
  var prefixClsRowToggler = "".concat(prefixCls, "-row-toggler");
  return /*#__PURE__*/React.createElement("div", {
    role: 'none',
    onClick: onClick,
    className: prefixClsRowToggler
  }, /*#__PURE__*/React.createElement("div", {
    className: classNames(prefixClsRowToggler, _defineProperty({}, "".concat(prefixClsRowToggler, "-collapsed"), collapsed))
  }, /*#__PURE__*/React.createElement("i", {
    "data-level": level
  }, level <= 0 ? (/*#__PURE__*/React.createElement("svg", {
    viewBox: '0 0 1024 1024'
  }, /*#__PURE__*/React.createElement("path", {
    d: 'M296.704 409.6a14.9504 14.9504 0 0 0-10.752 4.608 15.5648 15.5648 0 0 0 0.1536 21.7088l210.8416 212.0704a24.832 24.832 0 0 0 35.584-0.256l205.5168-211.968a15.5136 15.5136 0 0 0 4.352-10.752c0-8.4992-6.7584-15.4112-15.104-15.4112h-430.592z'
  }))) : (/*#__PURE__*/React.createElement("svg", {
    viewBox: '0 0 1024 1024'
  }, /*#__PURE__*/React.createElement("path", {
    d: 'M296.704 409.6a14.9504 14.9504 0 0 0-10.752 4.608 15.5648 15.5648 0 0 0 0.1536 21.7088l210.8416 212.0704a24.832 24.832 0 0 0 35.584-0.256l205.5168-211.968a15.5136 15.5136 0 0 0 4.352-10.752c0-8.4992-6.7584-15.4112-15.104-15.4112h-430.592z'
  }))))));
};

var css_248z$5 = ".index_gantt-table-body__3l5F4 {\n  position: absolute;\n  top: 0;\n  left: 0;\n  overflow: hidden;\n}\n.index_gantt-table-body-row__2wmDy,\n.index_gantt-table-body-border_row__3n1y_ {\n  display: flex;\n  align-items: center;\n  position: absolute;\n  width: 100%;\n}\n.index_gantt-table-body-border_row__3n1y_ {\n  height: 100%;\n  pointer-events: none;\n}\n.index_gantt-table-body-cell__r-E1h {\n  position: relative;\n  display: flex;\n  align-items: center;\n  border-right: 1px solid #f0f0f0;\n  height: 100%;\n  color: #2e405e;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  padding: 0 8px;\n  font-size: 14px;\n}\n.index_gantt-table-body-ellipsis__sS4Rl {\n  flex: 1;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.index_gantt-table-body-row-indentation__2SrOJ {\n  height: 100%;\n  position: absolute;\n  left: 0;\n  pointer-events: none;\n}\n.index_gantt-table-body-row-indentation__2SrOJ:before {\n  content: '';\n  position: absolute;\n  height: 100%;\n  left: 0;\n  width: 1px;\n  bottom: 0;\n  background-color: #d9e6f2;\n}\n.index_gantt-table-body-row-indentation-both__15lTw:after {\n  content: '';\n  position: absolute;\n  width: 100%;\n  bottom: 0;\n  left: 0;\n  height: 1px;\n  background-color: #d9e6f2;\n}\n.index_gantt-table-body-row-indentation-hidden__2ITnU {\n  visibility: hidden;\n}\n";
styleInject(css_248z$5);

var TableRows = function TableRows() {
  var _useContext = useContext(context),
    store = _useContext.store,
    onRow = _useContext.onRow,
    tableIndent = _useContext.tableIndent,
    expandIcon = _useContext.expandIcon,
    prefixCls = _useContext.prefixCls,
    onExpand = _useContext.onExpand;
  var columns = store.columns,
    rowHeight = store.rowHeight;
  var columnsWidth = store.getColumnsWidth;
  var barList = store.getBarList;
  var _store$getVisibleRows = store.getVisibleRows,
    count = _store$getVisibleRows.count,
    start = _store$getVisibleRows.start;
  var prefixClsTableBody = "".concat(prefixCls, "-table-body");
  if (barList.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        color: ' rgba(0,0,0,0.65)',
        marginTop: 30
      }
    }, "\u6682\u65E0\u6570\u636E");
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, barList.slice(start, start + count).map(function (bar, rowIndex) {
    // 父元素如果是其最后一个祖先的子，要隐藏上一层的线
    var parent = bar._parent;
    var parentItem = parent === null || parent === void 0 ? void 0 : parent._parent;
    var isLastChild = false;
    if ((parentItem === null || parentItem === void 0 ? void 0 : parentItem.children) && parentItem.children[parentItem.children.length - 1] === bar._parent) isLastChild = true;
    return /*#__PURE__*/React.createElement("div", {
      key: bar.key,
      role: 'none',
      className: "".concat(prefixClsTableBody, "-row"),
      style: {
        height: rowHeight,
        top: (rowIndex + start) * rowHeight + TOP_PADDING
      },
      onClick: function onClick() {
        onRow === null || onRow === void 0 ? void 0 : onRow.onClick(bar.record);
      }
    }, columns.map(function (column, index) {
      return /*#__PURE__*/React.createElement("div", {
        key: column.name,
        className: "".concat(prefixClsTableBody, "-cell"),
        style: _objectSpread2({
          width: columnsWidth[index],
          minWidth: column.minWidth,
          maxWidth: column.maxWidth,
          textAlign: column.align ? column.align : 'left',
          paddingLeft: index === 0 ? tableIndent * (bar._depth + 1) + 10 : 12
        }, column.style)
      }, index === 0 &&
      // eslint-disable-next-line unicorn/no-new-array
      new Array(bar._depth).fill(0).map(function (_, i) {
        return /*#__PURE__*/React.createElement("div", {
          // eslint-disable-next-line react/no-array-index-key
          key: i,
          className: classNames("".concat(prefixClsTableBody, "-row-indentation"), _defineProperty(_defineProperty({}, "".concat(prefixClsTableBody, "-row-indentation-hidden"), isLastChild && i === bar._depth - 2), "".concat(prefixClsTableBody, "-row-indentation-both"), i === bar._depth - 1)),
          style: {
            top: -(rowHeight / 2) + 1,
            left: tableIndent * i + 15,
            width: tableIndent * 1.5 + 5
          }
        });
      }), index === 0 && bar._childrenCount > 0 && (/*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          left: tableIndent * bar._depth + 15,
          background: 'white',
          zIndex: 9,
          transform: 'translateX(-52%)',
          padding: 1
        }
      }, expandIcon ? expandIcon({
        level: bar._depth,
        collapsed: bar._collapsed,
        onClick: function onClick(event) {
          event.stopPropagation();
          if (onExpand) onExpand(bar.task.record, !bar._collapsed);
          store.setRowCollapse(bar.task, !bar._collapsed);
        }
      }) : (/*#__PURE__*/React.createElement(RowToggler, {
        prefixCls: prefixCls,
        level: bar._depth,
        collapsed: bar._collapsed,
        onClick: function onClick(event) {
          event.stopPropagation();
          if (onExpand) onExpand(bar.task.record, !bar._collapsed);
          store.setRowCollapse(bar.task, !bar._collapsed);
        }
      })))), /*#__PURE__*/React.createElement("span", {
        className: "".concat(prefixClsTableBody, "-ellipsis")
      }, column.render ? column.render(bar.record) : bar.record[column.name]));
    }));
  }));
};
var ObserverTableRows = observer(TableRows);
var TableBorders = function TableBorders() {
  var _useContext2 = useContext(context),
    store = _useContext2.store,
    prefixCls = _useContext2.prefixCls;
  var columns = store.columns;
  var columnsWidth = store.getColumnsWidth;
  var barList = store.getBarList;
  if (barList.length === 0) return null;
  var prefixClsTableBody = "".concat(prefixCls, "-table-body");
  return /*#__PURE__*/React.createElement("div", {
    role: 'none',
    className: "".concat(prefixClsTableBody, "-border_row")
  }, columns.map(function (column, index) {
    return /*#__PURE__*/React.createElement("div", {
      key: column.name,
      className: "".concat(prefixClsTableBody, "-cell"),
      style: _objectSpread2({
        width: columnsWidth[index],
        minWidth: column.minWidth,
        maxWidth: column.maxWidth,
        textAlign: column.align ? column.align : 'left'
      }, column.style)
    });
  }));
};
var ObserverTableBorders = observer(TableBorders);
var TableBody = function TableBody() {
  var _useContext3 = useContext(context),
    store = _useContext3.store,
    prefixCls = _useContext3.prefixCls;
  var handleMouseMove = useCallback(function (event) {
    event.persist();
    store.handleMouseMove(event);
  }, [store]);
  var handleMouseLeave = useCallback(function () {
    store.handleMouseLeave();
  }, [store]);
  var prefixClsTableBody = "".concat(prefixCls, "-table-body");
  return /*#__PURE__*/React.createElement("div", {
    className: prefixClsTableBody,
    style: {
      width: store.tableWidth,
      height: store.bodyScrollHeight
    },
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave
  }, /*#__PURE__*/React.createElement(ObserverTableBorders, null), /*#__PURE__*/React.createElement(ObserverTableRows, null));
};
var TableBody$1 = observer(TableBody);

var css_248z$4 = ".index_gantt-table-header__3uS8V {\n  position: absolute;\n  top: 0;\n  left: 0;\n  overflow: hidden;\n}\n.index_gantt-table-header-head__1MEWK {\n  position: relative;\n}\n.index_gantt-table-header-row__39xjH {\n  position: absolute;\n  left: 0;\n  display: flex;\n  transition: height 0.3s;\n  width: 100%;\n}\n.index_gantt-table-header-cell__skisR {\n  position: relative;\n  display: flex;\n  border-right: 1px solid #f0f0f0;\n}\n.index_gantt-table-header-head-cell__3u2Di {\n  display: flex;\n  flex: 1;\n  align-items: center;\n  overflow: hidden;\n  padding: 0 12px;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  font-size: 14px;\n  color: #2e405e;\n}\n.index_gantt-table-header-ellipsis__1kMWQ {\n  flex: 1;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n";
styleInject(css_248z$4);

var TableHeader = function TableHeader() {
  var _useContext = useContext(context),
    store = _useContext.store,
    prefixCls = _useContext.prefixCls;
  var columns = store.columns,
    tableWidth = store.tableWidth;
  var width = tableWidth;
  var columnsWidth = store.getColumnsWidth;
  var prefixClsTableHeader = "".concat(prefixCls, "-table-header");
  return /*#__PURE__*/React.createElement("div", {
    className: prefixClsTableHeader,
    style: {
      width: width,
      height: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsTableHeader, "-head"),
    style: {
      width: width,
      height: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsTableHeader, "-row"),
    style: {
      height: 56
    }
  }, columns.map(function (column, index) {
    return /*#__PURE__*/React.createElement("div", {
      key: column.name,
      className: "".concat(prefixClsTableHeader, "-cell"),
      style: _objectSpread2({
        width: columnsWidth[index],
        minWidth: column.minWidth,
        maxWidth: column.maxWidth,
        textAlign: column.align ? column.align : 'left'
      }, column.style)
    }, /*#__PURE__*/React.createElement("div", {
      className: "".concat(prefixClsTableHeader, "-head-cell")
    }, /*#__PURE__*/React.createElement("span", {
      className: "".concat(prefixClsTableHeader, "-ellipsis")
    }, column.label)));
  }))));
};
var TableHeader$1 = observer(TableHeader);

var css_248z$3 = ".index_gantt-time-axis__2T-uy {\n  height: 56px;\n  position: absolute;\n  top: 0;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  overflow: hidden;\n  cursor: ew-resize;\n}\n.index_gantt-time-axis-render-chunk__1kXI0 {\n  position: absolute;\n  top: 0;\n  left: 0;\n  height: 56px;\n  pointer-events: none;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  will-change: transform;\n}\n.index_gantt-time-axis-today__1sTTO {\n  background-color: #2c7ef8;\n  border-radius: 50%;\n  color: #fff;\n}\n.index_gantt-time-axis-major__3_uan {\n  position: absolute;\n  overflow: hidden;\n  box-sizing: content-box;\n  height: 28px;\n  border-right: 1px solid #f0f0f0;\n  font-weight: 400;\n  text-align: left;\n  font-size: 13px;\n  line-height: 28px;\n}\n.index_gantt-time-axis-major-label__28y5S {\n  overflow: hidden;\n  padding-left: 8px;\n  white-space: nowrap;\n}\n.index_gantt-time-axis-minor__NEUpo {\n  position: absolute;\n  top: 27px;\n  box-sizing: content-box;\n  height: 28px;\n  border-top: 1px solid #f0f0f0;\n  border-right: 1px solid #f0f0f0;\n  text-align: center;\n  font-size: 12px;\n  line-height: 28px;\n  color: #202d40;\n}\n.index_gantt-time-axis-minor__NEUpo.index_weekends__u7iVA {\n  background-color: hsla(0, 0%, 96.9%, 0.5);\n}\n";
styleInject(css_248z$3);

var TimeAxis = function TimeAxis() {
  var _useContext = useContext(context),
    store = _useContext.store,
    prefixCls = _useContext.prefixCls;
  var prefixClsTimeAxis = "".concat(prefixCls, "-time-axis");
  var sightConfig = store.sightConfig,
    isToday = store.isToday;
  var majorList = store.getMajorList();
  var minorList = store.getMinorList();
  var handleResize = useCallback(function (_ref) {
    var x = _ref.x;
    store.handlePanMove(-x);
  }, [store]);
  var handleLeftResizeEnd = useCallback(function () {
    store.handlePanEnd();
  }, [store]);
  var getIsToday = useCallback(function (item) {
    var key = item.key;
    var type = sightConfig.type;
    return type === 'day' && isToday(key);
  }, [sightConfig, isToday]);
  return /*#__PURE__*/React.createElement(DragResize$1, {
    onResize: handleResize,
    onResizeEnd: handleLeftResizeEnd,
    defaultSize: {
      x: -store.translateX,
      width: 0
    },
    type: 'move'
  }, /*#__PURE__*/React.createElement("div", {
    className: prefixClsTimeAxis,
    style: {
      left: store.tableWidth,
      width: store.viewWidth
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixClsTimeAxis, "-render-chunk"),
    style: {
      transform: "translateX(-".concat(store.translateX, "px")
    }
  }, majorList.map(function (item) {
    return /*#__PURE__*/React.createElement("div", {
      key: item.key,
      className: "".concat(prefixClsTimeAxis, "-major"),
      style: {
        width: item.width,
        left: item.left
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "".concat(prefixClsTimeAxis, "-major-label")
    }, item.label));
  }), minorList.map(function (item) {
    return /*#__PURE__*/React.createElement("div", {
      key: item.key,
      className: classNames("".concat(prefixClsTimeAxis, "-minor")),
      style: {
        width: item.width,
        left: item.left
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: classNames("".concat(prefixClsTimeAxis, "-minor-label"), _defineProperty({}, "".concat(prefixClsTimeAxis, "-today"), getIsToday(item)))
    }, item.label));
  }))));
};
var TimeAxis$1 = observer(TimeAxis);

var css_248z$2 = ".index_gantt-time-axis-scale-select__2YbrQ .index_next-menu__scr4y {\n  position: relative;\n  min-width: 150px;\n  padding: 4px 0;\n  margin: 0;\n  list-style: none;\n  border-radius: 4px;\n  background: #fff;\n  line-height: 36px;\n  font-size: 14px;\n}\n.index_gantt-time-axis-scale-select__2YbrQ .index_next-menu__scr4y,\n.index_gantt-time-axis-scale-select__2YbrQ .index_next-menu__scr4y *,\n.index_gantt-time-axis-scale-select__2YbrQ .index_next-menu__scr4y :after,\n.index_gantt-time-axis-scale-select__2YbrQ .index_next-menu__scr4y :before {\n  box-sizing: border-box;\n}\n.index_gantt-time-axis-scale-select__2YbrQ .index_next-menu__scr4y,\n.index_gantt-time-axis-scale-select__2YbrQ .index_next-select-trigger__KOGdU,\n.index_gantt-time-axis-scale-select__2YbrQ .index_next-select__25x87 .index_next-select-inner__2N5dr {\n  min-width: unset;\n}\n.index_gantt-time-axis-scale-select__2YbrQ .index_next-menu-item-text__3zizH {\n  line-height: 36px;\n}\n.index_time-axis-scale-select__3fTI__1_q9W .index_next-menu-item-text__3zizH {\n  line-height: 36px;\n}\n.index_gantt-shadow__2ag9A {\n  position: absolute;\n  top: 4px;\n  right: 0;\n  width: 90px;\n  height: 48px;\n  z-index: 0;\n  transition: box-shadow 0.5s;\n}\n.index_gantt-shadow__2ag9A.index_gantt-scrolling__RfHxr {\n  box-shadow: -3px 0 7px 0 #e5e5e5;\n}\n.index_gantt-trigger__2quJ_ {\n  position: absolute;\n  top: 0;\n  right: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 56px;\n  border-top-right-radius: 4px;\n  background-color: #fff;\n  border-left: 1px solid #f0f0f0;\n  color: #bfbfbf;\n  padding: 0 8px 0 12px;\n  cursor: pointer;\n  width: 90px;\n  z-index: 1;\n  transition: color 0.2s;\n}\n.index_gantt-trigger__2quJ_:hover {\n  color: #8c8c8c;\n}\n.index_gantt-trigger__2quJ_:hover .index_gantt-text__30qJY {\n  color: #262626;\n}\n.index_gantt-trigger__2quJ_ .index_gantt-text__30qJY {\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  margin-right: 4px;\n  font-size: 14px;\n  color: #202d40;\n}\n.index_dropdown-icon__2A-ep {\n  width: 20px;\n  height: 20px;\n  line-height: 20px;\n}\n.index_dropdown-icon__2A-ep svg {\n  fill: currentColor;\n}\n.index_next-overlay-wrapper__2paIs {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n}\n.index_next-overlay-wrapper__2paIs .index_next-overlay-inner__3K_MS {\n  z-index: 1001;\n  border-radius: 4px;\n  box-shadow: 0 12px 32px 0 rgba(38, 38, 38, 0.16);\n  -webkit-transform: translateZ(0);\n  transform: translateZ(0);\n}\n.index_next-overlay-wrapper__2paIs .index_next-overlay-backdrop__1fZaA {\n  position: fixed;\n  z-index: 1001;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background: #000;\n  transition: opacity 0.3s;\n  opacity: 0;\n}\n.index_next-overlay-wrapper__2paIs.index_opened__3rXoK .index_next-overlay-backdrop__1fZaA {\n  opacity: 0.3;\n}\n.index_next-menu-item__31C_P {\n  position: relative;\n  padding: 0 12px 0 40px;\n  transition: background 0.2s ease;\n  color: #262626;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n}\n.index_next-menu-item__31C_P .index_gantt-selected_icon__2FIEC {\n  position: absolute;\n  left: 12px;\n  width: 20px;\n  height: 20px;\n  line-height: 20px;\n}\n.index_next-menu-item__31C_P .index_gantt-selected_icon__2FIEC svg {\n  fill: #1b9aee;\n}\n.index_next-menu-item__31C_P:hover {\n  font-weight: 400;\n  background-color: #f7f7f7;\n}\n.index_next-menu-item__31C_P.index_next-selected__tlxaN {\n  color: #262626;\n  background-color: #fff;\n}\n.index_next-menu-item__31C_P.index_next-selected__tlxaN .index_next-menu-icon-arrow__2IYNN {\n  color: #bfbfbf;\n}\n";
styleInject(css_248z$2);

var TimeAxisScaleSelect = function TimeAxisScaleSelect() {
  var _useContext = useContext(context),
    store = _useContext.store,
    prefixCls = _useContext.prefixCls;
  var sightConfig = store.sightConfig,
    scrolling = store.scrolling,
    viewTypeList = store.viewTypeList;
  var _useState = useState(false),
    _useState2 = _slicedToArray(_useState, 2),
    visible = _useState2[0],
    setVisible = _useState2[1];
  var ref = useRef(null);
  useClickAway(function () {
    setVisible(false);
  }, ref);
  var handleClick = useCallback(function () {
    setVisible(true);
  }, []);
  var handleSelect = useCallback(function (item) {
    store.switchSight(item.type);
    setVisible(false);
  }, [store]);
  var selected = sightConfig.type;
  var isSelected = useCallback(function (key) {
    return key === selected;
  }, [selected]);
  return /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixCls, "-time-axis-scale-select"),
    ref: ref
  }, /*#__PURE__*/React.createElement("div", {
    role: 'none',
    className: "".concat(prefixCls, "-trigger"),
    onClick: handleClick
  }, /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixCls, "-text")
  }, sightConfig.label), /*#__PURE__*/React.createElement("span", {
    className: 'dropdown-icon'
  }, /*#__PURE__*/React.createElement("svg", {
    id: 'at-triangle-down-s',
    viewBox: '0 0 1024 1024'
  }, /*#__PURE__*/React.createElement("path", {
    d: 'M296.704 409.6a14.9504 14.9504 0 0 0-10.752 4.608 15.5648 15.5648 0 0 0 0.1536 21.7088l210.8416 212.0704a24.832 24.832 0 0 0 35.584-0.256l205.5168-211.968a15.5136 15.5136 0 0 0 4.352-10.752c0-8.4992-6.7584-15.4112-15.104-15.4112h-430.592z'
  })))), /*#__PURE__*/React.createElement("div", {
    className: classNames("".concat(prefixCls, "-shadow"), _defineProperty({}, "".concat(prefixCls, "-scrolling"), scrolling))
  }), visible && (/*#__PURE__*/React.createElement("div", {
    className: classNames('next-overlay-wrapper', 'opened')
  }, /*#__PURE__*/React.createElement("div", {
    className: classNames('next-overlay-inner'),
    "aria-hidden": 'false',
    style: {
      position: 'absolute',
      right: 15,
      top: 60
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: 'next-loading-wrap'
  }, /*#__PURE__*/React.createElement("ul", {
    role: 'listbox',
    className: classNames('next-menu'),
    "aria-multiselectable": 'false'
  }, viewTypeList.map(function (item) {
    return /*#__PURE__*/React.createElement("li", {
      key: item.type,
      role: 'none',
      onClick: function onClick() {
        handleSelect(item);
      },
      className: classNames('next-menu-item', {
        'next-selected': isSelected(item.type)
      })
    }, isSelected(item.type) && (/*#__PURE__*/React.createElement("i", {
      className: "".concat(prefixCls, "-selected_icon")
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: '0 0 1024 1024'
    }, /*#__PURE__*/React.createElement("path", {
      d: 'M413.7472 768a29.5936 29.5936 0 0 1-21.6576-9.472l-229.5296-241.152a33.3824 33.3824 0 0 1 0-45.5168 29.696 29.696 0 0 1 43.4176 0l207.7696 218.368 404.2752-424.7552a29.5936 29.5936 0 0 1 43.4176 0 33.3824 33.3824 0 0 1 0 45.568l-425.984 447.488A29.5936 29.5936 0 0 1 413.696 768'
    })))), /*#__PURE__*/React.createElement("span", {
      className: 'next-menu-item-text',
      "aria-selected": 'true'
    }, item.label));
  })))))));
};
var TimeAxisScaleSelect$1 = observer(TimeAxisScaleSelect);

var css_248z$1 = ".index_gantt-time-indicator__CUjh_ {\n  position: absolute;\n  top: 0;\n  left: 0;\n  background-color: #096dd9;\n  box-shadow: 0 2px 4px rgba(1, 113, 194, 0.1);\n  transform: translate(12px, 14px);\n  transition: opacity 0.3s;\n  padding: 0 7px;\n  color: #fff;\n  border-radius: 4px;\n  outline: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  box-sizing: border-box;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  vertical-align: middle;\n  cursor: pointer;\n  border: none;\n  font-size: 12px;\n}\n.index_gantt-time-indicator-scrolling__371Kk {\n  opacity: 0;\n}\n";
styleInject(css_248z$1);

var TimeIndicator = function TimeIndicator() {
  var _useContext = useContext(context),
    store = _useContext.store,
    prefixCls = _useContext.prefixCls;
  var scrolling = store.scrolling,
    translateX = store.translateX,
    tableWidth = store.tableWidth,
    viewWidth = store.viewWidth,
    todayTranslateX = store.todayTranslateX,
    locale = store.locale;
  var prefixClsTimeIndicator = "".concat(prefixCls, "-time-indicator");
  var type = todayTranslateX < translateX ? 'left' : 'right';
  var left = type === 'left' ? tableWidth : 'unset';
  var right = type === 'right' ? 111 : 'unset';
  var display = useMemo(function () {
    var isOverLeft = todayTranslateX < translateX;
    var isOverRight = todayTranslateX > translateX + viewWidth;
    return isOverLeft || isOverRight ? 'block' : 'none';
  }, [todayTranslateX, translateX, viewWidth]);
  var handleClick = useCallback(function () {
    store.scrollToToday();
  }, [store]);
  return /*#__PURE__*/React.createElement("button", {
    onClick: handleClick,
    className: classNames(prefixClsTimeIndicator, _defineProperty({}, "".concat(prefixClsTimeIndicator, "-scrolling"), scrolling)),
    type: "button",
    "data-role": "button",
    style: {
      left: left,
      right: right,
      display: display
    }
  }, /*#__PURE__*/React.createElement("span", null, locale.today));
};
var TimeIndicator$1 = observer(TimeIndicator);

var css_248z = ".Gantt_gantt-body__1u_Xt {\n  height: 100%;\n  width: 100%;\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  border: 1px solid #f0f0f0;\n  border-radius: 4px;\n  background: #fff;\n}\n.Gantt_gantt-body__1u_Xt *,\n.Gantt_gantt-body__1u_Xt *::before,\n.Gantt_gantt-body__1u_Xt *::after {\n  box-sizing: border-box;\n}\n.Gantt_gantt-body__1u_Xt header {\n  position: relative;\n  overflow: hidden;\n  width: 100%;\n  height: 56px;\n}\n.Gantt_gantt-body__1u_Xt main {\n  position: relative;\n  overflow-x: hidden;\n  overflow-y: auto;\n  width: 100%;\n  flex: 1;\n  border-top: 1px solid #f0f0f0;\n  will-change: transform;\n  will-change: overflow;\n}\n";
styleInject(css_248z);

var enUS = Object.freeze({
  today: "Today",
  day: "Day",
  days: "Days",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  halfYear: "Half year",
  firstHalf: "First half",
  secondHalf: "Second half",
  majorFormat: {
    day: "YYYY, MMMM",
    week: "YYYY, MMMM",
    month: "YYYY",
    quarter: "YYYY",
    halfYear: "YYYY"
  },
  minorFormat: {
    day: "D",
    week: "wo [week]",
    month: "MMMM",
    quarter: "[Q]Q",
    halfYear: "YYYY-"
  }
});

var zhCN = Object.freeze({
  today: "今天",
  day: "日视图",
  days: "天数",
  week: "周视图",
  month: "月视图",
  quarter: "季视图",
  halfYear: "年视图",
  firstHalf: "上半年",
  secondHalf: "下半年",
  majorFormat: {
    day: "YYYY年MM月",
    week: "YYYY年MM月",
    month: "YYYY年",
    quarter: "YYYY年",
    halfYear: "YYYY年"
  },
  minorFormat: {
    day: "YYYY-MM-D",
    week: "YYYY-w周",
    month: "YYYY-MM月",
    quarter: "YYYY-第Q季",
    halfYear: "YYYY-"
  }
});

var prefixCls = 'gantt';
var Body = function Body(_ref) {
  var children = _ref.children;
  var _useContext = useContext(context),
    store = _useContext.store;
  var reference = useRef(null);
  var size = useSize(reference);
  useEffect(function () {
    store.syncSize(size);
  }, [size, store]);
  return /*#__PURE__*/React.createElement("div", {
    className: "".concat(prefixCls, "-body"),
    ref: reference
  }, children);
};
var defaultLocale = _objectSpread2({}, zhCN);
var GanttComponent = function GanttComponent(props) {
  var data = props.data,
    columns = props.columns,
    _props$dependencies = props.dependencies,
    dependencies = _props$dependencies === void 0 ? [] : _props$dependencies,
    onUpdate = props.onUpdate,
    _props$startDateKey = props.startDateKey,
    startDateKey = _props$startDateKey === void 0 ? 'startDate' : _props$startDateKey,
    _props$endDateKey = props.endDateKey,
    endDateKey = _props$endDateKey === void 0 ? 'endDate' : _props$endDateKey,
    isRestDay = props.isRestDay,
    getBarColor = props.getBarColor,
    _props$showBackToday = props.showBackToday,
    showBackToday = _props$showBackToday === void 0 ? true : _props$showBackToday,
    _props$showUnitSwitch = props.showUnitSwitch,
    showUnitSwitch = _props$showUnitSwitch === void 0 ? true : _props$showUnitSwitch,
    unit = props.unit,
    onRow = props.onRow,
    _props$tableIndent = props.tableIndent,
    tableIndent = _props$tableIndent === void 0 ? TABLE_INDENT : _props$tableIndent,
    expandIcon = props.expandIcon,
    renderBar = props.renderBar,
    renderInvalidBar = props.renderInvalidBar,
    renderGroupBar = props.renderGroupBar,
    onBarClick = props.onBarClick,
    _props$tableCollapseA = props.tableCollapseAble,
    tableCollapseAble = _props$tableCollapseA === void 0 ? true : _props$tableCollapseA,
    renderBarThumb = props.renderBarThumb,
    _props$scrollTop = props.scrollTop,
    scrollTop = _props$scrollTop === void 0 ? true : _props$scrollTop,
    _props$rowHeight = props.rowHeight,
    rowHeight = _props$rowHeight === void 0 ? ROW_HEIGHT : _props$rowHeight,
    columnsWidth = props.columnsWidth,
    innerRef = props.innerRef,
    _props$disabled = props.disabled,
    disabled = _props$disabled === void 0 ? false : _props$disabled,
    _props$alwaysShowTask = props.alwaysShowTaskBar,
    alwaysShowTaskBar = _props$alwaysShowTask === void 0 ? true : _props$alwaysShowTask,
    renderLeftText = props.renderLeftText,
    renderRightText = props.renderRightText,
    onExpand = props.onExpand,
    _props$customSights = props.customSights,
    customSights = _props$customSights === void 0 ? [] : _props$customSights,
    _props$locale = props.locale,
    locale = _props$locale === void 0 ? _objectSpread2({}, defaultLocale) : _props$locale,
    _props$hideTable = props.hideTable,
    hideTable = _props$hideTable === void 0 ? false : _props$hideTable;
  var store = useMemo(function () {
    return new GanttStore({
      rowHeight: rowHeight,
      disabled: disabled,
      customSights: customSights,
      locale: locale,
      columnsWidth: columnsWidth
    });
  }, [rowHeight]);
  useEffect(function () {
    store.setData(data, startDateKey, endDateKey);
  }, [data, endDateKey, startDateKey, store]);
  useEffect(function () {
    store.setColumns(columns);
  }, [columns, store]);
  useEffect(function () {
    store.setOnUpdate(onUpdate);
  }, [onUpdate, store]);
  useEffect(function () {
    store.setDependencies(dependencies);
  }, [dependencies, store]);
  useEffect(function () {
    store.setHideTable(hideTable);
  }, [hideTable]);
  useEffect(function () {
    if (isRestDay) store.setIsRestDay(isRestDay);
  }, [isRestDay, store]);
  useEffect(function () {
    if (unit) store.switchSight(unit);
  }, [unit, store]);
  useImperativeHandle(innerRef, function () {
    return {
      backToday: function backToday() {
        return store.scrollToToday();
      },
      getWidthByDate: store.getWidthByDate
    };
  });
  var ContextValue = React.useMemo(function () {
    return {
      prefixCls: prefixCls,
      store: store,
      getBarColor: getBarColor,
      showBackToday: showBackToday,
      showUnitSwitch: showUnitSwitch,
      onRow: onRow,
      tableIndent: tableIndent,
      expandIcon: expandIcon,
      renderBar: renderBar,
      renderInvalidBar: renderInvalidBar,
      renderGroupBar: renderGroupBar,
      onBarClick: onBarClick,
      tableCollapseAble: tableCollapseAble,
      renderBarThumb: renderBarThumb,
      scrollTop: scrollTop,
      barHeight: BAR_HEIGHT,
      alwaysShowTaskBar: alwaysShowTaskBar,
      renderLeftText: renderLeftText,
      renderRightText: renderRightText,
      onExpand: onExpand,
      hideTable: hideTable
    };
  }, [store, getBarColor, showBackToday, showUnitSwitch, onRow, tableIndent, expandIcon, renderBar, renderInvalidBar, renderGroupBar, onBarClick, tableCollapseAble, renderBarThumb, scrollTop, alwaysShowTaskBar, renderLeftText, renderRightText, onExpand, hideTable]);
  return /*#__PURE__*/React.createElement(context.Provider, {
    value: ContextValue
  }, /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement("header", null, !hideTable && /*#__PURE__*/React.createElement(TableHeader$1, null), /*#__PURE__*/React.createElement(TimeAxis$1, null)), /*#__PURE__*/React.createElement("main", {
    ref: store.mainElementRef,
    onScroll: store.handleScroll
  }, /*#__PURE__*/React.createElement(SelectionIndicator$1, null), !hideTable && /*#__PURE__*/React.createElement(TableBody$1, null), /*#__PURE__*/React.createElement(Chart$1, null)), !hideTable && /*#__PURE__*/React.createElement(Divider$1, null), showBackToday && /*#__PURE__*/React.createElement(TimeIndicator$1, null), showUnitSwitch && /*#__PURE__*/React.createElement(TimeAxisScaleSelect$1, null), /*#__PURE__*/React.createElement(ScrollBar$1, null), scrollTop && /*#__PURE__*/React.createElement(ScrollTop$1, null)));
};

export { Gantt, GanttComponent as default, enUS, zhCN };

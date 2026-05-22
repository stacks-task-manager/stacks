import { usePersistFn, useClickAway, useSize } from 'ahooks';
import React, { createContext, useContext, useState, useMemo, useRef, useCallback, createRef, memo, useEffect, useImperativeHandle } from 'react';
import { observer } from 'mobx-react-lite';
import classNames from 'classnames';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { observable, action, computed, runInAction, toJS } from 'mobx';

function _typeof(o) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
    return typeof o;
  } : function (o) {
    return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
  }, _typeof(o);
}

function toPrimitive(t, r) {
  if ("object" != _typeof(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != _typeof(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}

function toPropertyKey(t) {
  var i = toPrimitive(t, "string");
  return "symbol" == _typeof(i) ? i : i + "";
}

function _defineProperty(e, r, t) {
  return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[r] = t, e;
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

var context = /*#__PURE__*/createContext({});

function _arrayLikeToArray(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}

function _unsupportedIterableToArray(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
  }
}

function _createForOfIteratorHelper(r, e) {
  var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (!t) {
    if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) {
      t && (r = t);
      var _n = 0,
        F = function F() {};
      return {
        s: F,
        n: function n() {
          return _n >= r.length ? {
            done: !0
          } : {
            done: !1,
            value: r[_n++]
          };
        },
        e: function e(r) {
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
    s: function s() {
      t = t.call(r);
    },
    n: function n() {
      var r = t.next();
      return a = r.done, r;
    },
    e: function e(r) {
      u = !0, o = r;
    },
    f: function f() {
      try {
        a || null == t["return"] || t["return"]();
      } finally {
        if (u) throw o;
      }
    }
  };
}

function _arrayWithoutHoles(r) {
  if (Array.isArray(r)) return _arrayLikeToArray(r);
}

function _iterableToArray(r) {
  if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r);
}

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

function _toConsumableArray(r) {
  return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread();
}

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

var css_248z$h = ".gantt-group-bar {\n  position: absolute;\n  top: 0;\n  left: 0;\n  display: flex;\n}\n.gantt-group-bar .gantt-bar {\n  position: relative;\n  top: -3px;\n}\n";
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

function _arrayWithHoles(r) {
  if (Array.isArray(r)) return r;
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
        if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
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

function _slicedToArray(r, e) {
  return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
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

function _defineProperties(e, r) {
  for (var t = 0; t < r.length; t++) {
    var o = r[t];
    o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, toPropertyKey(o.key), o);
  }
}
function _createClass(e, r, t) {
  return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", {
    writable: !1
  }), e;
}

function _classCallCheck(a, n) {
  if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
}

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

var css_248z$g = ".gantt-invalid-task-bar {\n  position: absolute;\n  left: 0;\n  width: 100vw;\n}\n.gantt-invalid-task-bar-block {\n  position: absolute;\n  width: 16px;\n  min-width: 8px;\n  height: 9px;\n  left: 0;\n  border: 1px solid;\n  border-radius: 2px;\n  cursor: pointer;\n  z-index: 1;\n}\n.gantt-invalid-task-bar-date {\n  position: absolute;\n  top: -6px;\n  white-space: nowrap;\n  color: #262626;\n  font-size: 12px;\n}\n";
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

function _regeneratorRuntime() {
  _regeneratorRuntime = function _regeneratorRuntime() {
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
    define = function define(t, e, r) {
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
        return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) {
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
      value: function value(t, n) {
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
    if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y;
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
    throw new TypeError(_typeof(e) + " is not iterable");
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
    reset: function reset(e) {
      if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t);
    },
    stop: function stop() {
      this.done = !0;
      var t = this.tryEntries[0].completion;
      if ("throw" === t.type) throw t.arg;
      return this.rval;
    },
    dispatchException: function dispatchException(e) {
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
    abrupt: function abrupt(t, e) {
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
    complete: function complete(t, e) {
      if ("throw" === t.type) throw t.arg;
      return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y;
    },
    finish: function finish(t) {
      for (var e = this.tryEntries.length - 1; e >= 0; --e) {
        var r = this.tryEntries[e];
        if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y;
      }
    },
    "catch": function _catch(t) {
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
    delegateYield: function delegateYield(e, r, n) {
      return this.delegate = {
        iterator: values(e),
        resultName: r,
        nextLoc: n
      }, "next" === this.method && (this.arg = t), y;
    }
  }, e;
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

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

var isObject_1 = isObject;

/** Detect free variable `global` from Node.js. */

var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

var _freeGlobal = freeGlobal;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = _freeGlobal || freeSelf || Function('return this')();

var _root = root;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return _root.Date.now();
};

var now_1 = now;

/** Used to match a single whitespace character. */
var reWhitespace = /\s/;

/**
 * Used by `_.trim` and `_.trimEnd` to get the index of the last non-whitespace
 * character of `string`.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {number} Returns the index of the last non-whitespace character.
 */
function trimmedEndIndex(string) {
  var index = string.length;

  while (index-- && reWhitespace.test(string.charAt(index))) {}
  return index;
}

var _trimmedEndIndex = trimmedEndIndex;

/** Used to match leading whitespace. */
var reTrimStart = /^\s+/;

/**
 * The base implementation of `_.trim`.
 *
 * @private
 * @param {string} string The string to trim.
 * @returns {string} Returns the trimmed string.
 */
function baseTrim(string) {
  return string
    ? string.slice(0, _trimmedEndIndex(string) + 1).replace(reTrimStart, '')
    : string;
}

var _baseTrim = baseTrim;

/** Built-in value references. */
var Symbol$1 = _root.Symbol;

var _Symbol = Symbol$1;

/** Used for built-in method references. */
var objectProto$b = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$8 = objectProto$b.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$b.toString;

/** Built-in value references. */
var symToStringTag$1 = _Symbol ? _Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty$8.call(value, symToStringTag$1),
      tag = value[symToStringTag$1];

  try {
    value[symToStringTag$1] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString$1.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}

var _getRawTag = getRawTag;

/** Used for built-in method references. */
var objectProto$a = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto$a.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

var _objectToString = objectToString;

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = _Symbol ? _Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? _getRawTag(value)
    : _objectToString(value);
}

var _baseGetTag = baseGetTag;

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

var isObjectLike_1 = isObjectLike;

/** `Object#toString` result references. */
var symbolTag$1 = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike_1(value) && _baseGetTag(value) == symbolTag$1);
}

var isSymbol_1 = isSymbol;

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol_1(value)) {
    return NAN;
  }
  if (isObject_1(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject_1(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = _baseTrim(value);
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

var toNumber_1 = toNumber;

/** Error message constants. */
var FUNC_ERROR_TEXT$2 = 'Expected a function';

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax$1 = Math.max,
    nativeMin = Math.min;

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT$2);
  }
  wait = toNumber_1(wait) || 0;
  if (isObject_1(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax$1(toNumber_1(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        timeWaiting = wait - timeSinceLastCall;

    return maxing
      ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now_1();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now_1());
  }

  function debounced() {
    var time = now_1(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        clearTimeout(timerId);
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

var debounce_1 = debounce;

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

var _listCacheClear = listCacheClear;

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

var eq_1 = eq;

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq_1(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

var _assocIndexOf = assocIndexOf;

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = _assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

var _listCacheDelete = listCacheDelete;

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = _assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

var _listCacheGet = listCacheGet;

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return _assocIndexOf(this.__data__, key) > -1;
}

var _listCacheHas = listCacheHas;

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = _assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

var _listCacheSet = listCacheSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = _listCacheClear;
ListCache.prototype['delete'] = _listCacheDelete;
ListCache.prototype.get = _listCacheGet;
ListCache.prototype.has = _listCacheHas;
ListCache.prototype.set = _listCacheSet;

var _ListCache = ListCache;

/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new _ListCache;
  this.size = 0;
}

var _stackClear = stackClear;

/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  var data = this.__data__,
      result = data['delete'](key);

  this.size = data.size;
  return result;
}

var _stackDelete = stackDelete;

/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

var _stackGet = stackGet;

/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

var _stackHas = stackHas;

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag$1 = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject_1(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = _baseGetTag(value);
  return tag == funcTag$1 || tag == genTag || tag == asyncTag || tag == proxyTag;
}

var isFunction_1 = isFunction;

/** Used to detect overreaching core-js shims. */
var coreJsData = _root['__core-js_shared__'];

var _coreJsData = coreJsData;

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(_coreJsData && _coreJsData.keys && _coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

var _isMasked = isMasked;

/** Used for built-in method references. */
var funcProto$1 = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString$1 = funcProto$1.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString$1.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

var _toSource = toSource;

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto$9 = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty$7 = objectProto$9.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty$7).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject_1(value) || _isMasked(value)) {
    return false;
  }
  var pattern = isFunction_1(value) ? reIsNative : reIsHostCtor;
  return pattern.test(_toSource(value));
}

var _baseIsNative = baseIsNative;

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

var _getValue = getValue;

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = _getValue(object, key);
  return _baseIsNative(value) ? value : undefined;
}

var _getNative = getNative;

/* Built-in method references that are verified to be native. */
var Map = _getNative(_root, 'Map');

var _Map = Map;

/* Built-in method references that are verified to be native. */
var nativeCreate = _getNative(Object, 'create');

var _nativeCreate = nativeCreate;

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = _nativeCreate ? _nativeCreate(null) : {};
  this.size = 0;
}

var _hashClear = hashClear;

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

var _hashDelete = hashDelete;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED$2 = '__lodash_hash_undefined__';

/** Used for built-in method references. */
var objectProto$8 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$6 = objectProto$8.hasOwnProperty;

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (_nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED$2 ? undefined : result;
  }
  return hasOwnProperty$6.call(data, key) ? data[key] : undefined;
}

var _hashGet = hashGet;

/** Used for built-in method references. */
var objectProto$7 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$5 = objectProto$7.hasOwnProperty;

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return _nativeCreate ? (data[key] !== undefined) : hasOwnProperty$5.call(data, key);
}

var _hashHas = hashHas;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (_nativeCreate && value === undefined) ? HASH_UNDEFINED$1 : value;
  return this;
}

var _hashSet = hashSet;

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = _hashClear;
Hash.prototype['delete'] = _hashDelete;
Hash.prototype.get = _hashGet;
Hash.prototype.has = _hashHas;
Hash.prototype.set = _hashSet;

var _Hash = Hash;

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new _Hash,
    'map': new (_Map || _ListCache),
    'string': new _Hash
  };
}

var _mapCacheClear = mapCacheClear;

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

var _isKeyable = isKeyable;

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return _isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

var _getMapData = getMapData;

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = _getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

var _mapCacheDelete = mapCacheDelete;

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return _getMapData(this, key).get(key);
}

var _mapCacheGet = mapCacheGet;

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return _getMapData(this, key).has(key);
}

var _mapCacheHas = mapCacheHas;

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = _getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

var _mapCacheSet = mapCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = _mapCacheClear;
MapCache.prototype['delete'] = _mapCacheDelete;
MapCache.prototype.get = _mapCacheGet;
MapCache.prototype.has = _mapCacheHas;
MapCache.prototype.set = _mapCacheSet;

var _MapCache = MapCache;

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof _ListCache) {
    var pairs = data.__data__;
    if (!_Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new _MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}

var _stackSet = stackSet;

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new _ListCache(entries);
  this.size = data.size;
}

// Add methods to `Stack`.
Stack.prototype.clear = _stackClear;
Stack.prototype['delete'] = _stackDelete;
Stack.prototype.get = _stackGet;
Stack.prototype.has = _stackHas;
Stack.prototype.set = _stackSet;

var _Stack = Stack;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Adds `value` to the array cache.
 *
 * @private
 * @name add
 * @memberOf SetCache
 * @alias push
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache instance.
 */
function setCacheAdd(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}

var _setCacheAdd = setCacheAdd;

/**
 * Checks if `value` is in the array cache.
 *
 * @private
 * @name has
 * @memberOf SetCache
 * @param {*} value The value to search for.
 * @returns {number} Returns `true` if `value` is found, else `false`.
 */
function setCacheHas(value) {
  return this.__data__.has(value);
}

var _setCacheHas = setCacheHas;

/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var index = -1,
      length = values == null ? 0 : values.length;

  this.__data__ = new _MapCache;
  while (++index < length) {
    this.add(values[index]);
  }
}

// Add methods to `SetCache`.
SetCache.prototype.add = SetCache.prototype.push = _setCacheAdd;
SetCache.prototype.has = _setCacheHas;

var _SetCache = SetCache;

/**
 * A specialized version of `_.some` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function arraySome(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }
  return false;
}

var _arraySome = arraySome;

/**
 * Checks if a `cache` value for `key` exists.
 *
 * @private
 * @param {Object} cache The cache to query.
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function cacheHas(cache, key) {
  return cache.has(key);
}

var _cacheHas = cacheHas;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG$5 = 1,
    COMPARE_UNORDERED_FLAG$3 = 2;

/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `array` and `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG$5,
      arrLength = array.length,
      othLength = other.length;

  if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
    return false;
  }
  // Check that cyclic values are equal.
  var arrStacked = stack.get(array);
  var othStacked = stack.get(other);
  if (arrStacked && othStacked) {
    return arrStacked == other && othStacked == array;
  }
  var index = -1,
      result = true,
      seen = (bitmask & COMPARE_UNORDERED_FLAG$3) ? new _SetCache : undefined;

  stack.set(array, other);
  stack.set(other, array);

  // Ignore non-index properties.
  while (++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, arrValue, index, other, array, stack)
        : customizer(arrValue, othValue, index, array, other, stack);
    }
    if (compared !== undefined) {
      if (compared) {
        continue;
      }
      result = false;
      break;
    }
    // Recursively compare arrays (susceptible to call stack limits).
    if (seen) {
      if (!_arraySome(other, function(othValue, othIndex) {
            if (!_cacheHas(seen, othIndex) &&
                (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
              return seen.push(othIndex);
            }
          })) {
        result = false;
        break;
      }
    } else if (!(
          arrValue === othValue ||
            equalFunc(arrValue, othValue, bitmask, customizer, stack)
        )) {
      result = false;
      break;
    }
  }
  stack['delete'](array);
  stack['delete'](other);
  return result;
}

var _equalArrays = equalArrays;

/** Built-in value references. */
var Uint8Array = _root.Uint8Array;

var _Uint8Array = Uint8Array;

/**
 * Converts `map` to its key-value pairs.
 *
 * @private
 * @param {Object} map The map to convert.
 * @returns {Array} Returns the key-value pairs.
 */
function mapToArray(map) {
  var index = -1,
      result = Array(map.size);

  map.forEach(function(value, key) {
    result[++index] = [key, value];
  });
  return result;
}

var _mapToArray = mapToArray;

/**
 * Converts `set` to an array of its values.
 *
 * @private
 * @param {Object} set The set to convert.
 * @returns {Array} Returns the values.
 */
function setToArray(set) {
  var index = -1,
      result = Array(set.size);

  set.forEach(function(value) {
    result[++index] = value;
  });
  return result;
}

var _setToArray = setToArray;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG$4 = 1,
    COMPARE_UNORDERED_FLAG$2 = 2;

/** `Object#toString` result references. */
var boolTag$1 = '[object Boolean]',
    dateTag$1 = '[object Date]',
    errorTag$1 = '[object Error]',
    mapTag$2 = '[object Map]',
    numberTag$1 = '[object Number]',
    regexpTag$1 = '[object RegExp]',
    setTag$2 = '[object Set]',
    stringTag$1 = '[object String]',
    symbolTag = '[object Symbol]';

var arrayBufferTag$1 = '[object ArrayBuffer]',
    dataViewTag$2 = '[object DataView]';

/** Used to convert symbols to primitives and strings. */
var symbolProto$1 = _Symbol ? _Symbol.prototype : undefined,
    symbolValueOf = symbolProto$1 ? symbolProto$1.valueOf : undefined;

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
  switch (tag) {
    case dataViewTag$2:
      if ((object.byteLength != other.byteLength) ||
          (object.byteOffset != other.byteOffset)) {
        return false;
      }
      object = object.buffer;
      other = other.buffer;

    case arrayBufferTag$1:
      if ((object.byteLength != other.byteLength) ||
          !equalFunc(new _Uint8Array(object), new _Uint8Array(other))) {
        return false;
      }
      return true;

    case boolTag$1:
    case dateTag$1:
    case numberTag$1:
      // Coerce booleans to `1` or `0` and dates to milliseconds.
      // Invalid dates are coerced to `NaN`.
      return eq_1(+object, +other);

    case errorTag$1:
      return object.name == other.name && object.message == other.message;

    case regexpTag$1:
    case stringTag$1:
      // Coerce regexes to strings and treat strings, primitives and objects,
      // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
      // for more details.
      return object == (other + '');

    case mapTag$2:
      var convert = _mapToArray;

    case setTag$2:
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG$4;
      convert || (convert = _setToArray);

      if (object.size != other.size && !isPartial) {
        return false;
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(object);
      if (stacked) {
        return stacked == other;
      }
      bitmask |= COMPARE_UNORDERED_FLAG$2;

      // Recursively compare objects (susceptible to call stack limits).
      stack.set(object, other);
      var result = _equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
      stack['delete'](object);
      return result;

    case symbolTag:
      if (symbolValueOf) {
        return symbolValueOf.call(object) == symbolValueOf.call(other);
      }
  }
  return false;
}

var _equalByTag = equalByTag;

/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

var _arrayPush = arrayPush;

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

var isArray_1 = isArray;

/**
 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @param {Function} symbolsFunc The function to get the symbols of `object`.
 * @returns {Array} Returns the array of property names and symbols.
 */
function baseGetAllKeys(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return isArray_1(object) ? result : _arrayPush(result, symbolsFunc(object));
}

var _baseGetAllKeys = baseGetAllKeys;

/**
 * A specialized version of `_.filter` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function arrayFilter(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length,
      resIndex = 0,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}

var _arrayFilter = arrayFilter;

/**
 * This method returns a new empty array.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {Array} Returns the new empty array.
 * @example
 *
 * var arrays = _.times(2, _.stubArray);
 *
 * console.log(arrays);
 * // => [[], []]
 *
 * console.log(arrays[0] === arrays[1]);
 * // => false
 */
function stubArray() {
  return [];
}

var stubArray_1 = stubArray;

/** Used for built-in method references. */
var objectProto$6 = Object.prototype;

/** Built-in value references. */
var propertyIsEnumerable$1 = objectProto$6.propertyIsEnumerable;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols = Object.getOwnPropertySymbols;

/**
 * Creates an array of the own enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbols = !nativeGetSymbols ? stubArray_1 : function(object) {
  if (object == null) {
    return [];
  }
  object = Object(object);
  return _arrayFilter(nativeGetSymbols(object), function(symbol) {
    return propertyIsEnumerable$1.call(object, symbol);
  });
};

var _getSymbols = getSymbols;

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

var _baseTimes = baseTimes;

/** `Object#toString` result references. */
var argsTag$2 = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike_1(value) && _baseGetTag(value) == argsTag$2;
}

var _baseIsArguments = baseIsArguments;

/** Used for built-in method references. */
var objectProto$5 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$4 = objectProto$5.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable = objectProto$5.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = _baseIsArguments(function() { return arguments; }()) ? _baseIsArguments : function(value) {
  return isObjectLike_1(value) && hasOwnProperty$4.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

var isArguments_1 = isArguments;

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

var stubFalse_1 = stubFalse;

var isBuffer_1 = createCommonjsModule(function (module, exports) {
/** Detect free variable `exports`. */
var freeExports = exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? _root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse_1;

module.exports = isBuffer;
});

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER$1 = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER$1 : length;

  return !!length &&
    (type == 'number' ||
      (type != 'symbol' && reIsUint.test(value))) &&
        (value > -1 && value % 1 == 0 && value < length);
}

var _isIndex = isIndex;

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

var isLength_1 = isLength;

/** `Object#toString` result references. */
var argsTag$1 = '[object Arguments]',
    arrayTag$1 = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag$1 = '[object Map]',
    numberTag = '[object Number]',
    objectTag$2 = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag$1 = '[object Set]',
    stringTag = '[object String]',
    weakMapTag$1 = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag$1 = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag$1] = typedArrayTags[arrayTag$1] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag$1] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag] =
typedArrayTags[mapTag$1] = typedArrayTags[numberTag] =
typedArrayTags[objectTag$2] = typedArrayTags[regexpTag] =
typedArrayTags[setTag$1] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag$1] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike_1(value) &&
    isLength_1(value.length) && !!typedArrayTags[_baseGetTag(value)];
}

var _baseIsTypedArray = baseIsTypedArray;

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

var _baseUnary = baseUnary;

var _nodeUtil = createCommonjsModule(function (module, exports) {
/** Detect free variable `exports`. */
var freeExports = exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && _freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    // Use `util.types` for Node.js 10+.
    var types = freeModule && freeModule.require && freeModule.require('util').types;

    if (types) {
      return types;
    }

    // Legacy `process.binding('util')` for Node.js < 10.
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

module.exports = nodeUtil;
});

/* Node.js helper references. */
var nodeIsTypedArray = _nodeUtil && _nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? _baseUnary(nodeIsTypedArray) : _baseIsTypedArray;

var isTypedArray_1 = isTypedArray;

/** Used for built-in method references. */
var objectProto$4 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$3 = objectProto$4.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray_1(value),
      isArg = !isArr && isArguments_1(value),
      isBuff = !isArr && !isArg && isBuffer_1(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray_1(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? _baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty$3.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           _isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

var _arrayLikeKeys = arrayLikeKeys;

/** Used for built-in method references. */
var objectProto$3 = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$3;

  return value === proto;
}

var _isPrototype = isPrototype;

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

var _overArg = overArg;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = _overArg(Object.keys, Object);

var _nativeKeys = nativeKeys;

/** Used for built-in method references. */
var objectProto$2 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$2 = objectProto$2.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!_isPrototype(object)) {
    return _nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty$2.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

var _baseKeys = baseKeys;

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength_1(value.length) && !isFunction_1(value);
}

var isArrayLike_1 = isArrayLike;

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike_1(object) ? _arrayLikeKeys(object) : _baseKeys(object);
}

var keys_1 = keys;

/**
 * Creates an array of own enumerable property names and symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeys(object) {
  return _baseGetAllKeys(object, keys_1, _getSymbols);
}

var _getAllKeys = getAllKeys;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG$3 = 1;

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG$3,
      objProps = _getAllKeys(object),
      objLength = objProps.length,
      othProps = _getAllKeys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isPartial) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isPartial ? key in other : hasOwnProperty$1.call(other, key))) {
      return false;
    }
  }
  // Check that cyclic values are equal.
  var objStacked = stack.get(object);
  var othStacked = stack.get(other);
  if (objStacked && othStacked) {
    return objStacked == other && othStacked == object;
  }
  var result = true;
  stack.set(object, other);
  stack.set(other, object);

  var skipCtor = isPartial;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key],
        othValue = other[key];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, objValue, key, other, object, stack)
        : customizer(objValue, othValue, key, object, other, stack);
    }
    // Recursively compare objects (susceptible to call stack limits).
    if (!(compared === undefined
          ? (objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack))
          : compared
        )) {
      result = false;
      break;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (result && !skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      result = false;
    }
  }
  stack['delete'](object);
  stack['delete'](other);
  return result;
}

var _equalObjects = equalObjects;

/* Built-in method references that are verified to be native. */
var DataView = _getNative(_root, 'DataView');

var _DataView = DataView;

/* Built-in method references that are verified to be native. */
var Promise$1 = _getNative(_root, 'Promise');

var _Promise = Promise$1;

/* Built-in method references that are verified to be native. */
var Set$1 = _getNative(_root, 'Set');

var _Set = Set$1;

/* Built-in method references that are verified to be native. */
var WeakMap = _getNative(_root, 'WeakMap');

var _WeakMap = WeakMap;

/** `Object#toString` result references. */
var mapTag = '[object Map]',
    objectTag$1 = '[object Object]',
    promiseTag = '[object Promise]',
    setTag = '[object Set]',
    weakMapTag = '[object WeakMap]';

var dataViewTag = '[object DataView]';

/** Used to detect maps, sets, and weakmaps. */
var dataViewCtorString = _toSource(_DataView),
    mapCtorString = _toSource(_Map),
    promiseCtorString = _toSource(_Promise),
    setCtorString = _toSource(_Set),
    weakMapCtorString = _toSource(_WeakMap);

/**
 * Gets the `toStringTag` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
var getTag = _baseGetTag;

// Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
if ((_DataView && getTag(new _DataView(new ArrayBuffer(1))) != dataViewTag) ||
    (_Map && getTag(new _Map) != mapTag) ||
    (_Promise && getTag(_Promise.resolve()) != promiseTag) ||
    (_Set && getTag(new _Set) != setTag) ||
    (_WeakMap && getTag(new _WeakMap) != weakMapTag)) {
  getTag = function(value) {
    var result = _baseGetTag(value),
        Ctor = result == objectTag$1 ? value.constructor : undefined,
        ctorString = Ctor ? _toSource(Ctor) : '';

    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString: return dataViewTag;
        case mapCtorString: return mapTag;
        case promiseCtorString: return promiseTag;
        case setCtorString: return setTag;
        case weakMapCtorString: return weakMapTag;
      }
    }
    return result;
  };
}

var _getTag = getTag;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG$2 = 1;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    objectTag = '[object Object]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} [stack] Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
  var objIsArr = isArray_1(object),
      othIsArr = isArray_1(other),
      objTag = objIsArr ? arrayTag : _getTag(object),
      othTag = othIsArr ? arrayTag : _getTag(other);

  objTag = objTag == argsTag ? objectTag : objTag;
  othTag = othTag == argsTag ? objectTag : othTag;

  var objIsObj = objTag == objectTag,
      othIsObj = othTag == objectTag,
      isSameTag = objTag == othTag;

  if (isSameTag && isBuffer_1(object)) {
    if (!isBuffer_1(other)) {
      return false;
    }
    objIsArr = true;
    objIsObj = false;
  }
  if (isSameTag && !objIsObj) {
    stack || (stack = new _Stack);
    return (objIsArr || isTypedArray_1(object))
      ? _equalArrays(object, other, bitmask, customizer, equalFunc, stack)
      : _equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
  }
  if (!(bitmask & COMPARE_PARTIAL_FLAG$2)) {
    var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
        othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object.value() : object,
          othUnwrapped = othIsWrapped ? other.value() : other;

      stack || (stack = new _Stack);
      return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
    }
  }
  if (!isSameTag) {
    return false;
  }
  stack || (stack = new _Stack);
  return _equalObjects(object, other, bitmask, customizer, equalFunc, stack);
}

var _baseIsEqualDeep = baseIsEqualDeep;

/**
 * The base implementation of `_.isEqual` which supports partial comparisons
 * and tracks traversed objects.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {boolean} bitmask The bitmask flags.
 *  1 - Unordered comparison
 *  2 - Partial comparison
 * @param {Function} [customizer] The function to customize comparisons.
 * @param {Object} [stack] Tracks traversed `value` and `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, bitmask, customizer, stack) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || (!isObjectLike_1(value) && !isObjectLike_1(other))) {
    return value !== value && other !== other;
  }
  return _baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
}

var _baseIsEqual = baseIsEqual;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG$1 = 1,
    COMPARE_UNORDERED_FLAG$1 = 2;

/**
 * The base implementation of `_.isMatch` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @param {Object} source The object of property values to match.
 * @param {Array} matchData The property names, values, and compare flags to match.
 * @param {Function} [customizer] The function to customize comparisons.
 * @returns {boolean} Returns `true` if `object` is a match, else `false`.
 */
function baseIsMatch(object, source, matchData, customizer) {
  var index = matchData.length,
      length = index,
      noCustomizer = !customizer;

  if (object == null) {
    return !length;
  }
  object = Object(object);
  while (index--) {
    var data = matchData[index];
    if ((noCustomizer && data[2])
          ? data[1] !== object[data[0]]
          : !(data[0] in object)
        ) {
      return false;
    }
  }
  while (++index < length) {
    data = matchData[index];
    var key = data[0],
        objValue = object[key],
        srcValue = data[1];

    if (noCustomizer && data[2]) {
      if (objValue === undefined && !(key in object)) {
        return false;
      }
    } else {
      var stack = new _Stack;
      if (customizer) {
        var result = customizer(objValue, srcValue, key, object, source, stack);
      }
      if (!(result === undefined
            ? _baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG$1 | COMPARE_UNORDERED_FLAG$1, customizer, stack)
            : result
          )) {
        return false;
      }
    }
  }
  return true;
}

var _baseIsMatch = baseIsMatch;

/**
 * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` if suitable for strict
 *  equality comparisons, else `false`.
 */
function isStrictComparable(value) {
  return value === value && !isObject_1(value);
}

var _isStrictComparable = isStrictComparable;

/**
 * Gets the property names, values, and compare flags of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the match data of `object`.
 */
function getMatchData(object) {
  var result = keys_1(object),
      length = result.length;

  while (length--) {
    var key = result[length],
        value = object[key];

    result[length] = [key, value, _isStrictComparable(value)];
  }
  return result;
}

var _getMatchData = getMatchData;

/**
 * A specialized version of `matchesProperty` for source values suitable
 * for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @param {*} srcValue The value to match.
 * @returns {Function} Returns the new spec function.
 */
function matchesStrictComparable(key, srcValue) {
  return function(object) {
    if (object == null) {
      return false;
    }
    return object[key] === srcValue &&
      (srcValue !== undefined || (key in Object(object)));
  };
}

var _matchesStrictComparable = matchesStrictComparable;

/**
 * The base implementation of `_.matches` which doesn't clone `source`.
 *
 * @private
 * @param {Object} source The object of property values to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatches(source) {
  var matchData = _getMatchData(source);
  if (matchData.length == 1 && matchData[0][2]) {
    return _matchesStrictComparable(matchData[0][0], matchData[0][1]);
  }
  return function(object) {
    return object === source || _baseIsMatch(object, source, matchData);
  };
}

var _baseMatches = baseMatches;

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray_1(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol_1(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

var _isKey = isKey;

/** Error message constants. */
var FUNC_ERROR_TEXT$1 = 'Expected a function';

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `clear`, `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT$1);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result) || cache;
    return result;
  };
  memoized.cache = new (memoize.Cache || _MapCache);
  return memoized;
}

// Expose `MapCache`.
memoize.Cache = _MapCache;

var memoize_1 = memoize;

/** Used as the maximum memoize cache size. */
var MAX_MEMOIZE_SIZE = 500;

/**
 * A specialized version of `_.memoize` which clears the memoized function's
 * cache when it exceeds `MAX_MEMOIZE_SIZE`.
 *
 * @private
 * @param {Function} func The function to have its output memoized.
 * @returns {Function} Returns the new memoized function.
 */
function memoizeCapped(func) {
  var result = memoize_1(func, function(key) {
    if (cache.size === MAX_MEMOIZE_SIZE) {
      cache.clear();
    }
    return key;
  });

  var cache = result.cache;
  return result;
}

var _memoizeCapped = memoizeCapped;

/** Used to match property names within property paths. */
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = _memoizeCapped(function(string) {
  var result = [];
  if (string.charCodeAt(0) === 46 /* . */) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

var _stringToPath = stringToPath;

/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

var _arrayMap = arrayMap;

/** Used as references for various `Number` constants. */
var INFINITY$2 = 1 / 0;

/** Used to convert symbols to primitives and strings. */
var symbolProto = _Symbol ? _Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray_1(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return _arrayMap(value, baseToString) + '';
  }
  if (isSymbol_1(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY$2) ? '-0' : result;
}

var _baseToString = baseToString;

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : _baseToString(value);
}

var toString_1 = toString;

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @param {Object} [object] The object to query keys on.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value, object) {
  if (isArray_1(value)) {
    return value;
  }
  return _isKey(value, object) ? [value] : _stringToPath(toString_1(value));
}

var _castPath = castPath;

/** Used as references for various `Number` constants. */
var INFINITY$1 = 1 / 0;

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol_1(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY$1) ? '-0' : result;
}

var _toKey = toKey;

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = _castPath(path, object);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[_toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

var _baseGet = baseGet;

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : _baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

var get_1 = get;

/**
 * The base implementation of `_.hasIn` without support for deep paths.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {Array|string} key The key to check.
 * @returns {boolean} Returns `true` if `key` exists, else `false`.
 */
function baseHasIn(object, key) {
  return object != null && key in Object(object);
}

var _baseHasIn = baseHasIn;

/**
 * Checks if `path` exists on `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @param {Function} hasFunc The function to check properties.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 */
function hasPath(object, path, hasFunc) {
  path = _castPath(path, object);

  var index = -1,
      length = path.length,
      result = false;

  while (++index < length) {
    var key = _toKey(path[index]);
    if (!(result = object != null && hasFunc(object, key))) {
      break;
    }
    object = object[key];
  }
  if (result || ++index != length) {
    return result;
  }
  length = object == null ? 0 : object.length;
  return !!length && isLength_1(length) && _isIndex(key, length) &&
    (isArray_1(object) || isArguments_1(object));
}

var _hasPath = hasPath;

/**
 * Checks if `path` is a direct or inherited property of `object`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 * @example
 *
 * var object = _.create({ 'a': _.create({ 'b': 2 }) });
 *
 * _.hasIn(object, 'a');
 * // => true
 *
 * _.hasIn(object, 'a.b');
 * // => true
 *
 * _.hasIn(object, ['a', 'b']);
 * // => true
 *
 * _.hasIn(object, 'b');
 * // => false
 */
function hasIn(object, path) {
  return object != null && _hasPath(object, path, _baseHasIn);
}

var hasIn_1 = hasIn;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/**
 * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
 *
 * @private
 * @param {string} path The path of the property to get.
 * @param {*} srcValue The value to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatchesProperty(path, srcValue) {
  if (_isKey(path) && _isStrictComparable(srcValue)) {
    return _matchesStrictComparable(_toKey(path), srcValue);
  }
  return function(object) {
    var objValue = get_1(object, path);
    return (objValue === undefined && objValue === srcValue)
      ? hasIn_1(object, path)
      : _baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
  };
}

var _baseMatchesProperty = baseMatchesProperty;

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

var identity_1 = identity;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

var _baseProperty = baseProperty;

/**
 * A specialized version of `baseProperty` which supports deep paths.
 *
 * @private
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function basePropertyDeep(path) {
  return function(object) {
    return _baseGet(object, path);
  };
}

var _basePropertyDeep = basePropertyDeep;

/**
 * Creates a function that returns the value at `path` of a given object.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 * @example
 *
 * var objects = [
 *   { 'a': { 'b': 2 } },
 *   { 'a': { 'b': 1 } }
 * ];
 *
 * _.map(objects, _.property('a.b'));
 * // => [2, 1]
 *
 * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
 * // => [1, 2]
 */
function property(path) {
  return _isKey(path) ? _baseProperty(_toKey(path)) : _basePropertyDeep(path);
}

var property_1 = property;

/**
 * The base implementation of `_.iteratee`.
 *
 * @private
 * @param {*} [value=_.identity] The value to convert to an iteratee.
 * @returns {Function} Returns the iteratee.
 */
function baseIteratee(value) {
  // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
  // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
  if (typeof value == 'function') {
    return value;
  }
  if (value == null) {
    return identity_1;
  }
  if (typeof value == 'object') {
    return isArray_1(value)
      ? _baseMatchesProperty(value[0], value[1])
      : _baseMatches(value);
  }
  return property_1(value);
}

var _baseIteratee = baseIteratee;

/**
 * Creates a `_.find` or `_.findLast` function.
 *
 * @private
 * @param {Function} findIndexFunc The function to find the collection index.
 * @returns {Function} Returns the new find function.
 */
function createFind(findIndexFunc) {
  return function(collection, predicate, fromIndex) {
    var iterable = Object(collection);
    if (!isArrayLike_1(collection)) {
      var iteratee = _baseIteratee(predicate);
      collection = keys_1(collection);
      predicate = function(key) { return iteratee(iterable[key], key, iterable); };
    }
    var index = findIndexFunc(collection, predicate, fromIndex);
    return index > -1 ? iterable[iteratee ? collection[index] : index] : undefined;
  };
}

var _createFind = createFind;

/**
 * The base implementation of `_.findIndex` and `_.findLastIndex` without
 * support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} predicate The function invoked per iteration.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseFindIndex(array, predicate, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 1 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
}

var _baseFindIndex = baseFindIndex;

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0,
    MAX_INTEGER = 1.7976931348623157e+308;

/**
 * Converts `value` to a finite number.
 *
 * @static
 * @memberOf _
 * @since 4.12.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted number.
 * @example
 *
 * _.toFinite(3.2);
 * // => 3.2
 *
 * _.toFinite(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toFinite(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toFinite('3.2');
 * // => 3.2
 */
function toFinite(value) {
  if (!value) {
    return value === 0 ? value : 0;
  }
  value = toNumber_1(value);
  if (value === INFINITY || value === -INFINITY) {
    var sign = (value < 0 ? -1 : 1);
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}

var toFinite_1 = toFinite;

/**
 * Converts `value` to an integer.
 *
 * **Note:** This method is loosely based on
 * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted integer.
 * @example
 *
 * _.toInteger(3.2);
 * // => 3
 *
 * _.toInteger(Number.MIN_VALUE);
 * // => 0
 *
 * _.toInteger(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toInteger('3.2');
 * // => 3
 */
function toInteger(value) {
  var result = toFinite_1(value),
      remainder = result % 1;

  return result === result ? (remainder ? result - remainder : result) : 0;
}

var toInteger_1 = toInteger;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * This method is like `_.find` except that it returns the index of the first
 * element `predicate` returns truthy for instead of the element itself.
 *
 * @static
 * @memberOf _
 * @since 1.1.0
 * @category Array
 * @param {Array} array The array to inspect.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @param {number} [fromIndex=0] The index to search from.
 * @returns {number} Returns the index of the found element, else `-1`.
 * @example
 *
 * var users = [
 *   { 'user': 'barney',  'active': false },
 *   { 'user': 'fred',    'active': false },
 *   { 'user': 'pebbles', 'active': true }
 * ];
 *
 * _.findIndex(users, function(o) { return o.user == 'barney'; });
 * // => 0
 *
 * // The `_.matches` iteratee shorthand.
 * _.findIndex(users, { 'user': 'fred', 'active': false });
 * // => 1
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.findIndex(users, ['active', false]);
 * // => 0
 *
 * // The `_.property` iteratee shorthand.
 * _.findIndex(users, 'active');
 * // => 2
 */
function findIndex(array, predicate, fromIndex) {
  var length = array == null ? 0 : array.length;
  if (!length) {
    return -1;
  }
  var index = fromIndex == null ? 0 : toInteger_1(fromIndex);
  if (index < 0) {
    index = nativeMax(length + index, 0);
  }
  return _baseFindIndex(array, _baseIteratee(predicate), index);
}

var findIndex_1 = findIndex;

/**
 * Iterates over elements of `collection`, returning the first element
 * `predicate` returns truthy for. The predicate is invoked with three
 * arguments: (value, index|key, collection).
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to inspect.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @param {number} [fromIndex=0] The index to search from.
 * @returns {*} Returns the matched element, else `undefined`.
 * @example
 *
 * var users = [
 *   { 'user': 'barney',  'age': 36, 'active': true },
 *   { 'user': 'fred',    'age': 40, 'active': false },
 *   { 'user': 'pebbles', 'age': 1,  'active': true }
 * ];
 *
 * _.find(users, function(o) { return o.age < 40; });
 * // => object for 'barney'
 *
 * // The `_.matches` iteratee shorthand.
 * _.find(users, { 'age': 1, 'active': true });
 * // => object for 'pebbles'
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.find(users, ['active', false]);
 * // => object for 'fred'
 *
 * // The `_.property` iteratee shorthand.
 * _.find(users, 'active');
 * // => object for 'barney'
 */
var find = _createFind(findIndex_1);

var find_1 = find;

/** Error message constants. */
var FUNC_ERROR_TEXT = 'Expected a function';

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds. The throttled function comes with a `cancel`
 * method to cancel delayed `func` invocations and a `flush` method to
 * immediately invoke them. Provide `options` to indicate whether `func`
 * should be invoked on the leading and/or trailing edge of the `wait`
 * timeout. The `func` is invoked with the last arguments provided to the
 * throttled function. Subsequent calls to the throttled function return the
 * result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the throttled function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.throttle` and `_.debounce`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to throttle.
 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=true]
 *  Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new throttled function.
 * @example
 *
 * // Avoid excessively updating the position while scrolling.
 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
 *
 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
 * jQuery(element).on('click', throttled);
 *
 * // Cancel the trailing throttled invocation.
 * jQuery(window).on('popstate', throttled.cancel);
 */
function throttle(func, wait, options) {
  var leading = true,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (isObject_1(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce_1(func, wait, {
    'leading': leading,
    'maxWait': wait,
    'trailing': trailing
  });
}

var throttle_1 = throttle;

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
    this.scrollY = throttle_1(function (scrollTop) {
      _this.scrollTop = scrollTop;
    }, 100);
    this.handleMouseMove = debounce_1(function (event) {
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
      var target = find_1(this.viewTypeList, {
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

var css_248z$f = ".gantt-task-bar {\n  position: absolute;\n  top: 0;\n  left: 0;\n  display: flex;\n}\n.gantt-task-bar-loading {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  cursor: not-allowed;\n  z-index: 9;\n}\n.gantt-task-bar-bar {\n  position: relative;\n  height: 8px;\n  line-height: 8px;\n  border-radius: 4px;\n  top: -1px;\n  cursor: pointer;\n}\n.gantt-task-bar-invalid-date-range {\n  display: none;\n}\n.gantt-task-bar-resize-bg {\n  position: absolute;\n  left: 0;\n  top: -5px;\n  border-radius: 4px;\n  box-shadow: 0 2px 4px 0 #f7f7f7;\n  border: 1px solid #f0f0f0;\n  background-color: #fff;\n}\n.gantt-task-bar-resize-bg-compact {\n  height: 17px;\n}\n.gantt-task-bar-resize-handle {\n  position: absolute;\n  left: 0;\n  top: -4px;\n  width: 14px;\n  height: 16px;\n  z-index: 3;\n  background: white;\n}\n.gantt-task-bar-resize-handle:after,\n.gantt-task-bar-resize-handle:before {\n  position: absolute;\n  top: 4px;\n  bottom: 16px;\n  width: 2px;\n  height: 8px;\n  border-radius: 2px;\n  background-color: #d9d9d9;\n  content: '';\n}\n.gantt-task-bar-resize-handle-disabled {\n  cursor: not-allowed !important;\n}\n.gantt-task-bar-resize-handle-left {\n  cursor: col-resize;\n}\n.gantt-task-bar-resize-handle-left:before {\n  left: 4px;\n}\n.gantt-task-bar-resize-handle-left:after {\n  right: 4px;\n}\n.gantt-task-bar-resize-handle-right {\n  cursor: col-resize;\n}\n.gantt-task-bar-resize-handle-right:before {\n  left: 4px;\n}\n.gantt-task-bar-resize-handle-right:after {\n  right: 4px;\n}\n.gantt-task-bar-date-text {\n  color: #262626;\n}\n.gantt-task-bar-date-text,\n.gantt-task-bar-label {\n  position: absolute;\n  white-space: nowrap;\n  font-size: 12px;\n  top: -4px;\n}\n.gantt-task-bar-label {\n  overflow: hidden;\n  max-width: 200px;\n  color: #595959;\n  text-overflow: ellipsis;\n  word-break: keep-all;\n  line-height: 16px;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n  height: 16px;\n  cursor: pointer;\n  top: -14px;\n}\n";
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

var css_248z$e = ".gantt-task-bar-thumb {\n  position: absolute;\n  cursor: pointer;\n  white-space: nowrap;\n  z-index: 2;\n  overflow: hidden;\n  max-width: 200px;\n  color: #595959;\n  text-overflow: ellipsis;\n  word-break: keep-all;\n  line-height: 16px;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  font-size: 12px;\n  padding-right: 16px;\n  display: flex;\n  align-items: center;\n}\n.gantt-task-bar-thumb-left {\n  transform: translate(0);\n}\n.gantt-task-bar-thumb-right {\n  transform: translate(-100%);\n}\n.gantt-task-bar-thumb-circle-left {\n  height: 10px;\n  width: 10px;\n  border-radius: 50%;\n  margin-right: 10px;\n}\n.gantt-task-bar-thumb-circle-right {\n  height: 10px;\n  width: 10px;\n  border-radius: 50%;\n  margin-left: 10px;\n}\n";
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

var css_248z$d = ".task-dependency-line {\n  z-index: -1;\n}\n.task-dependency-line .line {\n  stroke: #f87872;\n}\n";
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
  var fromBar = find_1(barList, function (bar) {
    return bar.record.id === from;
  });
  var toBar = find_1(barList, function (bar) {
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
    className: css_248z$d['task-dependency-line']
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

var css_248z$c = ".gantt-today {\n  position: absolute;\n  top: 0;\n  background: #096dd9;\n  width: 1px;\n  height: 1px;\n  text-align: center;\n  line-height: 1px;\n  border-radius: 50%;\n  font-size: 12px;\n  color: #ffffff;\n  pointer-events: none;\n}\n.gantt-today_line {\n  width: 1px;\n  background: #096dd9;\n  margin-left: 15px;\n}\n";
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

var css_248z$b = ".gantt-chart {\n  position: absolute;\n  top: 0;\n  overflow-x: hidden;\n  overflow-y: hidden;\n}\n.gantt-chart-svg-renderer {\n  position: absolute;\n  top: 0;\n  left: 0;\n}\n.gantt-render-chunk {\n  position: absolute;\n  top: 0;\n  left: 0;\n  will-change: transform;\n}\n";
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

var css_248z$a = ".gantt-divider {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  cursor: col-resize;\n}\n.gantt-divider:hover hr {\n  border-color: #3b88f4;\n}\n.gantt-divider:hover hr:before {\n  background: #3b88f4;\n}\n.gantt-divider:hover .gantt-divider-icon-wrapper {\n  background-color: #3b88f4;\n  border-color: #3b88f4;\n  border-top: 0;\n  border-bottom: 0;\n  cursor: pointer;\n}\n.gantt-divider:hover .gantt-divider-icon-wrapper:after {\n  content: '';\n  right: -3px;\n  position: absolute;\n  width: 2px;\n  height: 30px;\n  background-color: transparent;\n}\n.gantt-divider:hover .gantt-divider-icon-wrapper .gantt-divider-arrow:after,\n.gantt-divider:hover .gantt-divider-icon-wrapper .gantt-divider-arrow:before {\n  background-color: #fff;\n}\n.gantt-divider > hr {\n  margin: 0;\n  height: 100%;\n  width: 0;\n  border: none;\n  border-right: 1px solid transparent;\n}\n.gantt-divider > .gantt-divider-icon-wrapper {\n  position: absolute;\n  left: 1px;\n  top: 50%;\n  transform: translateY(-50%);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 14px;\n  height: 30px;\n  border-radius: 0 4px 4px 0;\n  border: 1px solid #f0f0f0;\n  border-left: 0;\n  background-color: #fff;\n}\n.gantt-divider-arrow:before {\n  bottom: -1px;\n  transform: rotate(30deg);\n}\n.gantt-divider-arrow:after {\n  top: -1px;\n  transform: rotate(-30deg);\n}\n.gantt-divider-arrow:after,\n.gantt-divider-arrow:before {\n  content: '';\n  display: block;\n  position: relative;\n  width: 2px;\n  height: 8px;\n  background-color: #bfbfbf;\n  border-radius: 1px;\n}\n.gantt-divider-arrow.gantt-divider-reverse:before {\n  transform: rotate(-30deg);\n}\n.gantt-divider-arrow.gantt-divider-reverse:after {\n  transform: rotate(30deg);\n}\n.gantt-divider_only > hr:before {\n  content: '';\n  position: absolute;\n  border-top: 7px solid white;\n  border-bottom: 7px solid white;\n  background: #a7add0;\n  z-index: 2;\n  height: 26px;\n  top: 50%;\n  transform: translateY(-50%);\n  width: 2px;\n}\n.gantt-divider_only > hr {\n  border-color: #a7add0;\n}\n";
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

var css_248z$9 = ".gantt-scroll_bar {\n  position: absolute;\n  bottom: 0;\n  left: 16px;\n  height: 12px;\n}\n.gantt-scroll_bar-thumb {\n  position: absolute;\n  height: 100%;\n  border-radius: 4px;\n  background-color: #262626;\n  opacity: 0.2;\n  cursor: pointer;\n  will-change: transform;\n}\n";
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

var css_248z$8 = ".gantt-scroll_top {\n  position: absolute;\n  right: 24px;\n  bottom: 8px;\n  width: 40px;\n  height: 40px;\n  cursor: pointer;\n  background-image: url('./Top.svg');\n  background-size: contain;\n}\n.gantt-scroll_top:hover {\n  background-image: url('./Top_hover.svg');\n}\n";
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

var css_248z$7 = ".gantt-selection-indicator {\n  position: absolute;\n  width: 100%;\n  background: rgba(0, 0, 0, 0.04);\n  pointer-events: none;\n  z-index: 10;\n}\n";
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

var css_248z$6 = ".gantt-row-toggler {\n  width: 24px;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  color: #d9d9d9;\n  cursor: pointer;\n  position: relative;\n  z-index: 5;\n}\n.gantt-row-toggler:hover {\n  color: #8c8c8c;\n}\n.gantt-row-toggler > i {\n  width: 20px;\n  height: 20px;\n  background: white;\n}\n.gantt-row-toggler > i > svg {\n  transition: transform 218ms;\n  fill: currentColor;\n}\n.gantt-row-toggler-collapsed > i > svg {\n  transform: rotate(-90deg);\n}\n";
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

var css_248z$5 = ".gantt-table-body {\n  position: absolute;\n  top: 0;\n  left: 0;\n  overflow: hidden;\n}\n.gantt-table-body-row,\n.gantt-table-body-border_row {\n  display: flex;\n  align-items: center;\n  position: absolute;\n  width: 100%;\n}\n.gantt-table-body-border_row {\n  height: 100%;\n  pointer-events: none;\n}\n.gantt-table-body-cell {\n  position: relative;\n  display: flex;\n  align-items: center;\n  border-right: 1px solid #f0f0f0;\n  height: 100%;\n  color: #2e405e;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  padding: 0 8px;\n  font-size: 14px;\n}\n.gantt-table-body-ellipsis {\n  flex: 1;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.gantt-table-body-row-indentation {\n  height: 100%;\n  position: absolute;\n  left: 0;\n  pointer-events: none;\n}\n.gantt-table-body-row-indentation:before {\n  content: '';\n  position: absolute;\n  height: 100%;\n  left: 0;\n  width: 1px;\n  bottom: 0;\n  background-color: #d9e6f2;\n}\n.gantt-table-body-row-indentation-both:after {\n  content: '';\n  position: absolute;\n  width: 100%;\n  bottom: 0;\n  left: 0;\n  height: 1px;\n  background-color: #d9e6f2;\n}\n.gantt-table-body-row-indentation-hidden {\n  visibility: hidden;\n}\n";
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

var css_248z$4 = ".gantt-table-header {\n  position: absolute;\n  top: 0;\n  left: 0;\n  overflow: hidden;\n}\n.gantt-table-header-head {\n  position: relative;\n}\n.gantt-table-header-row {\n  position: absolute;\n  left: 0;\n  display: flex;\n  transition: height 0.3s;\n  width: 100%;\n}\n.gantt-table-header-cell {\n  position: relative;\n  display: flex;\n  border-right: 1px solid #f0f0f0;\n}\n.gantt-table-header-head-cell {\n  display: flex;\n  flex: 1;\n  align-items: center;\n  overflow: hidden;\n  padding: 0 12px;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  font-size: 14px;\n  color: #2e405e;\n}\n.gantt-table-header-ellipsis {\n  flex: 1;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n";
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

var css_248z$3 = ".gantt-time-axis {\n  height: 56px;\n  position: absolute;\n  top: 0;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  overflow: hidden;\n  cursor: ew-resize;\n}\n.gantt-time-axis-render-chunk {\n  position: absolute;\n  top: 0;\n  left: 0;\n  height: 56px;\n  pointer-events: none;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  will-change: transform;\n}\n.gantt-time-axis-today {\n  background-color: #2c7ef8;\n  border-radius: 50%;\n  color: #fff;\n}\n.gantt-time-axis-major {\n  position: absolute;\n  overflow: hidden;\n  box-sizing: content-box;\n  height: 28px;\n  border-right: 1px solid #f0f0f0;\n  font-weight: 400;\n  text-align: left;\n  font-size: 13px;\n  line-height: 28px;\n}\n.gantt-time-axis-major-label {\n  overflow: hidden;\n  padding-left: 8px;\n  white-space: nowrap;\n}\n.gantt-time-axis-minor {\n  position: absolute;\n  top: 27px;\n  box-sizing: content-box;\n  height: 28px;\n  border-top: 1px solid #f0f0f0;\n  border-right: 1px solid #f0f0f0;\n  text-align: center;\n  font-size: 12px;\n  line-height: 28px;\n  color: #202d40;\n}\n.gantt-time-axis-minor.weekends {\n  background-color: hsla(0, 0%, 96.9%, 0.5);\n}\n";
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

var css_248z$2 = ".gantt-time-axis-scale-select .next-menu {\n  position: relative;\n  min-width: 150px;\n  padding: 4px 0;\n  margin: 0;\n  list-style: none;\n  border-radius: 4px;\n  background: #fff;\n  line-height: 36px;\n  font-size: 14px;\n}\n.gantt-time-axis-scale-select .next-menu,\n.gantt-time-axis-scale-select .next-menu *,\n.gantt-time-axis-scale-select .next-menu :after,\n.gantt-time-axis-scale-select .next-menu :before {\n  box-sizing: border-box;\n}\n.gantt-time-axis-scale-select .next-menu,\n.gantt-time-axis-scale-select .next-select-trigger,\n.gantt-time-axis-scale-select .next-select .next-select-inner {\n  min-width: unset;\n}\n.gantt-time-axis-scale-select .next-menu-item-text {\n  line-height: 36px;\n}\n.time-axis-scale-select__3fTI .next-menu-item-text {\n  line-height: 36px;\n}\n.gantt-shadow {\n  position: absolute;\n  top: 4px;\n  right: 0;\n  width: 90px;\n  height: 48px;\n  z-index: 0;\n  transition: box-shadow 0.5s;\n}\n.gantt-shadow.gantt-scrolling {\n  box-shadow: -3px 0 7px 0 #e5e5e5;\n}\n.gantt-trigger {\n  position: absolute;\n  top: 0;\n  right: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 56px;\n  border-top-right-radius: 4px;\n  background-color: #fff;\n  border-left: 1px solid #f0f0f0;\n  color: #bfbfbf;\n  padding: 0 8px 0 12px;\n  cursor: pointer;\n  width: 90px;\n  z-index: 1;\n  transition: color 0.2s;\n}\n.gantt-trigger:hover {\n  color: #8c8c8c;\n}\n.gantt-trigger:hover .gantt-text {\n  color: #262626;\n}\n.gantt-trigger .gantt-text {\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  margin-right: 4px;\n  font-size: 14px;\n  color: #202d40;\n}\n.dropdown-icon {\n  width: 20px;\n  height: 20px;\n  line-height: 20px;\n}\n.dropdown-icon svg {\n  fill: currentColor;\n}\n.next-overlay-wrapper {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n}\n.next-overlay-wrapper .next-overlay-inner {\n  z-index: 1001;\n  border-radius: 4px;\n  box-shadow: 0 12px 32px 0 rgba(38, 38, 38, 0.16);\n  -webkit-transform: translateZ(0);\n  transform: translateZ(0);\n}\n.next-overlay-wrapper .next-overlay-backdrop {\n  position: fixed;\n  z-index: 1001;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background: #000;\n  transition: opacity 0.3s;\n  opacity: 0;\n}\n.next-overlay-wrapper.opened .next-overlay-backdrop {\n  opacity: 0.3;\n}\n.next-menu-item {\n  position: relative;\n  padding: 0 12px 0 40px;\n  transition: background 0.2s ease;\n  color: #262626;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n}\n.next-menu-item .gantt-selected_icon {\n  position: absolute;\n  left: 12px;\n  width: 20px;\n  height: 20px;\n  line-height: 20px;\n}\n.next-menu-item .gantt-selected_icon svg {\n  fill: #1b9aee;\n}\n.next-menu-item:hover {\n  font-weight: 400;\n  background-color: #f7f7f7;\n}\n.next-menu-item.next-selected {\n  color: #262626;\n  background-color: #fff;\n}\n.next-menu-item.next-selected .next-menu-icon-arrow {\n  color: #bfbfbf;\n}\n";
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

var css_248z$1 = ".gantt-time-indicator {\n  position: absolute;\n  top: 0;\n  left: 0;\n  background-color: #096dd9;\n  box-shadow: 0 2px 4px rgba(1, 113, 194, 0.1);\n  transform: translate(12px, 14px);\n  transition: opacity 0.3s;\n  padding: 0 7px;\n  color: #fff;\n  border-radius: 4px;\n  outline: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  box-sizing: border-box;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  vertical-align: middle;\n  cursor: pointer;\n  border: none;\n  font-size: 12px;\n}\n.gantt-time-indicator-scrolling {\n  opacity: 0;\n}\n";
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

var css_248z = ".gantt-body {\n  height: 100%;\n  width: 100%;\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  border: 1px solid #f0f0f0;\n  border-radius: 4px;\n  background: #fff;\n}\n.gantt-body *,\n.gantt-body *::before,\n.gantt-body *::after {\n  box-sizing: border-box;\n}\n.gantt-body header {\n  position: relative;\n  overflow: hidden;\n  width: 100%;\n  height: 56px;\n}\n.gantt-body main {\n  position: relative;\n  overflow-x: hidden;\n  overflow-y: auto;\n  width: 100%;\n  flex: 1;\n  border-top: 1px solid #f0f0f0;\n  will-change: transform;\n  will-change: overflow;\n}\n";
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

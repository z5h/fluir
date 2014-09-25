!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.fluir=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var
  _ = require('underscore'),
  EventEmitter = require('events').EventEmitter,
  Scope = require('./lib/scope').Scope,
  RouteHandler = require('./lib/routeHandler').RouteHandler,
  DispatchHandler = require('./lib/dispatchHandler').DispatchHandler;

/**
 * Application
 */
function Application(nameToStores){

  this._stores = _.values(nameToStores);

  EventEmitter.call(this);
  _.extend(this, EventEmitter.prototype);

  Scope.call(this, nameToStores);
  this.get = Scope.prototype.get;

  RouteHandler.call(this, this._stores);
  _.extend(this, RouteHandler.prototype);

  DispatchHandler.call(this, this._stores);
  this.dispatch = _.bind(function(event, payload){
    return DispatchHandler.prototype.dispatch.call(this, event, payload);
  }, this);
  this.emitChange = _.bind(function(){
    return Application.prototype.emitChange.call(this);
  }, this);

  var self = this;
  _.each(this._stores, function(store){
    //when a store fires a change event, we forward to the root view listening
    store.on('change', function(){
      self.emitChange(store);
    });
    store.go = _.bind(self.go, self);
    store.scope = _.bind(self.push, self);
  });
}

Application.prototype.push = function(map){
  var result = Scope.prototype.push.call(this, map);
  result.dispatch = this.dispatch;
  result.emitChange = this.emitChange;
  result.push = Application.prototype.push;
  return result;
};

Application.prototype.emitChange = function(){
  this.emit('change');
};

/**
 * ViewMixin
 */
var ViewMixin = {
  scope: function(values){
    return values ? this.props.scope.push(values) : this.props.scope;
  },
  resolve: function(key){
    return this.props.scope.get(key);
  },
  dispatch: function(event, payload){
    return this.props.scope.dispatch(event, payload);
  },
  dispatcher: function(event){
    return _.bind(function(e){
      this.props.scope.dispatch(event, e.target.value);
    }, this);
  }
};

/**
 * RootViewMixin
 */
var RootViewMixin = {
  debounceTime: 10,
  componentWillMount: function(){
    this.callback = (function(){
      this.forceUpdate();
    }).bind(this);
    this.props.scope.on('change', _.debounce(this.callback, this.debounceTime));
  }
};

_.extend(RootViewMixin, ViewMixin);

exports.Application = Application;
exports.ViewMixin = ViewMixin;
exports.RootViewMixin = RootViewMixin;
},{"./lib/dispatchHandler":2,"./lib/routeHandler":3,"./lib/scope":4,"events":6,"underscore":5}],2:[function(require,module,exports){
var
  _ = require('underscore'),
  Promise = require('es6-promise').Promise;

/**
 * DispatchHandler
 */
function DispatchHandler(listeners){
  this._listeners = listeners;
}
DispatchHandler.prototype.dispatch = function(event_name, payload){
  var promises = [];
  _.each(this._listeners, function(store){
    var fn = store[event_name];
    if (typeof(fn) === 'function') {
      promises.push(fn.call(store, payload));
    }
  });
  return Promise.all(promises);
};

exports.DispatchHandler = DispatchHandler;
},{"es6-promise":9,"underscore":5}],3:[function(require,module,exports){
var
  _ = require('underscore'),
  Router = require('director').Router;

function defineRouteHandler(Router){
  /**
   * RouteHandler
   */
  function RouteHandler(routeDelegates){
    this._router = new Router();
    var actions = {};
    var self = this;
    _.each(routeDelegates, function(routeDelegate){
      _.chain(routeDelegate)
        .functions()
        .filter(function(x){
          return x.charAt(0) === '/';
        })
        .each(function(route){
          var action = function(){
            var args = Array.prototype.slice.call(arguments);
            routeDelegate[route].apply(routeDelegate, args);
            self.emitChange();
          };
          actions[route] = action;
          self._router.on(route, action);
        });

      _.chain(routeDelegate)
        .keys()
        .filter(function(x){
          return x.charAt(0) === '/' && typeof(routeDelegate[x]) === 'string';
        })
        .each(function(route){
          var actionName = routeDelegate[route];
          self._router.on(route, actions[actionName]);
        });
    });
  }

  RouteHandler.prototype.initRoute = function(route){
    this._router.init(route);
  };
  RouteHandler.prototype.go = function(url){
    this._router.setRoute(url);
  };

  return RouteHandler;
}


exports.RouteHandler = defineRouteHandler(Router);
exports.defineRouteHandler = defineRouteHandler;
},{"director":8,"underscore":5}],4:[function(require,module,exports){
/**
 * Scope
 */
function Scope(map){
  if (map) {
    this._values = map;
  }
}
Scope.prototype.push = function(values){
  var scope = new Scope(values || {});
  scope._parent = this;
  return scope;
};

Scope.prototype.get = function(key){
  var target = this;
  var result = target._values[key];
  while (result === undefined && target) {
    target = target._parent;
    result = target ? target._values[key] : result;
  }
  if (target) {
    return result;
  } else {
    throw key + " not found";
  }
};

exports.Scope = Scope;
},{}],5:[function(require,module,exports){

},{}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],7:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],8:[function(require,module,exports){


//
// Generated on Fri Dec 27 2013 12:02:11 GMT-0500 (EST) by Nodejitsu, Inc (Using Codesurgeon).
// Version 1.2.2
//

(function (exports) {

/*
 * browser.js: Browser specific functionality for director.
 *
 * (C) 2011, Nodejitsu Inc.
 * MIT LICENSE
 *
 */

if (!Array.prototype.filter) {
  Array.prototype.filter = function(filter, that) {
    var other = [], v;
    for (var i = 0, n = this.length; i < n; i++) {
      if (i in this && filter.call(that, v = this[i], i, this)) {
        other.push(v);
      }
    }
    return other;
  };
}

if (!Array.isArray){
  Array.isArray = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };
}

var dloc = document.location;

function dlocHashEmpty() {
  // Non-IE browsers return '' when the address bar shows '#'; Director's logic
  // assumes both mean empty.
  return dloc.hash === '' || dloc.hash === '#';
}

var listener = {
  mode: 'modern',
  hash: dloc.hash,
  history: false,

  check: function () {
    var h = dloc.hash;
    if (h != this.hash) {
      this.hash = h;
      this.onHashChanged();
    }
  },

  fire: function () {
    if (this.mode === 'modern') {
      this.history === true ? window.onpopstate() : window.onhashchange();
    }
    else {
      this.onHashChanged();
    }
  },

  init: function (fn, history) {
    var self = this;
    this.history = history;

    if (!Router.listeners) {
      Router.listeners = [];
    }

    function onchange(onChangeEvent) {
      for (var i = 0, l = Router.listeners.length; i < l; i++) {
        Router.listeners[i](onChangeEvent);
      }
    }

    //note IE8 is being counted as 'modern' because it has the hashchange event
    if ('onhashchange' in window && (document.documentMode === undefined
      || document.documentMode > 7)) {
      // At least for now HTML5 history is available for 'modern' browsers only
      if (this.history === true) {
        // There is an old bug in Chrome that causes onpopstate to fire even
        // upon initial page load. Since the handler is run manually in init(),
        // this would cause Chrome to run it twise. Currently the only
        // workaround seems to be to set the handler after the initial page load
        // http://code.google.com/p/chromium/issues/detail?id=63040
        setTimeout(function() {
          window.onpopstate = onchange;
        }, 500);
      }
      else {
        window.onhashchange = onchange;
      }
      this.mode = 'modern';
    }
    else {
      //
      // IE support, based on a concept by Erik Arvidson ...
      //
      var frame = document.createElement('iframe');
      frame.id = 'state-frame';
      frame.style.display = 'none';
      document.body.appendChild(frame);
      this.writeFrame('');

      if ('onpropertychange' in document && 'attachEvent' in document) {
        document.attachEvent('onpropertychange', function () {
          if (event.propertyName === 'location') {
            self.check();
          }
        });
      }

      window.setInterval(function () { self.check(); }, 50);

      this.onHashChanged = onchange;
      this.mode = 'legacy';
    }

    Router.listeners.push(fn);

    return this.mode;
  },

  destroy: function (fn) {
    if (!Router || !Router.listeners) {
      return;
    }

    var listeners = Router.listeners;

    for (var i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i] === fn) {
        listeners.splice(i, 1);
      }
    }
  },

  setHash: function (s) {
    // Mozilla always adds an entry to the history
    if (this.mode === 'legacy') {
      this.writeFrame(s);
    }

    if (this.history === true) {
      window.history.pushState({}, document.title, s);
      // Fire an onpopstate event manually since pushing does not obviously
      // trigger the pop event.
      this.fire();
    } else {
      dloc.hash = (s[0] === '/') ? s : '/' + s;
    }
    return this;
  },

  writeFrame: function (s) {
    // IE support...
    var f = document.getElementById('state-frame');
    var d = f.contentDocument || f.contentWindow.document;
    d.open();
    d.write("<script>_hash = '" + s + "'; onload = parent.listener.syncHash;<script>");
    d.close();
  },

  syncHash: function () {
    // IE support...
    var s = this._hash;
    if (s != dloc.hash) {
      dloc.hash = s;
    }
    return this;
  },

  onHashChanged: function () {}
};

var Router = exports.Router = function (routes) {
  if (!(this instanceof Router)) return new Router(routes);

  this.params   = {};
  this.routes   = {};
  this.methods  = ['on', 'once', 'after', 'before'];
  this.scope    = [];
  this._methods = {};

  this._insert = this.insert;
  this.insert = this.insertEx;

  this.historySupport = (window.history != null ? window.history.pushState : null) != null

  this.configure();
  this.mount(routes || {});
};

Router.prototype.init = function (r) {
  var self = this;
  this.handler = function(onChangeEvent) {
    var newURL = onChangeEvent && onChangeEvent.newURL || window.location.hash;
    var url = self.history === true ? self.getPath() : newURL.replace(/.*#/, '');
    self.dispatch('on', url.charAt(0) === '/' ? url : '/' + url);
  };

  listener.init(this.handler, this.history);

  if (this.history === false) {
    if (dlocHashEmpty() && r) {
      dloc.hash = r;
    } else if (!dlocHashEmpty()) {
      self.dispatch('on', '/' + dloc.hash.replace(/^(#\/|#|\/)/, ''));
    }
  }
  else {
    var routeTo = dlocHashEmpty() && r ? r : !dlocHashEmpty() ? dloc.hash.replace(/^#/, '') : null;
    if (routeTo) {
      window.history.replaceState({}, document.title, routeTo);
    }

    // Router has been initialized, but due to the chrome bug it will not
    // yet actually route HTML5 history state changes. Thus, decide if should route.
    if (routeTo || this.run_in_init === true) {
      this.handler();
    }
  }

  return this;
};

Router.prototype.explode = function () {
  var v = this.history === true ? this.getPath() : dloc.hash;
  if (v.charAt(1) === '/') { v=v.slice(1) }
  return v.slice(1, v.length).split("/");
};

Router.prototype.setRoute = function (i, v, val) {
  var url = this.explode();

  if (typeof i === 'number' && typeof v === 'string') {
    url[i] = v;
  }
  else if (typeof val === 'string') {
    url.splice(i, v, s);
  }
  else {
    url = [i];
  }

  listener.setHash(url.join('/'));
  return url;
};

//
// ### function insertEx(method, path, route, parent)
// #### @method {string} Method to insert the specific `route`.
// #### @path {Array} Parsed path to insert the `route` at.
// #### @route {Array|function} Route handlers to insert.
// #### @parent {Object} **Optional** Parent "routes" to insert into.
// insert a callback that will only occur once per the matched route.
//
Router.prototype.insertEx = function(method, path, route, parent) {
  if (method === "once") {
    method = "on";
    route = function(route) {
      var once = false;
      return function() {
        if (once) return;
        once = true;
        return route.apply(this, arguments);
      };
    }(route);
  }
  return this._insert(method, path, route, parent);
};

Router.prototype.getRoute = function (v) {
  var ret = v;

  if (typeof v === "number") {
    ret = this.explode()[v];
  }
  else if (typeof v === "string"){
    var h = this.explode();
    ret = h.indexOf(v);
  }
  else {
    ret = this.explode();
  }

  return ret;
};

Router.prototype.destroy = function () {
  listener.destroy(this.handler);
  return this;
};

Router.prototype.getPath = function () {
  var path = window.location.pathname;
  if (path.substr(0, 1) !== '/') {
    path = '/' + path;
  }
  return path;
};
function _every(arr, iterator) {
  for (var i = 0; i < arr.length; i += 1) {
    if (iterator(arr[i], i, arr) === false) {
      return;
    }
  }
}

function _flatten(arr) {
  var flat = [];
  for (var i = 0, n = arr.length; i < n; i++) {
    flat = flat.concat(arr[i]);
  }
  return flat;
}

function _asyncEverySeries(arr, iterator, callback) {
  if (!arr.length) {
    return callback();
  }
  var completed = 0;
  (function iterate() {
    iterator(arr[completed], function(err) {
      if (err || err === false) {
        callback(err);
        callback = function() {};
      } else {
        completed += 1;
        if (completed === arr.length) {
          callback();
        } else {
          iterate();
        }
      }
    });
  })();
}

function paramifyString(str, params, mod) {
  mod = str;
  for (var param in params) {
    if (params.hasOwnProperty(param)) {
      mod = params[param](str);
      if (mod !== str) {
        break;
      }
    }
  }
  return mod === str ? "([._a-zA-Z0-9-]+)" : mod;
}

function regifyString(str, params) {
  var matches, last = 0, out = "";
  while (matches = str.substr(last).match(/[^\w\d\- %@&]*\*[^\w\d\- %@&]*/)) {
    last = matches.index + matches[0].length;
    matches[0] = matches[0].replace(/^\*/, "([_.()!\\ %@&a-zA-Z0-9-]+)");
    out += str.substr(0, matches.index) + matches[0];
  }
  str = out += str.substr(last);
  var captures = str.match(/:([^\/]+)/ig), capture, length;
  if (captures) {
    length = captures.length;
    for (var i = 0; i < length; i++) {
      capture = captures[i];
      if (capture.slice(0, 2) === "::") {
        str = capture.slice(1);
      } else {
        str = str.replace(capture, paramifyString(capture, params));
      }
    }
  }
  return str;
}

function terminator(routes, delimiter, start, stop) {
  var last = 0, left = 0, right = 0, start = (start || "(").toString(), stop = (stop || ")").toString(), i;
  for (i = 0; i < routes.length; i++) {
    var chunk = routes[i];
    if (chunk.indexOf(start, last) > chunk.indexOf(stop, last) || ~chunk.indexOf(start, last) && !~chunk.indexOf(stop, last) || !~chunk.indexOf(start, last) && ~chunk.indexOf(stop, last)) {
      left = chunk.indexOf(start, last);
      right = chunk.indexOf(stop, last);
      if (~left && !~right || !~left && ~right) {
        var tmp = routes.slice(0, (i || 1) + 1).join(delimiter);
        routes = [ tmp ].concat(routes.slice((i || 1) + 1));
      }
      last = (right > left ? right : left) + 1;
      i = 0;
    } else {
      last = 0;
    }
  }
  return routes;
}

Router.prototype.configure = function(options) {
  options = options || {};
  for (var i = 0; i < this.methods.length; i++) {
    this._methods[this.methods[i]] = true;
  }
  this.recurse = options.recurse || this.recurse || false;
  this.async = options.async || false;
  this.delimiter = options.delimiter || "/";
  this.strict = typeof options.strict === "undefined" ? true : options.strict;
  this.notfound = options.notfound;
  this.resource = options.resource;
  this.history = options.html5history && this.historySupport || false;
  this.run_in_init = this.history === true && options.run_handler_in_init !== false;
  this.every = {
    after: options.after || null,
    before: options.before || null,
    on: options.on || null
  };
  return this;
};

Router.prototype.param = function(token, matcher) {
  if (token[0] !== ":") {
    token = ":" + token;
  }
  var compiled = new RegExp(token, "g");
  this.params[token] = function(str) {
    return str.replace(compiled, matcher.source || matcher);
  };
};

Router.prototype.on = Router.prototype.route = function(method, path, route) {
  var self = this;
  if (!route && typeof path == "function") {
    route = path;
    path = method;
    method = "on";
  }
  if (Array.isArray(path)) {
    return path.forEach(function(p) {
      self.on(method, p, route);
    });
  }
  if (path.source) {
    path = path.source.replace(/\\\//ig, "/");
  }
  if (Array.isArray(method)) {
    return method.forEach(function(m) {
      self.on(m.toLowerCase(), path, route);
    });
  }
  path = path.split(new RegExp(this.delimiter));
  path = terminator(path, this.delimiter);
  this.insert(method, this.scope.concat(path), route);
};

Router.prototype.dispatch = function(method, path, callback) {
  var self = this, fns = this.traverse(method, path, this.routes, ""), invoked = this._invoked, after;
  this._invoked = true;
  if (!fns || fns.length === 0) {
    this.last = [];
    if (typeof this.notfound === "function") {
      this.invoke([ this.notfound ], {
        method: method,
        path: path
      }, callback);
    }
    return false;
  }
  if (this.recurse === "forward") {
    fns = fns.reverse();
  }
  function updateAndInvoke() {
    self.last = fns.after;
    self.invoke(self.runlist(fns), self, callback);
  }
  after = this.every && this.every.after ? [ this.every.after ].concat(this.last) : [ this.last ];
  if (after && after.length > 0 && invoked) {
    if (this.async) {
      this.invoke(after, this, updateAndInvoke);
    } else {
      this.invoke(after, this);
      updateAndInvoke();
    }
    return true;
  }
  updateAndInvoke();
  return true;
};

Router.prototype.invoke = function(fns, thisArg, callback) {
  var self = this;
  var apply;
  if (this.async) {
    apply = function(fn, next) {
      if (Array.isArray(fn)) {
        return _asyncEverySeries(fn, apply, next);
      } else if (typeof fn == "function") {
        fn.apply(thisArg, fns.captures.concat(next));
      }
    };
    _asyncEverySeries(fns, apply, function() {
      if (callback) {
        callback.apply(thisArg, arguments);
      }
    });
  } else {
    apply = function(fn) {
      if (Array.isArray(fn)) {
        return _every(fn, apply);
      } else if (typeof fn === "function") {
        return fn.apply(thisArg, fns.captures || []);
      } else if (typeof fn === "string" && self.resource) {
        self.resource[fn].apply(thisArg, fns.captures || []);
      }
    };
    _every(fns, apply);
  }
};

Router.prototype.traverse = function(method, path, routes, regexp, filter) {
  var fns = [], current, exact, match, next, that;
  function filterRoutes(routes) {
    if (!filter) {
      return routes;
    }
    function deepCopy(source) {
      var result = [];
      for (var i = 0; i < source.length; i++) {
        result[i] = Array.isArray(source[i]) ? deepCopy(source[i]) : source[i];
      }
      return result;
    }
    function applyFilter(fns) {
      for (var i = fns.length - 1; i >= 0; i--) {
        if (Array.isArray(fns[i])) {
          applyFilter(fns[i]);
          if (fns[i].length === 0) {
            fns.splice(i, 1);
          }
        } else {
          if (!filter(fns[i])) {
            fns.splice(i, 1);
          }
        }
      }
    }
    var newRoutes = deepCopy(routes);
    newRoutes.matched = routes.matched;
    newRoutes.captures = routes.captures;
    newRoutes.after = routes.after.filter(filter);
    applyFilter(newRoutes);
    return newRoutes;
  }
  if (path === this.delimiter && routes[method]) {
    next = [ [ routes.before, routes[method] ].filter(Boolean) ];
    next.after = [ routes.after ].filter(Boolean);
    next.matched = true;
    next.captures = [];
    return filterRoutes(next);
  }
  for (var r in routes) {
    if (routes.hasOwnProperty(r) && (!this._methods[r] || this._methods[r] && typeof routes[r] === "object" && !Array.isArray(routes[r]))) {
      current = exact = regexp + this.delimiter + r;
      if (!this.strict) {
        exact += "[" + this.delimiter + "]?";
      }
      match = path.match(new RegExp("^" + exact));
      if (!match) {
        continue;
      }
      if (match[0] && match[0] == path && routes[r][method]) {
        next = [ [ routes[r].before, routes[r][method] ].filter(Boolean) ];
        next.after = [ routes[r].after ].filter(Boolean);
        next.matched = true;
        next.captures = match.slice(1);
        if (this.recurse && routes === this.routes) {
          next.push([ routes.before, routes.on ].filter(Boolean));
          next.after = next.after.concat([ routes.after ].filter(Boolean));
        }
        return filterRoutes(next);
      }
      next = this.traverse(method, path, routes[r], current);
      if (next.matched) {
        if (next.length > 0) {
          fns = fns.concat(next);
        }
        if (this.recurse) {
          fns.push([ routes[r].before, routes[r].on ].filter(Boolean));
          next.after = next.after.concat([ routes[r].after ].filter(Boolean));
          if (routes === this.routes) {
            fns.push([ routes["before"], routes["on"] ].filter(Boolean));
            next.after = next.after.concat([ routes["after"] ].filter(Boolean));
          }
        }
        fns.matched = true;
        fns.captures = next.captures;
        fns.after = next.after;
        return filterRoutes(fns);
      }
    }
  }
  return false;
};

Router.prototype.insert = function(method, path, route, parent) {
  var methodType, parentType, isArray, nested, part;
  path = path.filter(function(p) {
    return p && p.length > 0;
  });
  parent = parent || this.routes;
  part = path.shift();
  if (/\:|\*/.test(part) && !/\\d|\\w/.test(part)) {
    part = regifyString(part, this.params);
  }
  if (path.length > 0) {
    parent[part] = parent[part] || {};
    return this.insert(method, path, route, parent[part]);
  }
  if (!part && !path.length && parent === this.routes) {
    methodType = typeof parent[method];
    switch (methodType) {
     case "function":
      parent[method] = [ parent[method], route ];
      return;
     case "object":
      parent[method].push(route);
      return;
     case "undefined":
      parent[method] = route;
      return;
    }
    return;
  }
  parentType = typeof parent[part];
  isArray = Array.isArray(parent[part]);
  if (parent[part] && !isArray && parentType == "object") {
    methodType = typeof parent[part][method];
    switch (methodType) {
     case "function":
      parent[part][method] = [ parent[part][method], route ];
      return;
     case "object":
      parent[part][method].push(route);
      return;
     case "undefined":
      parent[part][method] = route;
      return;
    }
  } else if (parentType == "undefined") {
    nested = {};
    nested[method] = route;
    parent[part] = nested;
    return;
  }
  throw new Error("Invalid route context: " + parentType);
};



Router.prototype.extend = function(methods) {
  var self = this, len = methods.length, i;
  function extend(method) {
    self._methods[method] = true;
    self[method] = function() {
      var extra = arguments.length === 1 ? [ method, "" ] : [ method ];
      self.on.apply(self, extra.concat(Array.prototype.slice.call(arguments)));
    };
  }
  for (i = 0; i < len; i++) {
    extend(methods[i]);
  }
};

Router.prototype.runlist = function(fns) {
  var runlist = this.every && this.every.before ? [ this.every.before ].concat(_flatten(fns)) : _flatten(fns);
  if (this.every && this.every.on) {
    runlist.push(this.every.on);
  }
  runlist.captures = fns.captures;
  runlist.source = fns.source;
  return runlist;
};

Router.prototype.mount = function(routes, path) {
  if (!routes || typeof routes !== "object" || Array.isArray(routes)) {
    return;
  }
  var self = this;
  path = path || [];
  if (!Array.isArray(path)) {
    path = path.split(self.delimiter);
  }
  function insertOrMount(route, local) {
    var rename = route, parts = route.split(self.delimiter), routeType = typeof routes[route], isRoute = parts[0] === "" || !self._methods[parts[0]], event = isRoute ? "on" : rename;
    if (isRoute) {
      rename = rename.slice((rename.match(new RegExp("^" + self.delimiter)) || [ "" ])[0].length);
      parts.shift();
    }
    if (isRoute && routeType === "object" && !Array.isArray(routes[route])) {
      local = local.concat(parts);
      self.mount(routes[route], local);
      return;
    }
    if (isRoute) {
      local = local.concat(rename.split(self.delimiter));
      local = terminator(local, self.delimiter);
    }
    self.insert(event, local, routes[route]);
  }
  for (var route in routes) {
    if (routes.hasOwnProperty(route)) {
      insertOrMount(route, path.slice(0));
    }
  }
};



}(typeof exports === "object" ? exports : window));
},{}],9:[function(require,module,exports){
"use strict";
var Promise = require("./promise/promise").Promise;
var polyfill = require("./promise/polyfill").polyfill;
exports.Promise = Promise;
exports.polyfill = polyfill;
},{"./promise/polyfill":13,"./promise/promise":14}],10:[function(require,module,exports){
"use strict";
/* global toString */

var isArray = require("./utils").isArray;
var isFunction = require("./utils").isFunction;

/**
  Returns a promise that is fulfilled when all the given promises have been
  fulfilled, or rejected if any of them become rejected. The return promise
  is fulfilled with an array that gives all the values in the order they were
  passed in the `promises` array argument.

  Example:

  ```javascript
  var promise1 = RSVP.resolve(1);
  var promise2 = RSVP.resolve(2);
  var promise3 = RSVP.resolve(3);
  var promises = [ promise1, promise2, promise3 ];

  RSVP.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `RSVP.all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  var promise1 = RSVP.resolve(1);
  var promise2 = RSVP.reject(new Error("2"));
  var promise3 = RSVP.reject(new Error("3"));
  var promises = [ promise1, promise2, promise3 ];

  RSVP.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @for RSVP
  @param {Array} promises
  @param {String} label
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
*/
function all(promises) {
  /*jshint validthis:true */
  var Promise = this;

  if (!isArray(promises)) {
    throw new TypeError('You must pass an array to all.');
  }

  return new Promise(function(resolve, reject) {
    var results = [], remaining = promises.length,
    promise;

    if (remaining === 0) {
      resolve([]);
    }

    function resolver(index) {
      return function(value) {
        resolveAll(index, value);
      };
    }

    function resolveAll(index, value) {
      results[index] = value;
      if (--remaining === 0) {
        resolve(results);
      }
    }

    for (var i = 0; i < promises.length; i++) {
      promise = promises[i];

      if (promise && isFunction(promise.then)) {
        promise.then(resolver(i), reject);
      } else {
        resolveAll(i, promise);
      }
    }
  });
}

exports.all = all;
},{"./utils":18}],11:[function(require,module,exports){
(function (process,global){
"use strict";
var browserGlobal = (typeof window !== 'undefined') ? window : {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

// node
function useNextTick() {
  return function() {
    process.nextTick(flush);
  };
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function() {
    node.data = (iterations = ++iterations % 2);
  };
}

function useSetTimeout() {
  return function() {
    local.setTimeout(flush, 1);
  };
}

var queue = [];
function flush() {
  for (var i = 0; i < queue.length; i++) {
    var tuple = queue[i];
    var callback = tuple[0], arg = tuple[1];
    callback(arg);
  }
  queue = [];
}

var scheduleFlush;

// Decide what async method to use to triggering processing of queued callbacks:
if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else {
  scheduleFlush = useSetTimeout();
}

function asap(callback, arg) {
  var length = queue.push([callback, arg]);
  if (length === 1) {
    // If length is 1, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    scheduleFlush();
  }
}

exports.asap = asap;
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":7}],12:[function(require,module,exports){
"use strict";
var config = {
  instrument: false
};

function configure(name, value) {
  if (arguments.length === 2) {
    config[name] = value;
  } else {
    return config[name];
  }
}

exports.config = config;
exports.configure = configure;
},{}],13:[function(require,module,exports){
(function (global){
"use strict";
/*global self*/
var RSVPPromise = require("./promise").Promise;
var isFunction = require("./utils").isFunction;

function polyfill() {
  var local;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof window !== 'undefined' && window.document) {
    local = window;
  } else {
    local = self;
  }

  var es6PromiseSupport = 
    "Promise" in local &&
    // Some of these methods are missing from
    // Firefox/Chrome experimental implementations
    "resolve" in local.Promise &&
    "reject" in local.Promise &&
    "all" in local.Promise &&
    "race" in local.Promise &&
    // Older version of the spec had a resolver object
    // as the arg rather than a function
    (function() {
      var resolve;
      new local.Promise(function(r) { resolve = r; });
      return isFunction(resolve);
    }());

  if (!es6PromiseSupport) {
    local.Promise = RSVPPromise;
  }
}

exports.polyfill = polyfill;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./promise":14,"./utils":18}],14:[function(require,module,exports){
"use strict";
var config = require("./config").config;
var configure = require("./config").configure;
var objectOrFunction = require("./utils").objectOrFunction;
var isFunction = require("./utils").isFunction;
var now = require("./utils").now;
var all = require("./all").all;
var race = require("./race").race;
var staticResolve = require("./resolve").resolve;
var staticReject = require("./reject").reject;
var asap = require("./asap").asap;

var counter = 0;

config.async = asap; // default async is asap;

function Promise(resolver) {
  if (!isFunction(resolver)) {
    throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
  }

  if (!(this instanceof Promise)) {
    throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
  }

  this._subscribers = [];

  invokeResolver(resolver, this);
}

function invokeResolver(resolver, promise) {
  function resolvePromise(value) {
    resolve(promise, value);
  }

  function rejectPromise(reason) {
    reject(promise, reason);
  }

  try {
    resolver(resolvePromise, rejectPromise);
  } catch(e) {
    rejectPromise(e);
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value, error, succeeded, failed;

  if (hasCallback) {
    try {
      value = callback(detail);
      succeeded = true;
    } catch(e) {
      failed = true;
      error = e;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (handleThenable(promise, value)) {
    return;
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    resolve(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

var PENDING   = void 0;
var SEALED    = 0;
var FULFILLED = 1;
var REJECTED  = 2;

function subscribe(parent, child, onFulfillment, onRejection) {
  var subscribers = parent._subscribers;
  var length = subscribers.length;

  subscribers[length] = child;
  subscribers[length + FULFILLED] = onFulfillment;
  subscribers[length + REJECTED]  = onRejection;
}

function publish(promise, settled) {
  var child, callback, subscribers = promise._subscribers, detail = promise._detail;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    invokeCallback(settled, child, callback, detail);
  }

  promise._subscribers = null;
}

Promise.prototype = {
  constructor: Promise,

  _state: undefined,
  _detail: undefined,
  _subscribers: undefined,

  then: function(onFulfillment, onRejection) {
    var promise = this;

    var thenPromise = new this.constructor(function() {});

    if (this._state) {
      var callbacks = arguments;
      config.async(function invokePromiseCallback() {
        invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
      });
    } else {
      subscribe(this, thenPromise, onFulfillment, onRejection);
    }

    return thenPromise;
  },

  'catch': function(onRejection) {
    return this.then(null, onRejection);
  }
};

Promise.all = all;
Promise.race = race;
Promise.resolve = staticResolve;
Promise.reject = staticReject;

function handleThenable(promise, value) {
  var then = null,
  resolved;

  try {
    if (promise === value) {
      throw new TypeError("A promises callback cannot return that same promise.");
    }

    if (objectOrFunction(value)) {
      then = value.then;

      if (isFunction(then)) {
        then.call(value, function(val) {
          if (resolved) { return true; }
          resolved = true;

          if (value !== val) {
            resolve(promise, val);
          } else {
            fulfill(promise, val);
          }
        }, function(val) {
          if (resolved) { return true; }
          resolved = true;

          reject(promise, val);
        });

        return true;
      }
    }
  } catch (error) {
    if (resolved) { return true; }
    reject(promise, error);
    return true;
  }

  return false;
}

function resolve(promise, value) {
  if (promise === value) {
    fulfill(promise, value);
  } else if (!handleThenable(promise, value)) {
    fulfill(promise, value);
  }
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) { return; }
  promise._state = SEALED;
  promise._detail = value;

  config.async(publishFulfillment, promise);
}

function reject(promise, reason) {
  if (promise._state !== PENDING) { return; }
  promise._state = SEALED;
  promise._detail = reason;

  config.async(publishRejection, promise);
}

function publishFulfillment(promise) {
  publish(promise, promise._state = FULFILLED);
}

function publishRejection(promise) {
  publish(promise, promise._state = REJECTED);
}

exports.Promise = Promise;
},{"./all":10,"./asap":11,"./config":12,"./race":15,"./reject":16,"./resolve":17,"./utils":18}],15:[function(require,module,exports){
"use strict";
/* global toString */
var isArray = require("./utils").isArray;

/**
  `RSVP.race` allows you to watch a series of promises and act as soon as the
  first promise given to the `promises` argument fulfills or rejects.

  Example:

  ```javascript
  var promise1 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 1");
    }, 200);
  });

  var promise2 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 2");
    }, 100);
  });

  RSVP.race([promise1, promise2]).then(function(result){
    // result === "promise 2" because it was resolved before promise1
    // was resolved.
  });
  ```

  `RSVP.race` is deterministic in that only the state of the first completed
  promise matters. For example, even if other promises given to the `promises`
  array argument are resolved, but the first completed promise has become
  rejected before the other promises became fulfilled, the returned promise
  will become rejected:

  ```javascript
  var promise1 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 1");
    }, 200);
  });

  var promise2 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error("promise 2"));
    }, 100);
  });

  RSVP.race([promise1, promise2]).then(function(result){
    // Code here never runs because there are rejected promises!
  }, function(reason){
    // reason.message === "promise2" because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  @method race
  @for RSVP
  @param {Array} promises array of promises to observe
  @param {String} label optional string for describing the promise returned.
  Useful for tooling.
  @return {Promise} a promise that becomes fulfilled with the value the first
  completed promises is resolved with if the first completed promise was
  fulfilled, or rejected with the reason that the first completed promise
  was rejected with.
*/
function race(promises) {
  /*jshint validthis:true */
  var Promise = this;

  if (!isArray(promises)) {
    throw new TypeError('You must pass an array to race.');
  }
  return new Promise(function(resolve, reject) {
    var results = [], promise;

    for (var i = 0; i < promises.length; i++) {
      promise = promises[i];

      if (promise && typeof promise.then === 'function') {
        promise.then(resolve, reject);
      } else {
        resolve(promise);
      }
    }
  });
}

exports.race = race;
},{"./utils":18}],16:[function(require,module,exports){
"use strict";
/**
  `RSVP.reject` returns a promise that will become rejected with the passed
  `reason`. `RSVP.reject` is essentially shorthand for the following:

  ```javascript
  var promise = new RSVP.Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  var promise = RSVP.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @for RSVP
  @param {Any} reason value that the returned promise will be rejected with.
  @param {String} label optional string for identifying the returned promise.
  Useful for tooling.
  @return {Promise} a promise that will become rejected with the given
  `reason`.
*/
function reject(reason) {
  /*jshint validthis:true */
  var Promise = this;

  return new Promise(function (resolve, reject) {
    reject(reason);
  });
}

exports.reject = reject;
},{}],17:[function(require,module,exports){
"use strict";
function resolve(value) {
  /*jshint validthis:true */
  if (value && typeof value === 'object' && value.constructor === this) {
    return value;
  }

  var Promise = this;

  return new Promise(function(resolve) {
    resolve(value);
  });
}

exports.resolve = resolve;
},{}],18:[function(require,module,exports){
"use strict";
function objectOrFunction(x) {
  return isFunction(x) || (typeof x === "object" && x !== null);
}

function isFunction(x) {
  return typeof x === "function";
}

function isArray(x) {
  return Object.prototype.toString.call(x) === "[object Array]";
}

// Date.now is not available in browsers < IE9
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
var now = Date.now || function() { return new Date().getTime(); };


exports.objectOrFunction = objectOrFunction;
exports.isFunction = isFunction;
exports.isArray = isArray;
exports.now = now;
},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9tYXJrL3dvcmsvejVoLm5wbS96NWguZmx1aXIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9tYXJrL3dvcmsvejVoLm5wbS96NWguZmx1aXIvaW5kZXguanMiLCIvVXNlcnMvbWFyay93b3JrL3o1aC5ucG0vejVoLmZsdWlyL2xpYi9kaXNwYXRjaEhhbmRsZXIuanMiLCIvVXNlcnMvbWFyay93b3JrL3o1aC5ucG0vejVoLmZsdWlyL2xpYi9yb3V0ZUhhbmRsZXIuanMiLCIvVXNlcnMvbWFyay93b3JrL3o1aC5ucG0vejVoLmZsdWlyL2xpYi9zY29wZS5qcyIsIi9Vc2Vycy9tYXJrL3dvcmsvejVoLm5wbS96NWguZmx1aXIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi9Vc2Vycy9tYXJrL3dvcmsvejVoLm5wbS96NWguZmx1aXIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIvVXNlcnMvbWFyay93b3JrL3o1aC5ucG0vejVoLmZsdWlyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvbWFyay93b3JrL3o1aC5ucG0vejVoLmZsdWlyL25vZGVfbW9kdWxlcy9kaXJlY3Rvci9idWlsZC9kaXJlY3Rvci5qcyIsIi9Vc2Vycy9tYXJrL3dvcmsvejVoLm5wbS96NWguZmx1aXIvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvY29tbW9uanMvbWFpbi5qcyIsIi9Vc2Vycy9tYXJrL3dvcmsvejVoLm5wbS96NWguZmx1aXIvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvY29tbW9uanMvcHJvbWlzZS9hbGwuanMiLCIvVXNlcnMvbWFyay93b3JrL3o1aC5ucG0vejVoLmZsdWlyL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvYXNhcC5qcyIsIi9Vc2Vycy9tYXJrL3dvcmsvejVoLm5wbS96NWguZmx1aXIvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvY29tbW9uanMvcHJvbWlzZS9jb25maWcuanMiLCIvVXNlcnMvbWFyay93b3JrL3o1aC5ucG0vejVoLmZsdWlyL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvcG9seWZpbGwuanMiLCIvVXNlcnMvbWFyay93b3JrL3o1aC5ucG0vejVoLmZsdWlyL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvcHJvbWlzZS5qcyIsIi9Vc2Vycy9tYXJrL3dvcmsvejVoLm5wbS96NWguZmx1aXIvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvY29tbW9uanMvcHJvbWlzZS9yYWNlLmpzIiwiL1VzZXJzL21hcmsvd29yay96NWgubnBtL3o1aC5mbHVpci9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL3JlamVjdC5qcyIsIi9Vc2Vycy9tYXJrL3dvcmsvejVoLm5wbS96NWguZmx1aXIvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvY29tbW9uanMvcHJvbWlzZS9yZXNvbHZlLmpzIiwiL1VzZXJzL21hcmsvd29yay96NWgubnBtL3o1aC5mbHVpci9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhclxuICBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXIsXG4gIFNjb3BlID0gcmVxdWlyZSgnLi9saWIvc2NvcGUnKS5TY29wZSxcbiAgUm91dGVIYW5kbGVyID0gcmVxdWlyZSgnLi9saWIvcm91dGVIYW5kbGVyJykuUm91dGVIYW5kbGVyLFxuICBEaXNwYXRjaEhhbmRsZXIgPSByZXF1aXJlKCcuL2xpYi9kaXNwYXRjaEhhbmRsZXInKS5EaXNwYXRjaEhhbmRsZXI7XG5cbi8qKlxuICogQXBwbGljYXRpb25cbiAqL1xuZnVuY3Rpb24gQXBwbGljYXRpb24obmFtZVRvU3RvcmVzKXtcblxuICB0aGlzLl9zdG9yZXMgPSBfLnZhbHVlcyhuYW1lVG9TdG9yZXMpO1xuXG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuICBfLmV4dGVuZCh0aGlzLCBFdmVudEVtaXR0ZXIucHJvdG90eXBlKTtcblxuICBTY29wZS5jYWxsKHRoaXMsIG5hbWVUb1N0b3Jlcyk7XG4gIHRoaXMuZ2V0ID0gU2NvcGUucHJvdG90eXBlLmdldDtcblxuICBSb3V0ZUhhbmRsZXIuY2FsbCh0aGlzLCB0aGlzLl9zdG9yZXMpO1xuICBfLmV4dGVuZCh0aGlzLCBSb3V0ZUhhbmRsZXIucHJvdG90eXBlKTtcblxuICBEaXNwYXRjaEhhbmRsZXIuY2FsbCh0aGlzLCB0aGlzLl9zdG9yZXMpO1xuICB0aGlzLmRpc3BhdGNoID0gXy5iaW5kKGZ1bmN0aW9uKGV2ZW50LCBwYXlsb2FkKXtcbiAgICByZXR1cm4gRGlzcGF0Y2hIYW5kbGVyLnByb3RvdHlwZS5kaXNwYXRjaC5jYWxsKHRoaXMsIGV2ZW50LCBwYXlsb2FkKTtcbiAgfSwgdGhpcyk7XG4gIHRoaXMuZW1pdENoYW5nZSA9IF8uYmluZChmdW5jdGlvbigpe1xuICAgIHJldHVybiBBcHBsaWNhdGlvbi5wcm90b3R5cGUuZW1pdENoYW5nZS5jYWxsKHRoaXMpO1xuICB9LCB0aGlzKTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIF8uZWFjaCh0aGlzLl9zdG9yZXMsIGZ1bmN0aW9uKHN0b3JlKXtcbiAgICAvL3doZW4gYSBzdG9yZSBmaXJlcyBhIGNoYW5nZSBldmVudCwgd2UgZm9yd2FyZCB0byB0aGUgcm9vdCB2aWV3IGxpc3RlbmluZ1xuICAgIHN0b3JlLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpe1xuICAgICAgc2VsZi5lbWl0Q2hhbmdlKHN0b3JlKTtcbiAgICB9KTtcbiAgICBzdG9yZS5nbyA9IF8uYmluZChzZWxmLmdvLCBzZWxmKTtcbiAgICBzdG9yZS5zY29wZSA9IF8uYmluZChzZWxmLnB1c2gsIHNlbGYpO1xuICB9KTtcbn1cblxuQXBwbGljYXRpb24ucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbihtYXApe1xuICB2YXIgcmVzdWx0ID0gU2NvcGUucHJvdG90eXBlLnB1c2guY2FsbCh0aGlzLCBtYXApO1xuICByZXN1bHQuZGlzcGF0Y2ggPSB0aGlzLmRpc3BhdGNoO1xuICByZXN1bHQuZW1pdENoYW5nZSA9IHRoaXMuZW1pdENoYW5nZTtcbiAgcmVzdWx0LnB1c2ggPSBBcHBsaWNhdGlvbi5wcm90b3R5cGUucHVzaDtcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkFwcGxpY2F0aW9uLnByb3RvdHlwZS5lbWl0Q2hhbmdlID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcbn07XG5cbi8qKlxuICogVmlld01peGluXG4gKi9cbnZhciBWaWV3TWl4aW4gPSB7XG4gIHNjb3BlOiBmdW5jdGlvbih2YWx1ZXMpe1xuICAgIHJldHVybiB2YWx1ZXMgPyB0aGlzLnByb3BzLnNjb3BlLnB1c2godmFsdWVzKSA6IHRoaXMucHJvcHMuc2NvcGU7XG4gIH0sXG4gIHJlc29sdmU6IGZ1bmN0aW9uKGtleSl7XG4gICAgcmV0dXJuIHRoaXMucHJvcHMuc2NvcGUuZ2V0KGtleSk7XG4gIH0sXG4gIGRpc3BhdGNoOiBmdW5jdGlvbihldmVudCwgcGF5bG9hZCl7XG4gICAgcmV0dXJuIHRoaXMucHJvcHMuc2NvcGUuZGlzcGF0Y2goZXZlbnQsIHBheWxvYWQpO1xuICB9LFxuICBkaXNwYXRjaGVyOiBmdW5jdGlvbihldmVudCl7XG4gICAgcmV0dXJuIF8uYmluZChmdW5jdGlvbihlKXtcbiAgICAgIHRoaXMucHJvcHMuc2NvcGUuZGlzcGF0Y2goZXZlbnQsIGUudGFyZ2V0LnZhbHVlKTtcbiAgICB9LCB0aGlzKTtcbiAgfVxufTtcblxuLyoqXG4gKiBSb290Vmlld01peGluXG4gKi9cbnZhciBSb290Vmlld01peGluID0ge1xuICBkZWJvdW5jZVRpbWU6IDEwLFxuICBjb21wb25lbnRXaWxsTW91bnQ6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5jYWxsYmFjayA9IChmdW5jdGlvbigpe1xuICAgICAgdGhpcy5mb3JjZVVwZGF0ZSgpO1xuICAgIH0pLmJpbmQodGhpcyk7XG4gICAgdGhpcy5wcm9wcy5zY29wZS5vbignY2hhbmdlJywgXy5kZWJvdW5jZSh0aGlzLmNhbGxiYWNrLCB0aGlzLmRlYm91bmNlVGltZSkpO1xuICB9XG59O1xuXG5fLmV4dGVuZChSb290Vmlld01peGluLCBWaWV3TWl4aW4pO1xuXG5leHBvcnRzLkFwcGxpY2F0aW9uID0gQXBwbGljYXRpb247XG5leHBvcnRzLlZpZXdNaXhpbiA9IFZpZXdNaXhpbjtcbmV4cG9ydHMuUm9vdFZpZXdNaXhpbiA9IFJvb3RWaWV3TWl4aW47IiwidmFyXG4gIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIFByb21pc2UgPSByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2U7XG5cbi8qKlxuICogRGlzcGF0Y2hIYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIERpc3BhdGNoSGFuZGxlcihsaXN0ZW5lcnMpe1xuICB0aGlzLl9saXN0ZW5lcnMgPSBsaXN0ZW5lcnM7XG59XG5EaXNwYXRjaEhhbmRsZXIucHJvdG90eXBlLmRpc3BhdGNoID0gZnVuY3Rpb24oZXZlbnRfbmFtZSwgcGF5bG9hZCl7XG4gIHZhciBwcm9taXNlcyA9IFtdO1xuICBfLmVhY2godGhpcy5fbGlzdGVuZXJzLCBmdW5jdGlvbihzdG9yZSl7XG4gICAgdmFyIGZuID0gc3RvcmVbZXZlbnRfbmFtZV07XG4gICAgaWYgKHR5cGVvZihmbikgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHByb21pc2VzLnB1c2goZm4uY2FsbChzdG9yZSwgcGF5bG9hZCkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XG59O1xuXG5leHBvcnRzLkRpc3BhdGNoSGFuZGxlciA9IERpc3BhdGNoSGFuZGxlcjsiLCJ2YXJcbiAgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgUm91dGVyID0gcmVxdWlyZSgnZGlyZWN0b3InKS5Sb3V0ZXI7XG5cbmZ1bmN0aW9uIGRlZmluZVJvdXRlSGFuZGxlcihSb3V0ZXIpe1xuICAvKipcbiAgICogUm91dGVIYW5kbGVyXG4gICAqL1xuICBmdW5jdGlvbiBSb3V0ZUhhbmRsZXIocm91dGVEZWxlZ2F0ZXMpe1xuICAgIHRoaXMuX3JvdXRlciA9IG5ldyBSb3V0ZXIoKTtcbiAgICB2YXIgYWN0aW9ucyA9IHt9O1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBfLmVhY2gocm91dGVEZWxlZ2F0ZXMsIGZ1bmN0aW9uKHJvdXRlRGVsZWdhdGUpe1xuICAgICAgXy5jaGFpbihyb3V0ZURlbGVnYXRlKVxuICAgICAgICAuZnVuY3Rpb25zKClcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICByZXR1cm4geC5jaGFyQXQoMCkgPT09ICcvJztcbiAgICAgICAgfSlcbiAgICAgICAgLmVhY2goZnVuY3Rpb24ocm91dGUpe1xuICAgICAgICAgIHZhciBhY3Rpb24gPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgcm91dGVEZWxlZ2F0ZVtyb3V0ZV0uYXBwbHkocm91dGVEZWxlZ2F0ZSwgYXJncyk7XG4gICAgICAgICAgICBzZWxmLmVtaXRDaGFuZ2UoKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGFjdGlvbnNbcm91dGVdID0gYWN0aW9uO1xuICAgICAgICAgIHNlbGYuX3JvdXRlci5vbihyb3V0ZSwgYWN0aW9uKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIF8uY2hhaW4ocm91dGVEZWxlZ2F0ZSlcbiAgICAgICAgLmtleXMoKVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIHJldHVybiB4LmNoYXJBdCgwKSA9PT0gJy8nICYmIHR5cGVvZihyb3V0ZURlbGVnYXRlW3hdKSA9PT0gJ3N0cmluZyc7XG4gICAgICAgIH0pXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKHJvdXRlKXtcbiAgICAgICAgICB2YXIgYWN0aW9uTmFtZSA9IHJvdXRlRGVsZWdhdGVbcm91dGVdO1xuICAgICAgICAgIHNlbGYuX3JvdXRlci5vbihyb3V0ZSwgYWN0aW9uc1thY3Rpb25OYW1lXSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgUm91dGVIYW5kbGVyLnByb3RvdHlwZS5pbml0Um91dGUgPSBmdW5jdGlvbihyb3V0ZSl7XG4gICAgdGhpcy5fcm91dGVyLmluaXQocm91dGUpO1xuICB9O1xuICBSb3V0ZUhhbmRsZXIucHJvdG90eXBlLmdvID0gZnVuY3Rpb24odXJsKXtcbiAgICB0aGlzLl9yb3V0ZXIuc2V0Um91dGUodXJsKTtcbiAgfTtcblxuICByZXR1cm4gUm91dGVIYW5kbGVyO1xufVxuXG5cbmV4cG9ydHMuUm91dGVIYW5kbGVyID0gZGVmaW5lUm91dGVIYW5kbGVyKFJvdXRlcik7XG5leHBvcnRzLmRlZmluZVJvdXRlSGFuZGxlciA9IGRlZmluZVJvdXRlSGFuZGxlcjsiLCIvKipcbiAqIFNjb3BlXG4gKi9cbmZ1bmN0aW9uIFNjb3BlKG1hcCl7XG4gIGlmIChtYXApIHtcbiAgICB0aGlzLl92YWx1ZXMgPSBtYXA7XG4gIH1cbn1cblNjb3BlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24odmFsdWVzKXtcbiAgdmFyIHNjb3BlID0gbmV3IFNjb3BlKHZhbHVlcyB8fCB7fSk7XG4gIHNjb3BlLl9wYXJlbnQgPSB0aGlzO1xuICByZXR1cm4gc2NvcGU7XG59O1xuXG5TY29wZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oa2V5KXtcbiAgdmFyIHRhcmdldCA9IHRoaXM7XG4gIHZhciByZXN1bHQgPSB0YXJnZXQuX3ZhbHVlc1trZXldO1xuICB3aGlsZSAocmVzdWx0ID09PSB1bmRlZmluZWQgJiYgdGFyZ2V0KSB7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0Ll9wYXJlbnQ7XG4gICAgcmVzdWx0ID0gdGFyZ2V0ID8gdGFyZ2V0Ll92YWx1ZXNba2V5XSA6IHJlc3VsdDtcbiAgfVxuICBpZiAodGFyZ2V0KSB7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBrZXkgKyBcIiBub3QgZm91bmRcIjtcbiAgfVxufTtcblxuZXhwb3J0cy5TY29wZSA9IFNjb3BlOyIsbnVsbCwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJcblxuLy9cbi8vIEdlbmVyYXRlZCBvbiBGcmkgRGVjIDI3IDIwMTMgMTI6MDI6MTEgR01ULTA1MDAgKEVTVCkgYnkgTm9kZWppdHN1LCBJbmMgKFVzaW5nIENvZGVzdXJnZW9uKS5cbi8vIFZlcnNpb24gMS4yLjJcbi8vXG5cbihmdW5jdGlvbiAoZXhwb3J0cykge1xuXG4vKlxuICogYnJvd3Nlci5qczogQnJvd3NlciBzcGVjaWZpYyBmdW5jdGlvbmFsaXR5IGZvciBkaXJlY3Rvci5cbiAqXG4gKiAoQykgMjAxMSwgTm9kZWppdHN1IEluYy5cbiAqIE1JVCBMSUNFTlNFXG4gKlxuICovXG5cbmlmICghQXJyYXkucHJvdG90eXBlLmZpbHRlcikge1xuICBBcnJheS5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24oZmlsdGVyLCB0aGF0KSB7XG4gICAgdmFyIG90aGVyID0gW10sIHY7XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0aGlzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgaWYgKGkgaW4gdGhpcyAmJiBmaWx0ZXIuY2FsbCh0aGF0LCB2ID0gdGhpc1tpXSwgaSwgdGhpcykpIHtcbiAgICAgICAgb3RoZXIucHVzaCh2KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG90aGVyO1xuICB9O1xufVxuXG5pZiAoIUFycmF5LmlzQXJyYXkpe1xuICBBcnJheS5pc0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9O1xufVxuXG52YXIgZGxvYyA9IGRvY3VtZW50LmxvY2F0aW9uO1xuXG5mdW5jdGlvbiBkbG9jSGFzaEVtcHR5KCkge1xuICAvLyBOb24tSUUgYnJvd3NlcnMgcmV0dXJuICcnIHdoZW4gdGhlIGFkZHJlc3MgYmFyIHNob3dzICcjJzsgRGlyZWN0b3IncyBsb2dpY1xuICAvLyBhc3N1bWVzIGJvdGggbWVhbiBlbXB0eS5cbiAgcmV0dXJuIGRsb2MuaGFzaCA9PT0gJycgfHwgZGxvYy5oYXNoID09PSAnIyc7XG59XG5cbnZhciBsaXN0ZW5lciA9IHtcbiAgbW9kZTogJ21vZGVybicsXG4gIGhhc2g6IGRsb2MuaGFzaCxcbiAgaGlzdG9yeTogZmFsc2UsXG5cbiAgY2hlY2s6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaCA9IGRsb2MuaGFzaDtcbiAgICBpZiAoaCAhPSB0aGlzLmhhc2gpIHtcbiAgICAgIHRoaXMuaGFzaCA9IGg7XG4gICAgICB0aGlzLm9uSGFzaENoYW5nZWQoKTtcbiAgICB9XG4gIH0sXG5cbiAgZmlyZTogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLm1vZGUgPT09ICdtb2Rlcm4nKSB7XG4gICAgICB0aGlzLmhpc3RvcnkgPT09IHRydWUgPyB3aW5kb3cub25wb3BzdGF0ZSgpIDogd2luZG93Lm9uaGFzaGNoYW5nZSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMub25IYXNoQ2hhbmdlZCgpO1xuICAgIH1cbiAgfSxcblxuICBpbml0OiBmdW5jdGlvbiAoZm4sIGhpc3RvcnkpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5oaXN0b3J5ID0gaGlzdG9yeTtcblxuICAgIGlmICghUm91dGVyLmxpc3RlbmVycykge1xuICAgICAgUm91dGVyLmxpc3RlbmVycyA9IFtdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uY2hhbmdlKG9uQ2hhbmdlRXZlbnQpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gUm91dGVyLmxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgUm91dGVyLmxpc3RlbmVyc1tpXShvbkNoYW5nZUV2ZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL25vdGUgSUU4IGlzIGJlaW5nIGNvdW50ZWQgYXMgJ21vZGVybicgYmVjYXVzZSBpdCBoYXMgdGhlIGhhc2hjaGFuZ2UgZXZlbnRcbiAgICBpZiAoJ29uaGFzaGNoYW5nZScgaW4gd2luZG93ICYmIChkb2N1bWVudC5kb2N1bWVudE1vZGUgPT09IHVuZGVmaW5lZFxuICAgICAgfHwgZG9jdW1lbnQuZG9jdW1lbnRNb2RlID4gNykpIHtcbiAgICAgIC8vIEF0IGxlYXN0IGZvciBub3cgSFRNTDUgaGlzdG9yeSBpcyBhdmFpbGFibGUgZm9yICdtb2Rlcm4nIGJyb3dzZXJzIG9ubHlcbiAgICAgIGlmICh0aGlzLmhpc3RvcnkgPT09IHRydWUpIHtcbiAgICAgICAgLy8gVGhlcmUgaXMgYW4gb2xkIGJ1ZyBpbiBDaHJvbWUgdGhhdCBjYXVzZXMgb25wb3BzdGF0ZSB0byBmaXJlIGV2ZW5cbiAgICAgICAgLy8gdXBvbiBpbml0aWFsIHBhZ2UgbG9hZC4gU2luY2UgdGhlIGhhbmRsZXIgaXMgcnVuIG1hbnVhbGx5IGluIGluaXQoKSxcbiAgICAgICAgLy8gdGhpcyB3b3VsZCBjYXVzZSBDaHJvbWUgdG8gcnVuIGl0IHR3aXNlLiBDdXJyZW50bHkgdGhlIG9ubHlcbiAgICAgICAgLy8gd29ya2Fyb3VuZCBzZWVtcyB0byBiZSB0byBzZXQgdGhlIGhhbmRsZXIgYWZ0ZXIgdGhlIGluaXRpYWwgcGFnZSBsb2FkXG4gICAgICAgIC8vIGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTYzMDQwXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgd2luZG93Lm9ucG9wc3RhdGUgPSBvbmNoYW5nZTtcbiAgICAgICAgfSwgNTAwKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB3aW5kb3cub25oYXNoY2hhbmdlID0gb25jaGFuZ2U7XG4gICAgICB9XG4gICAgICB0aGlzLm1vZGUgPSAnbW9kZXJuJztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvL1xuICAgICAgLy8gSUUgc3VwcG9ydCwgYmFzZWQgb24gYSBjb25jZXB0IGJ5IEVyaWsgQXJ2aWRzb24gLi4uXG4gICAgICAvL1xuICAgICAgdmFyIGZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICBmcmFtZS5pZCA9ICdzdGF0ZS1mcmFtZSc7XG4gICAgICBmcmFtZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChmcmFtZSk7XG4gICAgICB0aGlzLndyaXRlRnJhbWUoJycpO1xuXG4gICAgICBpZiAoJ29ucHJvcGVydHljaGFuZ2UnIGluIGRvY3VtZW50ICYmICdhdHRhY2hFdmVudCcgaW4gZG9jdW1lbnQpIHtcbiAgICAgICAgZG9jdW1lbnQuYXR0YWNoRXZlbnQoJ29ucHJvcGVydHljaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKGV2ZW50LnByb3BlcnR5TmFtZSA9PT0gJ2xvY2F0aW9uJykge1xuICAgICAgICAgICAgc2VsZi5jaGVjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHdpbmRvdy5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7IHNlbGYuY2hlY2soKTsgfSwgNTApO1xuXG4gICAgICB0aGlzLm9uSGFzaENoYW5nZWQgPSBvbmNoYW5nZTtcbiAgICAgIHRoaXMubW9kZSA9ICdsZWdhY3knO1xuICAgIH1cblxuICAgIFJvdXRlci5saXN0ZW5lcnMucHVzaChmbik7XG5cbiAgICByZXR1cm4gdGhpcy5tb2RlO1xuICB9LFxuXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uIChmbikge1xuICAgIGlmICghUm91dGVyIHx8ICFSb3V0ZXIubGlzdGVuZXJzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGxpc3RlbmVycyA9IFJvdXRlci5saXN0ZW5lcnM7XG5cbiAgICBmb3IgKHZhciBpID0gbGlzdGVuZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBpZiAobGlzdGVuZXJzW2ldID09PSBmbikge1xuICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBzZXRIYXNoOiBmdW5jdGlvbiAocykge1xuICAgIC8vIE1vemlsbGEgYWx3YXlzIGFkZHMgYW4gZW50cnkgdG8gdGhlIGhpc3RvcnlcbiAgICBpZiAodGhpcy5tb2RlID09PSAnbGVnYWN5Jykge1xuICAgICAgdGhpcy53cml0ZUZyYW1lKHMpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmhpc3RvcnkgPT09IHRydWUpIHtcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgZG9jdW1lbnQudGl0bGUsIHMpO1xuICAgICAgLy8gRmlyZSBhbiBvbnBvcHN0YXRlIGV2ZW50IG1hbnVhbGx5IHNpbmNlIHB1c2hpbmcgZG9lcyBub3Qgb2J2aW91c2x5XG4gICAgICAvLyB0cmlnZ2VyIHRoZSBwb3AgZXZlbnQuXG4gICAgICB0aGlzLmZpcmUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGxvYy5oYXNoID0gKHNbMF0gPT09ICcvJykgPyBzIDogJy8nICsgcztcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgd3JpdGVGcmFtZTogZnVuY3Rpb24gKHMpIHtcbiAgICAvLyBJRSBzdXBwb3J0Li4uXG4gICAgdmFyIGYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3RhdGUtZnJhbWUnKTtcbiAgICB2YXIgZCA9IGYuY29udGVudERvY3VtZW50IHx8IGYuY29udGVudFdpbmRvdy5kb2N1bWVudDtcbiAgICBkLm9wZW4oKTtcbiAgICBkLndyaXRlKFwiPHNjcmlwdD5faGFzaCA9ICdcIiArIHMgKyBcIic7IG9ubG9hZCA9IHBhcmVudC5saXN0ZW5lci5zeW5jSGFzaDs8c2NyaXB0PlwiKTtcbiAgICBkLmNsb3NlKCk7XG4gIH0sXG5cbiAgc3luY0hhc2g6IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBJRSBzdXBwb3J0Li4uXG4gICAgdmFyIHMgPSB0aGlzLl9oYXNoO1xuICAgIGlmIChzICE9IGRsb2MuaGFzaCkge1xuICAgICAgZGxvYy5oYXNoID0gcztcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgb25IYXNoQ2hhbmdlZDogZnVuY3Rpb24gKCkge31cbn07XG5cbnZhciBSb3V0ZXIgPSBleHBvcnRzLlJvdXRlciA9IGZ1bmN0aW9uIChyb3V0ZXMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJvdXRlcikpIHJldHVybiBuZXcgUm91dGVyKHJvdXRlcyk7XG5cbiAgdGhpcy5wYXJhbXMgICA9IHt9O1xuICB0aGlzLnJvdXRlcyAgID0ge307XG4gIHRoaXMubWV0aG9kcyAgPSBbJ29uJywgJ29uY2UnLCAnYWZ0ZXInLCAnYmVmb3JlJ107XG4gIHRoaXMuc2NvcGUgICAgPSBbXTtcbiAgdGhpcy5fbWV0aG9kcyA9IHt9O1xuXG4gIHRoaXMuX2luc2VydCA9IHRoaXMuaW5zZXJ0O1xuICB0aGlzLmluc2VydCA9IHRoaXMuaW5zZXJ0RXg7XG5cbiAgdGhpcy5oaXN0b3J5U3VwcG9ydCA9ICh3aW5kb3cuaGlzdG9yeSAhPSBudWxsID8gd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlIDogbnVsbCkgIT0gbnVsbFxuXG4gIHRoaXMuY29uZmlndXJlKCk7XG4gIHRoaXMubW91bnQocm91dGVzIHx8IHt9KTtcbn07XG5cblJvdXRlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIChyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5oYW5kbGVyID0gZnVuY3Rpb24ob25DaGFuZ2VFdmVudCkge1xuICAgIHZhciBuZXdVUkwgPSBvbkNoYW5nZUV2ZW50ICYmIG9uQ2hhbmdlRXZlbnQubmV3VVJMIHx8IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgIHZhciB1cmwgPSBzZWxmLmhpc3RvcnkgPT09IHRydWUgPyBzZWxmLmdldFBhdGgoKSA6IG5ld1VSTC5yZXBsYWNlKC8uKiMvLCAnJyk7XG4gICAgc2VsZi5kaXNwYXRjaCgnb24nLCB1cmwuY2hhckF0KDApID09PSAnLycgPyB1cmwgOiAnLycgKyB1cmwpO1xuICB9O1xuXG4gIGxpc3RlbmVyLmluaXQodGhpcy5oYW5kbGVyLCB0aGlzLmhpc3RvcnkpO1xuXG4gIGlmICh0aGlzLmhpc3RvcnkgPT09IGZhbHNlKSB7XG4gICAgaWYgKGRsb2NIYXNoRW1wdHkoKSAmJiByKSB7XG4gICAgICBkbG9jLmhhc2ggPSByO1xuICAgIH0gZWxzZSBpZiAoIWRsb2NIYXNoRW1wdHkoKSkge1xuICAgICAgc2VsZi5kaXNwYXRjaCgnb24nLCAnLycgKyBkbG9jLmhhc2gucmVwbGFjZSgvXigjXFwvfCN8XFwvKS8sICcnKSk7XG4gICAgfVxuICB9XG4gIGVsc2Uge1xuICAgIHZhciByb3V0ZVRvID0gZGxvY0hhc2hFbXB0eSgpICYmIHIgPyByIDogIWRsb2NIYXNoRW1wdHkoKSA/IGRsb2MuaGFzaC5yZXBsYWNlKC9eIy8sICcnKSA6IG51bGw7XG4gICAgaWYgKHJvdXRlVG8pIHtcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgZG9jdW1lbnQudGl0bGUsIHJvdXRlVG8pO1xuICAgIH1cblxuICAgIC8vIFJvdXRlciBoYXMgYmVlbiBpbml0aWFsaXplZCwgYnV0IGR1ZSB0byB0aGUgY2hyb21lIGJ1ZyBpdCB3aWxsIG5vdFxuICAgIC8vIHlldCBhY3R1YWxseSByb3V0ZSBIVE1MNSBoaXN0b3J5IHN0YXRlIGNoYW5nZXMuIFRodXMsIGRlY2lkZSBpZiBzaG91bGQgcm91dGUuXG4gICAgaWYgKHJvdXRlVG8gfHwgdGhpcy5ydW5faW5faW5pdCA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5oYW5kbGVyKCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmV4cGxvZGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2ID0gdGhpcy5oaXN0b3J5ID09PSB0cnVlID8gdGhpcy5nZXRQYXRoKCkgOiBkbG9jLmhhc2g7XG4gIGlmICh2LmNoYXJBdCgxKSA9PT0gJy8nKSB7IHY9di5zbGljZSgxKSB9XG4gIHJldHVybiB2LnNsaWNlKDEsIHYubGVuZ3RoKS5zcGxpdChcIi9cIik7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLnNldFJvdXRlID0gZnVuY3Rpb24gKGksIHYsIHZhbCkge1xuICB2YXIgdXJsID0gdGhpcy5leHBsb2RlKCk7XG5cbiAgaWYgKHR5cGVvZiBpID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgdiA9PT0gJ3N0cmluZycpIHtcbiAgICB1cmxbaV0gPSB2O1xuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgdXJsLnNwbGljZShpLCB2LCBzKTtcbiAgfVxuICBlbHNlIHtcbiAgICB1cmwgPSBbaV07XG4gIH1cblxuICBsaXN0ZW5lci5zZXRIYXNoKHVybC5qb2luKCcvJykpO1xuICByZXR1cm4gdXJsO1xufTtcblxuLy9cbi8vICMjIyBmdW5jdGlvbiBpbnNlcnRFeChtZXRob2QsIHBhdGgsIHJvdXRlLCBwYXJlbnQpXG4vLyAjIyMjIEBtZXRob2Qge3N0cmluZ30gTWV0aG9kIHRvIGluc2VydCB0aGUgc3BlY2lmaWMgYHJvdXRlYC5cbi8vICMjIyMgQHBhdGgge0FycmF5fSBQYXJzZWQgcGF0aCB0byBpbnNlcnQgdGhlIGByb3V0ZWAgYXQuXG4vLyAjIyMjIEByb3V0ZSB7QXJyYXl8ZnVuY3Rpb259IFJvdXRlIGhhbmRsZXJzIHRvIGluc2VydC5cbi8vICMjIyMgQHBhcmVudCB7T2JqZWN0fSAqKk9wdGlvbmFsKiogUGFyZW50IFwicm91dGVzXCIgdG8gaW5zZXJ0IGludG8uXG4vLyBpbnNlcnQgYSBjYWxsYmFjayB0aGF0IHdpbGwgb25seSBvY2N1ciBvbmNlIHBlciB0aGUgbWF0Y2hlZCByb3V0ZS5cbi8vXG5Sb3V0ZXIucHJvdG90eXBlLmluc2VydEV4ID0gZnVuY3Rpb24obWV0aG9kLCBwYXRoLCByb3V0ZSwgcGFyZW50KSB7XG4gIGlmIChtZXRob2QgPT09IFwib25jZVwiKSB7XG4gICAgbWV0aG9kID0gXCJvblwiO1xuICAgIHJvdXRlID0gZnVuY3Rpb24ocm91dGUpIHtcbiAgICAgIHZhciBvbmNlID0gZmFsc2U7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChvbmNlKSByZXR1cm47XG4gICAgICAgIG9uY2UgPSB0cnVlO1xuICAgICAgICByZXR1cm4gcm91dGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfShyb3V0ZSk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuX2luc2VydChtZXRob2QsIHBhdGgsIHJvdXRlLCBwYXJlbnQpO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5nZXRSb3V0ZSA9IGZ1bmN0aW9uICh2KSB7XG4gIHZhciByZXQgPSB2O1xuXG4gIGlmICh0eXBlb2YgdiA9PT0gXCJudW1iZXJcIikge1xuICAgIHJldCA9IHRoaXMuZXhwbG9kZSgpW3ZdO1xuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiB2ID09PSBcInN0cmluZ1wiKXtcbiAgICB2YXIgaCA9IHRoaXMuZXhwbG9kZSgpO1xuICAgIHJldCA9IGguaW5kZXhPZih2KTtcbiAgfVxuICBlbHNlIHtcbiAgICByZXQgPSB0aGlzLmV4cGxvZGUoKTtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gIGxpc3RlbmVyLmRlc3Ryb3kodGhpcy5oYW5kbGVyKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmdldFBhdGggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwYXRoID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lO1xuICBpZiAocGF0aC5zdWJzdHIoMCwgMSkgIT09ICcvJykge1xuICAgIHBhdGggPSAnLycgKyBwYXRoO1xuICB9XG4gIHJldHVybiBwYXRoO1xufTtcbmZ1bmN0aW9uIF9ldmVyeShhcnIsIGl0ZXJhdG9yKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgaWYgKGl0ZXJhdG9yKGFycltpXSwgaSwgYXJyKSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gX2ZsYXR0ZW4oYXJyKSB7XG4gIHZhciBmbGF0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBuID0gYXJyLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgIGZsYXQgPSBmbGF0LmNvbmNhdChhcnJbaV0pO1xuICB9XG4gIHJldHVybiBmbGF0O1xufVxuXG5mdW5jdGlvbiBfYXN5bmNFdmVyeVNlcmllcyhhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICBpZiAoIWFyci5sZW5ndGgpIHtcbiAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgfVxuICB2YXIgY29tcGxldGVkID0gMDtcbiAgKGZ1bmN0aW9uIGl0ZXJhdGUoKSB7XG4gICAgaXRlcmF0b3IoYXJyW2NvbXBsZXRlZF0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVyciB8fCBlcnIgPT09IGZhbHNlKSB7XG4gICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7fTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgICAgICBpZiAoY29tcGxldGVkID09PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVyYXRlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSkoKTtcbn1cblxuZnVuY3Rpb24gcGFyYW1pZnlTdHJpbmcoc3RyLCBwYXJhbXMsIG1vZCkge1xuICBtb2QgPSBzdHI7XG4gIGZvciAodmFyIHBhcmFtIGluIHBhcmFtcykge1xuICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkocGFyYW0pKSB7XG4gICAgICBtb2QgPSBwYXJhbXNbcGFyYW1dKHN0cik7XG4gICAgICBpZiAobW9kICE9PSBzdHIpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBtb2QgPT09IHN0ciA/IFwiKFsuX2EtekEtWjAtOS1dKylcIiA6IG1vZDtcbn1cblxuZnVuY3Rpb24gcmVnaWZ5U3RyaW5nKHN0ciwgcGFyYW1zKSB7XG4gIHZhciBtYXRjaGVzLCBsYXN0ID0gMCwgb3V0ID0gXCJcIjtcbiAgd2hpbGUgKG1hdGNoZXMgPSBzdHIuc3Vic3RyKGxhc3QpLm1hdGNoKC9bXlxcd1xcZFxcLSAlQCZdKlxcKlteXFx3XFxkXFwtICVAJl0qLykpIHtcbiAgICBsYXN0ID0gbWF0Y2hlcy5pbmRleCArIG1hdGNoZXNbMF0ubGVuZ3RoO1xuICAgIG1hdGNoZXNbMF0gPSBtYXRjaGVzWzBdLnJlcGxhY2UoL15cXCovLCBcIihbXy4oKSFcXFxcICVAJmEtekEtWjAtOS1dKylcIik7XG4gICAgb3V0ICs9IHN0ci5zdWJzdHIoMCwgbWF0Y2hlcy5pbmRleCkgKyBtYXRjaGVzWzBdO1xuICB9XG4gIHN0ciA9IG91dCArPSBzdHIuc3Vic3RyKGxhc3QpO1xuICB2YXIgY2FwdHVyZXMgPSBzdHIubWF0Y2goLzooW15cXC9dKykvaWcpLCBjYXB0dXJlLCBsZW5ndGg7XG4gIGlmIChjYXB0dXJlcykge1xuICAgIGxlbmd0aCA9IGNhcHR1cmVzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBjYXB0dXJlID0gY2FwdHVyZXNbaV07XG4gICAgICBpZiAoY2FwdHVyZS5zbGljZSgwLCAyKSA9PT0gXCI6OlwiKSB7XG4gICAgICAgIHN0ciA9IGNhcHR1cmUuc2xpY2UoMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZShjYXB0dXJlLCBwYXJhbWlmeVN0cmluZyhjYXB0dXJlLCBwYXJhbXMpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gdGVybWluYXRvcihyb3V0ZXMsIGRlbGltaXRlciwgc3RhcnQsIHN0b3ApIHtcbiAgdmFyIGxhc3QgPSAwLCBsZWZ0ID0gMCwgcmlnaHQgPSAwLCBzdGFydCA9IChzdGFydCB8fCBcIihcIikudG9TdHJpbmcoKSwgc3RvcCA9IChzdG9wIHx8IFwiKVwiKS50b1N0cmluZygpLCBpO1xuICBmb3IgKGkgPSAwOyBpIDwgcm91dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGNodW5rID0gcm91dGVzW2ldO1xuICAgIGlmIChjaHVuay5pbmRleE9mKHN0YXJ0LCBsYXN0KSA+IGNodW5rLmluZGV4T2Yoc3RvcCwgbGFzdCkgfHwgfmNodW5rLmluZGV4T2Yoc3RhcnQsIGxhc3QpICYmICF+Y2h1bmsuaW5kZXhPZihzdG9wLCBsYXN0KSB8fCAhfmNodW5rLmluZGV4T2Yoc3RhcnQsIGxhc3QpICYmIH5jaHVuay5pbmRleE9mKHN0b3AsIGxhc3QpKSB7XG4gICAgICBsZWZ0ID0gY2h1bmsuaW5kZXhPZihzdGFydCwgbGFzdCk7XG4gICAgICByaWdodCA9IGNodW5rLmluZGV4T2Yoc3RvcCwgbGFzdCk7XG4gICAgICBpZiAofmxlZnQgJiYgIX5yaWdodCB8fCAhfmxlZnQgJiYgfnJpZ2h0KSB7XG4gICAgICAgIHZhciB0bXAgPSByb3V0ZXMuc2xpY2UoMCwgKGkgfHwgMSkgKyAxKS5qb2luKGRlbGltaXRlcik7XG4gICAgICAgIHJvdXRlcyA9IFsgdG1wIF0uY29uY2F0KHJvdXRlcy5zbGljZSgoaSB8fCAxKSArIDEpKTtcbiAgICAgIH1cbiAgICAgIGxhc3QgPSAocmlnaHQgPiBsZWZ0ID8gcmlnaHQgOiBsZWZ0KSArIDE7XG4gICAgICBpID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGFzdCA9IDA7XG4gICAgfVxuICB9XG4gIHJldHVybiByb3V0ZXM7XG59XG5cblJvdXRlci5wcm90b3R5cGUuY29uZmlndXJlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLl9tZXRob2RzW3RoaXMubWV0aG9kc1tpXV0gPSB0cnVlO1xuICB9XG4gIHRoaXMucmVjdXJzZSA9IG9wdGlvbnMucmVjdXJzZSB8fCB0aGlzLnJlY3Vyc2UgfHwgZmFsc2U7XG4gIHRoaXMuYXN5bmMgPSBvcHRpb25zLmFzeW5jIHx8IGZhbHNlO1xuICB0aGlzLmRlbGltaXRlciA9IG9wdGlvbnMuZGVsaW1pdGVyIHx8IFwiL1wiO1xuICB0aGlzLnN0cmljdCA9IHR5cGVvZiBvcHRpb25zLnN0cmljdCA9PT0gXCJ1bmRlZmluZWRcIiA/IHRydWUgOiBvcHRpb25zLnN0cmljdDtcbiAgdGhpcy5ub3Rmb3VuZCA9IG9wdGlvbnMubm90Zm91bmQ7XG4gIHRoaXMucmVzb3VyY2UgPSBvcHRpb25zLnJlc291cmNlO1xuICB0aGlzLmhpc3RvcnkgPSBvcHRpb25zLmh0bWw1aGlzdG9yeSAmJiB0aGlzLmhpc3RvcnlTdXBwb3J0IHx8IGZhbHNlO1xuICB0aGlzLnJ1bl9pbl9pbml0ID0gdGhpcy5oaXN0b3J5ID09PSB0cnVlICYmIG9wdGlvbnMucnVuX2hhbmRsZXJfaW5faW5pdCAhPT0gZmFsc2U7XG4gIHRoaXMuZXZlcnkgPSB7XG4gICAgYWZ0ZXI6IG9wdGlvbnMuYWZ0ZXIgfHwgbnVsbCxcbiAgICBiZWZvcmU6IG9wdGlvbnMuYmVmb3JlIHx8IG51bGwsXG4gICAgb246IG9wdGlvbnMub24gfHwgbnVsbFxuICB9O1xuICByZXR1cm4gdGhpcztcbn07XG5cblJvdXRlci5wcm90b3R5cGUucGFyYW0gPSBmdW5jdGlvbih0b2tlbiwgbWF0Y2hlcikge1xuICBpZiAodG9rZW5bMF0gIT09IFwiOlwiKSB7XG4gICAgdG9rZW4gPSBcIjpcIiArIHRva2VuO1xuICB9XG4gIHZhciBjb21waWxlZCA9IG5ldyBSZWdFeHAodG9rZW4sIFwiZ1wiKTtcbiAgdGhpcy5wYXJhbXNbdG9rZW5dID0gZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKGNvbXBpbGVkLCBtYXRjaGVyLnNvdXJjZSB8fCBtYXRjaGVyKTtcbiAgfTtcbn07XG5cblJvdXRlci5wcm90b3R5cGUub24gPSBSb3V0ZXIucHJvdG90eXBlLnJvdXRlID0gZnVuY3Rpb24obWV0aG9kLCBwYXRoLCByb3V0ZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghcm91dGUgJiYgdHlwZW9mIHBhdGggPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcm91dGUgPSBwYXRoO1xuICAgIHBhdGggPSBtZXRob2Q7XG4gICAgbWV0aG9kID0gXCJvblwiO1xuICB9XG4gIGlmIChBcnJheS5pc0FycmF5KHBhdGgpKSB7XG4gICAgcmV0dXJuIHBhdGguZm9yRWFjaChmdW5jdGlvbihwKSB7XG4gICAgICBzZWxmLm9uKG1ldGhvZCwgcCwgcm91dGUpO1xuICAgIH0pO1xuICB9XG4gIGlmIChwYXRoLnNvdXJjZSkge1xuICAgIHBhdGggPSBwYXRoLnNvdXJjZS5yZXBsYWNlKC9cXFxcXFwvL2lnLCBcIi9cIik7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkobWV0aG9kKSkge1xuICAgIHJldHVybiBtZXRob2QuZm9yRWFjaChmdW5jdGlvbihtKSB7XG4gICAgICBzZWxmLm9uKG0udG9Mb3dlckNhc2UoKSwgcGF0aCwgcm91dGUpO1xuICAgIH0pO1xuICB9XG4gIHBhdGggPSBwYXRoLnNwbGl0KG5ldyBSZWdFeHAodGhpcy5kZWxpbWl0ZXIpKTtcbiAgcGF0aCA9IHRlcm1pbmF0b3IocGF0aCwgdGhpcy5kZWxpbWl0ZXIpO1xuICB0aGlzLmluc2VydChtZXRob2QsIHRoaXMuc2NvcGUuY29uY2F0KHBhdGgpLCByb3V0ZSk7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmRpc3BhdGNoID0gZnVuY3Rpb24obWV0aG9kLCBwYXRoLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXMsIGZucyA9IHRoaXMudHJhdmVyc2UobWV0aG9kLCBwYXRoLCB0aGlzLnJvdXRlcywgXCJcIiksIGludm9rZWQgPSB0aGlzLl9pbnZva2VkLCBhZnRlcjtcbiAgdGhpcy5faW52b2tlZCA9IHRydWU7XG4gIGlmICghZm5zIHx8IGZucy5sZW5ndGggPT09IDApIHtcbiAgICB0aGlzLmxhc3QgPSBbXTtcbiAgICBpZiAodHlwZW9mIHRoaXMubm90Zm91bmQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5pbnZva2UoWyB0aGlzLm5vdGZvdW5kIF0sIHtcbiAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICh0aGlzLnJlY3Vyc2UgPT09IFwiZm9yd2FyZFwiKSB7XG4gICAgZm5zID0gZm5zLnJldmVyc2UoKTtcbiAgfVxuICBmdW5jdGlvbiB1cGRhdGVBbmRJbnZva2UoKSB7XG4gICAgc2VsZi5sYXN0ID0gZm5zLmFmdGVyO1xuICAgIHNlbGYuaW52b2tlKHNlbGYucnVubGlzdChmbnMpLCBzZWxmLCBjYWxsYmFjayk7XG4gIH1cbiAgYWZ0ZXIgPSB0aGlzLmV2ZXJ5ICYmIHRoaXMuZXZlcnkuYWZ0ZXIgPyBbIHRoaXMuZXZlcnkuYWZ0ZXIgXS5jb25jYXQodGhpcy5sYXN0KSA6IFsgdGhpcy5sYXN0IF07XG4gIGlmIChhZnRlciAmJiBhZnRlci5sZW5ndGggPiAwICYmIGludm9rZWQpIHtcbiAgICBpZiAodGhpcy5hc3luYykge1xuICAgICAgdGhpcy5pbnZva2UoYWZ0ZXIsIHRoaXMsIHVwZGF0ZUFuZEludm9rZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaW52b2tlKGFmdGVyLCB0aGlzKTtcbiAgICAgIHVwZGF0ZUFuZEludm9rZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICB1cGRhdGVBbmRJbnZva2UoKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmludm9rZSA9IGZ1bmN0aW9uKGZucywgdGhpc0FyZywgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgYXBwbHk7XG4gIGlmICh0aGlzLmFzeW5jKSB7XG4gICAgYXBwbHkgPSBmdW5jdGlvbihmbiwgbmV4dCkge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZm4pKSB7XG4gICAgICAgIHJldHVybiBfYXN5bmNFdmVyeVNlcmllcyhmbiwgYXBwbHksIG5leHQpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGZuLmFwcGx5KHRoaXNBcmcsIGZucy5jYXB0dXJlcy5jb25jYXQobmV4dCkpO1xuICAgICAgfVxuICAgIH07XG4gICAgX2FzeW5jRXZlcnlTZXJpZXMoZm5zLCBhcHBseSwgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2suYXBwbHkodGhpc0FyZywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBhcHBseSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShmbikpIHtcbiAgICAgICAgcmV0dXJuIF9ldmVyeShmbiwgYXBwbHkpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpc0FyZywgZm5zLmNhcHR1cmVzIHx8IFtdKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZuID09PSBcInN0cmluZ1wiICYmIHNlbGYucmVzb3VyY2UpIHtcbiAgICAgICAgc2VsZi5yZXNvdXJjZVtmbl0uYXBwbHkodGhpc0FyZywgZm5zLmNhcHR1cmVzIHx8IFtdKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIF9ldmVyeShmbnMsIGFwcGx5KTtcbiAgfVxufTtcblxuUm91dGVyLnByb3RvdHlwZS50cmF2ZXJzZSA9IGZ1bmN0aW9uKG1ldGhvZCwgcGF0aCwgcm91dGVzLCByZWdleHAsIGZpbHRlcikge1xuICB2YXIgZm5zID0gW10sIGN1cnJlbnQsIGV4YWN0LCBtYXRjaCwgbmV4dCwgdGhhdDtcbiAgZnVuY3Rpb24gZmlsdGVyUm91dGVzKHJvdXRlcykge1xuICAgIGlmICghZmlsdGVyKSB7XG4gICAgICByZXR1cm4gcm91dGVzO1xuICAgIH1cbiAgICBmdW5jdGlvbiBkZWVwQ29weShzb3VyY2UpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc291cmNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHJlc3VsdFtpXSA9IEFycmF5LmlzQXJyYXkoc291cmNlW2ldKSA/IGRlZXBDb3B5KHNvdXJjZVtpXSkgOiBzb3VyY2VbaV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBhcHBseUZpbHRlcihmbnMpIHtcbiAgICAgIGZvciAodmFyIGkgPSBmbnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZm5zW2ldKSkge1xuICAgICAgICAgIGFwcGx5RmlsdGVyKGZuc1tpXSk7XG4gICAgICAgICAgaWYgKGZuc1tpXS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghZmlsdGVyKGZuc1tpXSkpIHtcbiAgICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBuZXdSb3V0ZXMgPSBkZWVwQ29weShyb3V0ZXMpO1xuICAgIG5ld1JvdXRlcy5tYXRjaGVkID0gcm91dGVzLm1hdGNoZWQ7XG4gICAgbmV3Um91dGVzLmNhcHR1cmVzID0gcm91dGVzLmNhcHR1cmVzO1xuICAgIG5ld1JvdXRlcy5hZnRlciA9IHJvdXRlcy5hZnRlci5maWx0ZXIoZmlsdGVyKTtcbiAgICBhcHBseUZpbHRlcihuZXdSb3V0ZXMpO1xuICAgIHJldHVybiBuZXdSb3V0ZXM7XG4gIH1cbiAgaWYgKHBhdGggPT09IHRoaXMuZGVsaW1pdGVyICYmIHJvdXRlc1ttZXRob2RdKSB7XG4gICAgbmV4dCA9IFsgWyByb3V0ZXMuYmVmb3JlLCByb3V0ZXNbbWV0aG9kXSBdLmZpbHRlcihCb29sZWFuKSBdO1xuICAgIG5leHQuYWZ0ZXIgPSBbIHJvdXRlcy5hZnRlciBdLmZpbHRlcihCb29sZWFuKTtcbiAgICBuZXh0Lm1hdGNoZWQgPSB0cnVlO1xuICAgIG5leHQuY2FwdHVyZXMgPSBbXTtcbiAgICByZXR1cm4gZmlsdGVyUm91dGVzKG5leHQpO1xuICB9XG4gIGZvciAodmFyIHIgaW4gcm91dGVzKSB7XG4gICAgaWYgKHJvdXRlcy5oYXNPd25Qcm9wZXJ0eShyKSAmJiAoIXRoaXMuX21ldGhvZHNbcl0gfHwgdGhpcy5fbWV0aG9kc1tyXSAmJiB0eXBlb2Ygcm91dGVzW3JdID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHJvdXRlc1tyXSkpKSB7XG4gICAgICBjdXJyZW50ID0gZXhhY3QgPSByZWdleHAgKyB0aGlzLmRlbGltaXRlciArIHI7XG4gICAgICBpZiAoIXRoaXMuc3RyaWN0KSB7XG4gICAgICAgIGV4YWN0ICs9IFwiW1wiICsgdGhpcy5kZWxpbWl0ZXIgKyBcIl0/XCI7XG4gICAgICB9XG4gICAgICBtYXRjaCA9IHBhdGgubWF0Y2gobmV3IFJlZ0V4cChcIl5cIiArIGV4YWN0KSk7XG4gICAgICBpZiAoIW1hdGNoKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG1hdGNoWzBdICYmIG1hdGNoWzBdID09IHBhdGggJiYgcm91dGVzW3JdW21ldGhvZF0pIHtcbiAgICAgICAgbmV4dCA9IFsgWyByb3V0ZXNbcl0uYmVmb3JlLCByb3V0ZXNbcl1bbWV0aG9kXSBdLmZpbHRlcihCb29sZWFuKSBdO1xuICAgICAgICBuZXh0LmFmdGVyID0gWyByb3V0ZXNbcl0uYWZ0ZXIgXS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgIG5leHQubWF0Y2hlZCA9IHRydWU7XG4gICAgICAgIG5leHQuY2FwdHVyZXMgPSBtYXRjaC5zbGljZSgxKTtcbiAgICAgICAgaWYgKHRoaXMucmVjdXJzZSAmJiByb3V0ZXMgPT09IHRoaXMucm91dGVzKSB7XG4gICAgICAgICAgbmV4dC5wdXNoKFsgcm91dGVzLmJlZm9yZSwgcm91dGVzLm9uIF0uZmlsdGVyKEJvb2xlYW4pKTtcbiAgICAgICAgICBuZXh0LmFmdGVyID0gbmV4dC5hZnRlci5jb25jYXQoWyByb3V0ZXMuYWZ0ZXIgXS5maWx0ZXIoQm9vbGVhbikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWx0ZXJSb3V0ZXMobmV4dCk7XG4gICAgICB9XG4gICAgICBuZXh0ID0gdGhpcy50cmF2ZXJzZShtZXRob2QsIHBhdGgsIHJvdXRlc1tyXSwgY3VycmVudCk7XG4gICAgICBpZiAobmV4dC5tYXRjaGVkKSB7XG4gICAgICAgIGlmIChuZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmbnMgPSBmbnMuY29uY2F0KG5leHQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnJlY3Vyc2UpIHtcbiAgICAgICAgICBmbnMucHVzaChbIHJvdXRlc1tyXS5iZWZvcmUsIHJvdXRlc1tyXS5vbiBdLmZpbHRlcihCb29sZWFuKSk7XG4gICAgICAgICAgbmV4dC5hZnRlciA9IG5leHQuYWZ0ZXIuY29uY2F0KFsgcm91dGVzW3JdLmFmdGVyIF0uZmlsdGVyKEJvb2xlYW4pKTtcbiAgICAgICAgICBpZiAocm91dGVzID09PSB0aGlzLnJvdXRlcykge1xuICAgICAgICAgICAgZm5zLnB1c2goWyByb3V0ZXNbXCJiZWZvcmVcIl0sIHJvdXRlc1tcIm9uXCJdIF0uZmlsdGVyKEJvb2xlYW4pKTtcbiAgICAgICAgICAgIG5leHQuYWZ0ZXIgPSBuZXh0LmFmdGVyLmNvbmNhdChbIHJvdXRlc1tcImFmdGVyXCJdIF0uZmlsdGVyKEJvb2xlYW4pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm5zLm1hdGNoZWQgPSB0cnVlO1xuICAgICAgICBmbnMuY2FwdHVyZXMgPSBuZXh0LmNhcHR1cmVzO1xuICAgICAgICBmbnMuYWZ0ZXIgPSBuZXh0LmFmdGVyO1xuICAgICAgICByZXR1cm4gZmlsdGVyUm91dGVzKGZucyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cblJvdXRlci5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24obWV0aG9kLCBwYXRoLCByb3V0ZSwgcGFyZW50KSB7XG4gIHZhciBtZXRob2RUeXBlLCBwYXJlbnRUeXBlLCBpc0FycmF5LCBuZXN0ZWQsIHBhcnQ7XG4gIHBhdGggPSBwYXRoLmZpbHRlcihmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuIHAgJiYgcC5sZW5ndGggPiAwO1xuICB9KTtcbiAgcGFyZW50ID0gcGFyZW50IHx8IHRoaXMucm91dGVzO1xuICBwYXJ0ID0gcGF0aC5zaGlmdCgpO1xuICBpZiAoL1xcOnxcXCovLnRlc3QocGFydCkgJiYgIS9cXFxcZHxcXFxcdy8udGVzdChwYXJ0KSkge1xuICAgIHBhcnQgPSByZWdpZnlTdHJpbmcocGFydCwgdGhpcy5wYXJhbXMpO1xuICB9XG4gIGlmIChwYXRoLmxlbmd0aCA+IDApIHtcbiAgICBwYXJlbnRbcGFydF0gPSBwYXJlbnRbcGFydF0gfHwge307XG4gICAgcmV0dXJuIHRoaXMuaW5zZXJ0KG1ldGhvZCwgcGF0aCwgcm91dGUsIHBhcmVudFtwYXJ0XSk7XG4gIH1cbiAgaWYgKCFwYXJ0ICYmICFwYXRoLmxlbmd0aCAmJiBwYXJlbnQgPT09IHRoaXMucm91dGVzKSB7XG4gICAgbWV0aG9kVHlwZSA9IHR5cGVvZiBwYXJlbnRbbWV0aG9kXTtcbiAgICBzd2l0Y2ggKG1ldGhvZFR5cGUpIHtcbiAgICAgY2FzZSBcImZ1bmN0aW9uXCI6XG4gICAgICBwYXJlbnRbbWV0aG9kXSA9IFsgcGFyZW50W21ldGhvZF0sIHJvdXRlIF07XG4gICAgICByZXR1cm47XG4gICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgIHBhcmVudFttZXRob2RdLnB1c2gocm91dGUpO1xuICAgICAgcmV0dXJuO1xuICAgICBjYXNlIFwidW5kZWZpbmVkXCI6XG4gICAgICBwYXJlbnRbbWV0aG9kXSA9IHJvdXRlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cbiAgcGFyZW50VHlwZSA9IHR5cGVvZiBwYXJlbnRbcGFydF07XG4gIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5KHBhcmVudFtwYXJ0XSk7XG4gIGlmIChwYXJlbnRbcGFydF0gJiYgIWlzQXJyYXkgJiYgcGFyZW50VHlwZSA9PSBcIm9iamVjdFwiKSB7XG4gICAgbWV0aG9kVHlwZSA9IHR5cGVvZiBwYXJlbnRbcGFydF1bbWV0aG9kXTtcbiAgICBzd2l0Y2ggKG1ldGhvZFR5cGUpIHtcbiAgICAgY2FzZSBcImZ1bmN0aW9uXCI6XG4gICAgICBwYXJlbnRbcGFydF1bbWV0aG9kXSA9IFsgcGFyZW50W3BhcnRdW21ldGhvZF0sIHJvdXRlIF07XG4gICAgICByZXR1cm47XG4gICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgIHBhcmVudFtwYXJ0XVttZXRob2RdLnB1c2gocm91dGUpO1xuICAgICAgcmV0dXJuO1xuICAgICBjYXNlIFwidW5kZWZpbmVkXCI6XG4gICAgICBwYXJlbnRbcGFydF1bbWV0aG9kXSA9IHJvdXRlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSBlbHNlIGlmIChwYXJlbnRUeXBlID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBuZXN0ZWQgPSB7fTtcbiAgICBuZXN0ZWRbbWV0aG9kXSA9IHJvdXRlO1xuICAgIHBhcmVudFtwYXJ0XSA9IG5lc3RlZDtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCByb3V0ZSBjb250ZXh0OiBcIiArIHBhcmVudFR5cGUpO1xufTtcblxuXG5cblJvdXRlci5wcm90b3R5cGUuZXh0ZW5kID0gZnVuY3Rpb24obWV0aG9kcykge1xuICB2YXIgc2VsZiA9IHRoaXMsIGxlbiA9IG1ldGhvZHMubGVuZ3RoLCBpO1xuICBmdW5jdGlvbiBleHRlbmQobWV0aG9kKSB7XG4gICAgc2VsZi5fbWV0aG9kc1ttZXRob2RdID0gdHJ1ZTtcbiAgICBzZWxmW21ldGhvZF0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBleHRyYSA9IGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBbIG1ldGhvZCwgXCJcIiBdIDogWyBtZXRob2QgXTtcbiAgICAgIHNlbGYub24uYXBwbHkoc2VsZiwgZXh0cmEuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9O1xuICB9XG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGV4dGVuZChtZXRob2RzW2ldKTtcbiAgfVxufTtcblxuUm91dGVyLnByb3RvdHlwZS5ydW5saXN0ID0gZnVuY3Rpb24oZm5zKSB7XG4gIHZhciBydW5saXN0ID0gdGhpcy5ldmVyeSAmJiB0aGlzLmV2ZXJ5LmJlZm9yZSA/IFsgdGhpcy5ldmVyeS5iZWZvcmUgXS5jb25jYXQoX2ZsYXR0ZW4oZm5zKSkgOiBfZmxhdHRlbihmbnMpO1xuICBpZiAodGhpcy5ldmVyeSAmJiB0aGlzLmV2ZXJ5Lm9uKSB7XG4gICAgcnVubGlzdC5wdXNoKHRoaXMuZXZlcnkub24pO1xuICB9XG4gIHJ1bmxpc3QuY2FwdHVyZXMgPSBmbnMuY2FwdHVyZXM7XG4gIHJ1bmxpc3Quc291cmNlID0gZm5zLnNvdXJjZTtcbiAgcmV0dXJuIHJ1bmxpc3Q7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24ocm91dGVzLCBwYXRoKSB7XG4gIGlmICghcm91dGVzIHx8IHR5cGVvZiByb3V0ZXMgIT09IFwib2JqZWN0XCIgfHwgQXJyYXkuaXNBcnJheShyb3V0ZXMpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcGF0aCA9IHBhdGggfHwgW107XG4gIGlmICghQXJyYXkuaXNBcnJheShwYXRoKSkge1xuICAgIHBhdGggPSBwYXRoLnNwbGl0KHNlbGYuZGVsaW1pdGVyKTtcbiAgfVxuICBmdW5jdGlvbiBpbnNlcnRPck1vdW50KHJvdXRlLCBsb2NhbCkge1xuICAgIHZhciByZW5hbWUgPSByb3V0ZSwgcGFydHMgPSByb3V0ZS5zcGxpdChzZWxmLmRlbGltaXRlciksIHJvdXRlVHlwZSA9IHR5cGVvZiByb3V0ZXNbcm91dGVdLCBpc1JvdXRlID0gcGFydHNbMF0gPT09IFwiXCIgfHwgIXNlbGYuX21ldGhvZHNbcGFydHNbMF1dLCBldmVudCA9IGlzUm91dGUgPyBcIm9uXCIgOiByZW5hbWU7XG4gICAgaWYgKGlzUm91dGUpIHtcbiAgICAgIHJlbmFtZSA9IHJlbmFtZS5zbGljZSgocmVuYW1lLm1hdGNoKG5ldyBSZWdFeHAoXCJeXCIgKyBzZWxmLmRlbGltaXRlcikpIHx8IFsgXCJcIiBdKVswXS5sZW5ndGgpO1xuICAgICAgcGFydHMuc2hpZnQoKTtcbiAgICB9XG4gICAgaWYgKGlzUm91dGUgJiYgcm91dGVUeXBlID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHJvdXRlc1tyb3V0ZV0pKSB7XG4gICAgICBsb2NhbCA9IGxvY2FsLmNvbmNhdChwYXJ0cyk7XG4gICAgICBzZWxmLm1vdW50KHJvdXRlc1tyb3V0ZV0sIGxvY2FsKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGlzUm91dGUpIHtcbiAgICAgIGxvY2FsID0gbG9jYWwuY29uY2F0KHJlbmFtZS5zcGxpdChzZWxmLmRlbGltaXRlcikpO1xuICAgICAgbG9jYWwgPSB0ZXJtaW5hdG9yKGxvY2FsLCBzZWxmLmRlbGltaXRlcik7XG4gICAgfVxuICAgIHNlbGYuaW5zZXJ0KGV2ZW50LCBsb2NhbCwgcm91dGVzW3JvdXRlXSk7XG4gIH1cbiAgZm9yICh2YXIgcm91dGUgaW4gcm91dGVzKSB7XG4gICAgaWYgKHJvdXRlcy5oYXNPd25Qcm9wZXJ0eShyb3V0ZSkpIHtcbiAgICAgIGluc2VydE9yTW91bnQocm91dGUsIHBhdGguc2xpY2UoMCkpO1xuICAgIH1cbiAgfVxufTtcblxuXG5cbn0odHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIgPyBleHBvcnRzIDogd2luZG93KSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoXCIuL3Byb21pc2UvcHJvbWlzZVwiKS5Qcm9taXNlO1xudmFyIHBvbHlmaWxsID0gcmVxdWlyZShcIi4vcHJvbWlzZS9wb2x5ZmlsbFwiKS5wb2x5ZmlsbDtcbmV4cG9ydHMuUHJvbWlzZSA9IFByb21pc2U7XG5leHBvcnRzLnBvbHlmaWxsID0gcG9seWZpbGw7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKiBnbG9iYWwgdG9TdHJpbmcgKi9cblxudmFyIGlzQXJyYXkgPSByZXF1aXJlKFwiLi91dGlsc1wiKS5pc0FycmF5O1xudmFyIGlzRnVuY3Rpb24gPSByZXF1aXJlKFwiLi91dGlsc1wiKS5pc0Z1bmN0aW9uO1xuXG4vKipcbiAgUmV0dXJucyBhIHByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2hlbiBhbGwgdGhlIGdpdmVuIHByb21pc2VzIGhhdmUgYmVlblxuICBmdWxmaWxsZWQsIG9yIHJlamVjdGVkIGlmIGFueSBvZiB0aGVtIGJlY29tZSByZWplY3RlZC4gVGhlIHJldHVybiBwcm9taXNlXG4gIGlzIGZ1bGZpbGxlZCB3aXRoIGFuIGFycmF5IHRoYXQgZ2l2ZXMgYWxsIHRoZSB2YWx1ZXMgaW4gdGhlIG9yZGVyIHRoZXkgd2VyZVxuICBwYXNzZWQgaW4gdGhlIGBwcm9taXNlc2AgYXJyYXkgYXJndW1lbnQuXG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIHZhciBwcm9taXNlMSA9IFJTVlAucmVzb2x2ZSgxKTtcbiAgdmFyIHByb21pc2UyID0gUlNWUC5yZXNvbHZlKDIpO1xuICB2YXIgcHJvbWlzZTMgPSBSU1ZQLnJlc29sdmUoMyk7XG4gIHZhciBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFJTVlAuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBUaGUgYXJyYXkgaGVyZSB3b3VsZCBiZSBbIDEsIDIsIDMgXTtcbiAgfSk7XG4gIGBgYFxuXG4gIElmIGFueSBvZiB0aGUgYHByb21pc2VzYCBnaXZlbiB0byBgUlNWUC5hbGxgIGFyZSByZWplY3RlZCwgdGhlIGZpcnN0IHByb21pc2VcbiAgdGhhdCBpcyByZWplY3RlZCB3aWxsIGJlIGdpdmVuIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSByZXR1cm5lZCBwcm9taXNlcydzXG4gIHJlamVjdGlvbiBoYW5kbGVyLiBGb3IgZXhhbXBsZTpcblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgdmFyIHByb21pc2UxID0gUlNWUC5yZXNvbHZlKDEpO1xuICB2YXIgcHJvbWlzZTIgPSBSU1ZQLnJlamVjdChuZXcgRXJyb3IoXCIyXCIpKTtcbiAgdmFyIHByb21pc2UzID0gUlNWUC5yZWplY3QobmV3IEVycm9yKFwiM1wiKSk7XG4gIHZhciBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFJTVlAuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBDb2RlIGhlcmUgbmV2ZXIgcnVucyBiZWNhdXNlIHRoZXJlIGFyZSByZWplY3RlZCBwcm9taXNlcyFcbiAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAvLyBlcnJvci5tZXNzYWdlID09PSBcIjJcIlxuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCBhbGxcbiAgQGZvciBSU1ZQXG4gIEBwYXJhbSB7QXJyYXl9IHByb21pc2VzXG4gIEBwYXJhbSB7U3RyaW5nfSBsYWJlbFxuICBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIGBwcm9taXNlc2AgaGF2ZSBiZWVuXG4gIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQgaWYgYW55IG9mIHRoZW0gYmVjb21lIHJlamVjdGVkLlxuKi9cbmZ1bmN0aW9uIGFsbChwcm9taXNlcykge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICB2YXIgUHJvbWlzZSA9IHRoaXM7XG5cbiAgaWYgKCFpc0FycmF5KHByb21pc2VzKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gYWxsLicpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciByZXN1bHRzID0gW10sIHJlbWFpbmluZyA9IHByb21pc2VzLmxlbmd0aCxcbiAgICBwcm9taXNlO1xuXG4gICAgaWYgKHJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgcmVzb2x2ZShbXSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZXIoaW5kZXgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICByZXNvbHZlQWxsKGluZGV4LCB2YWx1ZSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc29sdmVBbGwoaW5kZXgsIHZhbHVlKSB7XG4gICAgICByZXN1bHRzW2luZGV4XSA9IHZhbHVlO1xuICAgICAgaWYgKC0tcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgIHJlc29sdmUocmVzdWx0cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9taXNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgcHJvbWlzZSA9IHByb21pc2VzW2ldO1xuXG4gICAgICBpZiAocHJvbWlzZSAmJiBpc0Z1bmN0aW9uKHByb21pc2UudGhlbikpIHtcbiAgICAgICAgcHJvbWlzZS50aGVuKHJlc29sdmVyKGkpLCByZWplY3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZUFsbChpLCBwcm9taXNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG5leHBvcnRzLmFsbCA9IGFsbDsiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcblwidXNlIHN0cmljdFwiO1xudmFyIGJyb3dzZXJHbG9iYWwgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpID8gd2luZG93IDoge307XG52YXIgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSBicm93c2VyR2xvYmFsLk11dGF0aW9uT2JzZXJ2ZXIgfHwgYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xudmFyIGxvY2FsID0gKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSA/IGdsb2JhbCA6ICh0aGlzID09PSB1bmRlZmluZWQ/IHdpbmRvdzp0aGlzKTtcblxuLy8gbm9kZVxuZnVuY3Rpb24gdXNlTmV4dFRpY2soKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXNlTXV0YXRpb25PYnNlcnZlcigpIHtcbiAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7IGNoYXJhY3RlckRhdGE6IHRydWUgfSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVzZVNldFRpbWVvdXQoKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBsb2NhbC5zZXRUaW1lb3V0KGZsdXNoLCAxKTtcbiAgfTtcbn1cblxudmFyIHF1ZXVlID0gW107XG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgIHZhciB0dXBsZSA9IHF1ZXVlW2ldO1xuICAgIHZhciBjYWxsYmFjayA9IHR1cGxlWzBdLCBhcmcgPSB0dXBsZVsxXTtcbiAgICBjYWxsYmFjayhhcmcpO1xuICB9XG4gIHF1ZXVlID0gW107XG59XG5cbnZhciBzY2hlZHVsZUZsdXNoO1xuXG4vLyBEZWNpZGUgd2hhdCBhc3luYyBtZXRob2QgdG8gdXNlIHRvIHRyaWdnZXJpbmcgcHJvY2Vzc2luZyBvZiBxdWV1ZWQgY2FsbGJhY2tzOlxuaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU5leHRUaWNrKCk7XG59IGVsc2UgaWYgKEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG59IGVsc2Uge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlU2V0VGltZW91dCgpO1xufVxuXG5mdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgdmFyIGxlbmd0aCA9IHF1ZXVlLnB1c2goW2NhbGxiYWNrLCBhcmddKTtcbiAgaWYgKGxlbmd0aCA9PT0gMSkge1xuICAgIC8vIElmIGxlbmd0aCBpcyAxLCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBzY2hlZHVsZSBhbiBhc3luYyBmbHVzaC5cbiAgICAvLyBJZiBhZGRpdGlvbmFsIGNhbGxiYWNrcyBhcmUgcXVldWVkIGJlZm9yZSB0aGUgcXVldWUgaXMgZmx1c2hlZCwgdGhleVxuICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICBzY2hlZHVsZUZsdXNoKCk7XG4gIH1cbn1cblxuZXhwb3J0cy5hc2FwID0gYXNhcDtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgY29uZmlnID0ge1xuICBpbnN0cnVtZW50OiBmYWxzZVxufTtcblxuZnVuY3Rpb24gY29uZmlndXJlKG5hbWUsIHZhbHVlKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgY29uZmlnW25hbWVdID0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGNvbmZpZ1tuYW1lXTtcbiAgfVxufVxuXG5leHBvcnRzLmNvbmZpZyA9IGNvbmZpZztcbmV4cG9ydHMuY29uZmlndXJlID0gY29uZmlndXJlOyIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcblwidXNlIHN0cmljdFwiO1xuLypnbG9iYWwgc2VsZiovXG52YXIgUlNWUFByb21pc2UgPSByZXF1aXJlKFwiLi9wcm9taXNlXCIpLlByb21pc2U7XG52YXIgaXNGdW5jdGlvbiA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpLmlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICB2YXIgbG9jYWw7XG5cbiAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbG9jYWwgPSBnbG9iYWw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmRvY3VtZW50KSB7XG4gICAgbG9jYWwgPSB3aW5kb3c7XG4gIH0gZWxzZSB7XG4gICAgbG9jYWwgPSBzZWxmO1xuICB9XG5cbiAgdmFyIGVzNlByb21pc2VTdXBwb3J0ID0gXG4gICAgXCJQcm9taXNlXCIgaW4gbG9jYWwgJiZcbiAgICAvLyBTb21lIG9mIHRoZXNlIG1ldGhvZHMgYXJlIG1pc3NpbmcgZnJvbVxuICAgIC8vIEZpcmVmb3gvQ2hyb21lIGV4cGVyaW1lbnRhbCBpbXBsZW1lbnRhdGlvbnNcbiAgICBcInJlc29sdmVcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgXCJyZWplY3RcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgXCJhbGxcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgXCJyYWNlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgIC8vIE9sZGVyIHZlcnNpb24gb2YgdGhlIHNwZWMgaGFkIGEgcmVzb2x2ZXIgb2JqZWN0XG4gICAgLy8gYXMgdGhlIGFyZyByYXRoZXIgdGhhbiBhIGZ1bmN0aW9uXG4gICAgKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlc29sdmU7XG4gICAgICBuZXcgbG9jYWwuUHJvbWlzZShmdW5jdGlvbihyKSB7IHJlc29sdmUgPSByOyB9KTtcbiAgICAgIHJldHVybiBpc0Z1bmN0aW9uKHJlc29sdmUpO1xuICAgIH0oKSk7XG5cbiAgaWYgKCFlczZQcm9taXNlU3VwcG9ydCkge1xuICAgIGxvY2FsLlByb21pc2UgPSBSU1ZQUHJvbWlzZTtcbiAgfVxufVxuXG5leHBvcnRzLnBvbHlmaWxsID0gcG9seWZpbGw7XG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBjb25maWcgPSByZXF1aXJlKFwiLi9jb25maWdcIikuY29uZmlnO1xudmFyIGNvbmZpZ3VyZSA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKS5jb25maWd1cmU7XG52YXIgb2JqZWN0T3JGdW5jdGlvbiA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpLm9iamVjdE9yRnVuY3Rpb247XG52YXIgaXNGdW5jdGlvbiA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpLmlzRnVuY3Rpb247XG52YXIgbm93ID0gcmVxdWlyZShcIi4vdXRpbHNcIikubm93O1xudmFyIGFsbCA9IHJlcXVpcmUoXCIuL2FsbFwiKS5hbGw7XG52YXIgcmFjZSA9IHJlcXVpcmUoXCIuL3JhY2VcIikucmFjZTtcbnZhciBzdGF0aWNSZXNvbHZlID0gcmVxdWlyZShcIi4vcmVzb2x2ZVwiKS5yZXNvbHZlO1xudmFyIHN0YXRpY1JlamVjdCA9IHJlcXVpcmUoXCIuL3JlamVjdFwiKS5yZWplY3Q7XG52YXIgYXNhcCA9IHJlcXVpcmUoXCIuL2FzYXBcIikuYXNhcDtcblxudmFyIGNvdW50ZXIgPSAwO1xuXG5jb25maWcuYXN5bmMgPSBhc2FwOyAvLyBkZWZhdWx0IGFzeW5jIGlzIGFzYXA7XG5cbmZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKHJlc29sdmVyKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgfVxuXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQcm9taXNlKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdQcm9taXNlJzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3IsIHRoaXMgb2JqZWN0IGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvbi5cIik7XG4gIH1cblxuICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gIGludm9rZVJlc29sdmVyKHJlc29sdmVyLCB0aGlzKTtcbn1cblxuZnVuY3Rpb24gaW52b2tlUmVzb2x2ZXIocmVzb2x2ZXIsIHByb21pc2UpIHtcbiAgZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpIHtcbiAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gIH1cblxuICB0cnkge1xuICAgIHJlc29sdmVyKHJlc29sdmVQcm9taXNlLCByZWplY3RQcm9taXNlKTtcbiAgfSBjYXRjaChlKSB7XG4gICAgcmVqZWN0UHJvbWlzZShlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gIHZhciBoYXNDYWxsYmFjayA9IGlzRnVuY3Rpb24oY2FsbGJhY2spLFxuICAgICAgdmFsdWUsIGVycm9yLCBzdWNjZWVkZWQsIGZhaWxlZDtcblxuICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICB0cnkge1xuICAgICAgdmFsdWUgPSBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIGZhaWxlZCA9IHRydWU7XG4gICAgICBlcnJvciA9IGU7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhbHVlID0gZGV0YWlsO1xuICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gIH1cblxuICBpZiAoaGFuZGxlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpKSB7XG4gICAgcmV0dXJuO1xuICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gRlVMRklMTEVEKSB7XG4gICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gUkVKRUNURUQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbnZhciBQRU5ESU5HICAgPSB2b2lkIDA7XG52YXIgU0VBTEVEICAgID0gMDtcbnZhciBGVUxGSUxMRUQgPSAxO1xudmFyIFJFSkVDVEVEICA9IDI7XG5cbmZ1bmN0aW9uIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgc3Vic2NyaWJlcnMgPSBwYXJlbnQuX3N1YnNjcmliZXJzO1xuICB2YXIgbGVuZ3RoID0gc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG4gIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgRlVMRklMTEVEXSA9IG9uRnVsZmlsbG1lbnQ7XG4gIHN1YnNjcmliZXJzW2xlbmd0aCArIFJFSkVDVEVEXSAgPSBvblJlamVjdGlvbjtcbn1cblxuZnVuY3Rpb24gcHVibGlzaChwcm9taXNlLCBzZXR0bGVkKSB7XG4gIHZhciBjaGlsZCwgY2FsbGJhY2ssIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnMsIGRldGFpbCA9IHByb21pc2UuX2RldGFpbDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICBjYWxsYmFjayA9IHN1YnNjcmliZXJzW2kgKyBzZXR0bGVkXTtcblxuICAgIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgfVxuXG4gIHByb21pc2UuX3N1YnNjcmliZXJzID0gbnVsbDtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBQcm9taXNlLFxuXG4gIF9zdGF0ZTogdW5kZWZpbmVkLFxuICBfZGV0YWlsOiB1bmRlZmluZWQsXG4gIF9zdWJzY3JpYmVyczogdW5kZWZpbmVkLFxuXG4gIHRoZW46IGZ1bmN0aW9uKG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuXG4gICAgdmFyIHRoZW5Qcm9taXNlID0gbmV3IHRoaXMuY29uc3RydWN0b3IoZnVuY3Rpb24oKSB7fSk7XG5cbiAgICBpZiAodGhpcy5fc3RhdGUpIHtcbiAgICAgIHZhciBjYWxsYmFja3MgPSBhcmd1bWVudHM7XG4gICAgICBjb25maWcuYXN5bmMoZnVuY3Rpb24gaW52b2tlUHJvbWlzZUNhbGxiYWNrKCkge1xuICAgICAgICBpbnZva2VDYWxsYmFjayhwcm9taXNlLl9zdGF0ZSwgdGhlblByb21pc2UsIGNhbGxiYWNrc1twcm9taXNlLl9zdGF0ZSAtIDFdLCBwcm9taXNlLl9kZXRhaWwpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1YnNjcmliZSh0aGlzLCB0aGVuUHJvbWlzZSwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGVuUHJvbWlzZTtcbiAgfSxcblxuICAnY2F0Y2gnOiBmdW5jdGlvbihvblJlamVjdGlvbikge1xuICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICB9XG59O1xuXG5Qcm9taXNlLmFsbCA9IGFsbDtcblByb21pc2UucmFjZSA9IHJhY2U7XG5Qcm9taXNlLnJlc29sdmUgPSBzdGF0aWNSZXNvbHZlO1xuUHJvbWlzZS5yZWplY3QgPSBzdGF0aWNSZWplY3Q7XG5cbmZ1bmN0aW9uIGhhbmRsZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlKSB7XG4gIHZhciB0aGVuID0gbnVsbCxcbiAgcmVzb2x2ZWQ7XG5cbiAgdHJ5IHtcbiAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuXCIpO1xuICAgIH1cblxuICAgIGlmIChvYmplY3RPckZ1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdGhlbiA9IHZhbHVlLnRoZW47XG5cbiAgICAgIGlmIChpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgIHRoZW4uY2FsbCh2YWx1ZSwgZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgaWYgKHJlc29sdmVkKSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgICAgcmVzb2x2ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgaWYgKHZhbHVlICE9PSB2YWwpIHtcbiAgICAgICAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgaWYgKHJlc29sdmVkKSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgICAgcmVzb2x2ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgcmVqZWN0KHByb21pc2UsIHZhbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAocmVzb2x2ZWQpIHsgcmV0dXJuIHRydWU7IH1cbiAgICByZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKCFoYW5kbGVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSkpIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmdWxmaWxsKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykgeyByZXR1cm47IH1cbiAgcHJvbWlzZS5fc3RhdGUgPSBTRUFMRUQ7XG4gIHByb21pc2UuX2RldGFpbCA9IHZhbHVlO1xuXG4gIGNvbmZpZy5hc3luYyhwdWJsaXNoRnVsZmlsbG1lbnQsIHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiByZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykgeyByZXR1cm47IH1cbiAgcHJvbWlzZS5fc3RhdGUgPSBTRUFMRUQ7XG4gIHByb21pc2UuX2RldGFpbCA9IHJlYXNvbjtcblxuICBjb25maWcuYXN5bmMocHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIHB1Ymxpc2hGdWxmaWxsbWVudChwcm9taXNlKSB7XG4gIHB1Ymxpc2gocHJvbWlzZSwgcHJvbWlzZS5fc3RhdGUgPSBGVUxGSUxMRUQpO1xufVxuXG5mdW5jdGlvbiBwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgcHVibGlzaChwcm9taXNlLCBwcm9taXNlLl9zdGF0ZSA9IFJFSkVDVEVEKTtcbn1cblxuZXhwb3J0cy5Qcm9taXNlID0gUHJvbWlzZTsiLCJcInVzZSBzdHJpY3RcIjtcbi8qIGdsb2JhbCB0b1N0cmluZyAqL1xudmFyIGlzQXJyYXkgPSByZXF1aXJlKFwiLi91dGlsc1wiKS5pc0FycmF5O1xuXG4vKipcbiAgYFJTVlAucmFjZWAgYWxsb3dzIHlvdSB0byB3YXRjaCBhIHNlcmllcyBvZiBwcm9taXNlcyBhbmQgYWN0IGFzIHNvb24gYXMgdGhlXG4gIGZpcnN0IHByb21pc2UgZ2l2ZW4gdG8gdGhlIGBwcm9taXNlc2AgYXJndW1lbnQgZnVsZmlsbHMgb3IgcmVqZWN0cy5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgdmFyIHByb21pc2UxID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoXCJwcm9taXNlIDFcIik7XG4gICAgfSwgMjAwKTtcbiAgfSk7XG5cbiAgdmFyIHByb21pc2UyID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoXCJwcm9taXNlIDJcIik7XG4gICAgfSwgMTAwKTtcbiAgfSk7XG5cbiAgUlNWUC5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgLy8gcmVzdWx0ID09PSBcInByb21pc2UgMlwiIGJlY2F1c2UgaXQgd2FzIHJlc29sdmVkIGJlZm9yZSBwcm9taXNlMVxuICAgIC8vIHdhcyByZXNvbHZlZC5cbiAgfSk7XG4gIGBgYFxuXG4gIGBSU1ZQLnJhY2VgIGlzIGRldGVybWluaXN0aWMgaW4gdGhhdCBvbmx5IHRoZSBzdGF0ZSBvZiB0aGUgZmlyc3QgY29tcGxldGVkXG4gIHByb21pc2UgbWF0dGVycy4gRm9yIGV4YW1wbGUsIGV2ZW4gaWYgb3RoZXIgcHJvbWlzZXMgZ2l2ZW4gdG8gdGhlIGBwcm9taXNlc2BcbiAgYXJyYXkgYXJndW1lbnQgYXJlIHJlc29sdmVkLCBidXQgdGhlIGZpcnN0IGNvbXBsZXRlZCBwcm9taXNlIGhhcyBiZWNvbWVcbiAgcmVqZWN0ZWQgYmVmb3JlIHRoZSBvdGhlciBwcm9taXNlcyBiZWNhbWUgZnVsZmlsbGVkLCB0aGUgcmV0dXJuZWQgcHJvbWlzZVxuICB3aWxsIGJlY29tZSByZWplY3RlZDpcblxuICBgYGBqYXZhc2NyaXB0XG4gIHZhciBwcm9taXNlMSA9IG5ldyBSU1ZQLlByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKFwicHJvbWlzZSAxXCIpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIHZhciBwcm9taXNlMiA9IG5ldyBSU1ZQLlByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZWplY3QobmV3IEVycm9yKFwicHJvbWlzZSAyXCIpKTtcbiAgICB9LCAxMDApO1xuICB9KTtcblxuICBSU1ZQLnJhY2UoW3Byb21pc2UxLCBwcm9taXNlMl0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAvLyBDb2RlIGhlcmUgbmV2ZXIgcnVucyBiZWNhdXNlIHRoZXJlIGFyZSByZWplY3RlZCBwcm9taXNlcyFcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gXCJwcm9taXNlMlwiIGJlY2F1c2UgcHJvbWlzZSAyIGJlY2FtZSByZWplY3RlZCBiZWZvcmVcbiAgICAvLyBwcm9taXNlIDEgYmVjYW1lIGZ1bGZpbGxlZFxuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByYWNlXG4gIEBmb3IgUlNWUFxuICBAcGFyYW0ge0FycmF5fSBwcm9taXNlcyBhcnJheSBvZiBwcm9taXNlcyB0byBvYnNlcnZlXG4gIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCBvcHRpb25hbCBzdHJpbmcgZm9yIGRlc2NyaWJpbmcgdGhlIHByb21pc2UgcmV0dXJuZWQuXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgYmVjb21lcyBmdWxmaWxsZWQgd2l0aCB0aGUgdmFsdWUgdGhlIGZpcnN0XG4gIGNvbXBsZXRlZCBwcm9taXNlcyBpcyByZXNvbHZlZCB3aXRoIGlmIHRoZSBmaXJzdCBjb21wbGV0ZWQgcHJvbWlzZSB3YXNcbiAgZnVsZmlsbGVkLCBvciByZWplY3RlZCB3aXRoIHRoZSByZWFzb24gdGhhdCB0aGUgZmlyc3QgY29tcGxldGVkIHByb21pc2VcbiAgd2FzIHJlamVjdGVkIHdpdGguXG4qL1xuZnVuY3Rpb24gcmFjZShwcm9taXNlcykge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICB2YXIgUHJvbWlzZSA9IHRoaXM7XG5cbiAgaWYgKCFpc0FycmF5KHByb21pc2VzKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKTtcbiAgfVxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXSwgcHJvbWlzZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvbWlzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHByb21pc2UgPSBwcm9taXNlc1tpXTtcblxuICAgICAgaWYgKHByb21pc2UgJiYgdHlwZW9mIHByb21pc2UudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBwcm9taXNlLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUocHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0cy5yYWNlID0gcmFjZTsiLCJcInVzZSBzdHJpY3RcIjtcbi8qKlxuICBgUlNWUC5yZWplY3RgIHJldHVybnMgYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgcmVqZWN0ZWQgd2l0aCB0aGUgcGFzc2VkXG4gIGByZWFzb25gLiBgUlNWUC5yZWplY3RgIGlzIGVzc2VudGlhbGx5IHNob3J0aGFuZCBmb3IgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIHZhciBwcm9taXNlID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcbiAgfSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyBDb2RlIGhlcmUgZG9lc24ndCBydW4gYmVjYXVzZSB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCFcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gJ1dIT09QUydcbiAgfSk7XG4gIGBgYFxuXG4gIEluc3RlYWQgb2Ygd3JpdGluZyB0aGUgYWJvdmUsIHlvdXIgY29kZSBub3cgc2ltcGx5IGJlY29tZXMgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIHZhciBwcm9taXNlID0gUlNWUC5yZWplY3QobmV3IEVycm9yKCdXSE9PUFMnKSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyBDb2RlIGhlcmUgZG9lc24ndCBydW4gYmVjYXVzZSB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCFcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gJ1dIT09QUydcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgcmVqZWN0XG4gIEBmb3IgUlNWUFxuICBAcGFyYW0ge0FueX0gcmVhc29uIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoLlxuICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBpZGVudGlmeWluZyB0aGUgcmV0dXJuZWQgcHJvbWlzZS5cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCB3aWxsIGJlY29tZSByZWplY3RlZCB3aXRoIHRoZSBnaXZlblxuICBgcmVhc29uYC5cbiovXG5mdW5jdGlvbiByZWplY3QocmVhc29uKSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBQcm9taXNlID0gdGhpcztcblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHJlamVjdChyZWFzb24pO1xuICB9KTtcbn1cblxuZXhwb3J0cy5yZWplY3QgPSByZWplY3Q7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiByZXNvbHZlKHZhbHVlKSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlLmNvbnN0cnVjdG9yID09PSB0aGlzKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgdmFyIFByb21pc2UgPSB0aGlzO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgcmVzb2x2ZSh2YWx1ZSk7XG4gIH0pO1xufVxuXG5leHBvcnRzLnJlc29sdmUgPSByZXNvbHZlOyIsIlwidXNlIHN0cmljdFwiO1xuZnVuY3Rpb24gb2JqZWN0T3JGdW5jdGlvbih4KSB7XG4gIHJldHVybiBpc0Z1bmN0aW9uKHgpIHx8ICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIiAmJiB4ICE9PSBudWxsKTtcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbih4KSB7XG4gIHJldHVybiB0eXBlb2YgeCA9PT0gXCJmdW5jdGlvblwiO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KHgpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xufVxuXG4vLyBEYXRlLm5vdyBpcyBub3QgYXZhaWxhYmxlIGluIGJyb3dzZXJzIDwgSUU5XG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9EYXRlL25vdyNDb21wYXRpYmlsaXR5XG52YXIgbm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuXG5leHBvcnRzLm9iamVjdE9yRnVuY3Rpb24gPSBvYmplY3RPckZ1bmN0aW9uO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5leHBvcnRzLm5vdyA9IG5vdzsiXX0=

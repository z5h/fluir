var
  _ = require('underscore'),
  Promise = require('es6-promise').Promise,
  EventEmitter = require('eventemitter2').EventEmitter2,
  Router = require('director').Router,
  CHANGE_EVENT = 'change';

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

/**
 * DispatchHandler
 */
function DispatchHandler(listeners){
  this._listeners = listeners;
}
DispatchHandler.prototype.dispatch = function(event_name, payload){
  var self = this;
  var promises = _.map(this._listeners, function(store){
    var fn = store[event_name];
    if (typeof(fn) === 'function') {
      return fn.call(store, payload);
    }
  });
  return Promise.all(promises);
};
DispatchHandler.prototype.emitChange = function(){
  this.emit(CHANGE_EVENT);
};

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
    return DispatchHandler.prototype.emitChange.call(this);
  }, this);

  var self = this;
  _.each(this._stores, function(store){
    //when a store fires a change event, we forward to the root view listening
    store.on(CHANGE_EVENT, function(){
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
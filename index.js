var
  _            = require('underscore'),
  Promise      = require('es6-promise').Promise,
  EventEmitter = require('eventemitter2').EventEmitter2,
  Router       = require('director').Router,
  CHANGE_EVENT = 'change';

function Application(nameToStores){

  if (nameToStores){
    EventEmitter.call(this);
    _.extend(this, EventEmitter.prototype);
    this.initRoot(nameToStores);
  }
}

Application.prototype.initRoot = function(nameToStores){

  this._router = new Router();
  console.log('router', this._router);
  this._values = nameToStores;
  this._stores = _.values(nameToStores);
  this.root = this;

  var self = this;

  _.each(this._stores, function(store){
    //when a store fires a change event, we forward to the root view listening
    store.on(CHANGE_EVENT, function(){
      self.emitChange(store);
    });

    store.go = _.bind(self.go, self);
    store.scope = function(values){
      return self.push(values || {});
    };
    var actions = {};
    _.chain(store)
      .functions()
      .filter(function(x){return x.charAt(0)==='/';})
      .each(function(route){
        var action = function(){
          console.log('in ' + route);
          var args = Array.prototype.slice.call(arguments);
          store[route].apply(store, args);
          self.emitChange();
        };
        actions[route] = action;
        self._router.on(route, action);
      });
    _.chain(store)
      .keys()
      .filter(function(x){return x.charAt(0)==='/' && typeof(store[x])==='string';})
      .each(function(route){
        console.log('setting up ' + route);
        var actionName = store[route];
        self._router.on(route, actions[actionName]);
      });
  });
};

_.extend(Application.prototype, {

  beforeDispatch: function(event_name, payload){
  },

  initRoute : function(route){
    this._router.init(route);
  },

  //called by react components, event -> stores
  dispatch: function(event_name, payload){
    var self = this;
    var promises = _.map(this.root._stores, function(store){
      var fn = store[event_name];
      if (typeof(fn) === 'function') {
        self.beforeDispatch(event_name, payload);
        return fn.call(store, payload);
      }
    });
    return Promise.all(promises);
  },

  go: function(url){
    this._router.setRoute(url);
  },

  push: function(values){
    var appScope = new Application();
    appScope._values = values;
    appScope.parent = this;
    appScope.root = this.root;
    return appScope;
  },

  get: function(key){
    var target = this;
    var result = target._values[key];
    while (result === undefined && target){
      target = target.parent;
      result = target ? target._values[key] : result;
    }
    if (target) {
      return result;
    } else {
      throw key + " not found";
    }
  },

  emitChange: function() {
    console.log('emitChange');
    this.emit(CHANGE_EVENT);
  }
});

var ViewMixin = {
  scope : function(values){
    return values ? this.props.scope.push(values) : this.props.scope;
  },
  resolve : function(key){
    return this.props.scope.get(key);
  },
  dispatch : function(event, payload){
    return this.props.scope.dispatch(event, payload);
  },
  dispatcher : function(event){
    return _.bind(function(e){
      this.props.scope.dispatch(event, e.target.value);
    },this);
  }
};

var RootViewMixin = {
  debounceTime : 10,
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
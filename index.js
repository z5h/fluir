var
  _ = require('underscore'),
  React = require('react/addons'),
  EventEmitter = require('events').EventEmitter,
  State = require('./lib/state').State,
  RouteHandler = require('./lib/routeHandler').RouteHandler,
  DispatchHandler = require('./lib/dispatchHandler').DispatchHandler;
/**
 * Application
 */
function Application(nameToStores){

  this._stores = _.values(nameToStores);

  EventEmitter.call(this);
  _.extend(this, EventEmitter.prototype);

  RouteHandler.call(this, this._stores);
  _.extend(this, RouteHandler.prototype);

  this.dispatchHandler = new DispatchHandler(this._stores);
  this.dispatch = _.bind(this.dispatchHandler.dispatch, this.dispatchHandler);


  //keep track of state.
  //when it changes, we emit a change and the payload is a state object (with a dispatcher)
  var state = new State();
  this.state = state;

  var go = _.bind(this.go, this);

  _.each(nameToStores, function(store, name){
    //add a 'go' function to each store so they can write code like
    //this.go('some/url')
    store.go = go;
    store.setState = function(params){
      return state.setState(name, params);
    };
    store.replaceState = function(params){
      return state.replaceState(name, params);
    };
    store.forceUpdate = function(){
      state.forceUpdate(name);
    };
    store.state = function(namespace){
      return state.value[namespace || name];
    };
    state.replaceState(name, {});
  });
  _.each(this._stores, function(store){
    store.initialize && store.initialize();
  });
  state.on('change', function(){
    this.emit('change', state.value);
  }.bind(this));
}

/**
 * ViewMixin
 */
var ViewMixin = {
  resolve : function(key){
    return this.props[key] || (this.props.scope && this.props.scope[key]);
  },
  scope: function(values){
    var result = React.addons.update(this.props.scope, {$merge : this.props});
    if (values) result = React.addons.update(result, {$merge: values});
    return result;
  },
  componentWillMount : function(){
    this.dispatch = this.props.dispatch;
  }
};

/**
 * RootViewMixin
 */
var RootViewMixin = {
  debounceTime: 10,
  resolve : function(key){
    var scope = this.props.application.state.value;
    return this.props[key] || scope[key];
  },
  scope: function(values){
    var scope = this.props.application.state.value;
    var result = React.addons.update(scope, {$merge : this.props});
    if (values)
      result = React.addons.update(result, {$merge: values});
    return result;
  },
  componentWillMount: function(){
    var app = this.props.application;
    this.callback = (function(){
      this.forceUpdate();
    }).bind(this);
    this.dispatch = app.dispatch;
    app.on('change', _.debounce(this.callback, this.debounceTime));
  }
};

exports.Application = Application;
exports.ViewMixin = ViewMixin;
exports.RootViewMixin = RootViewMixin;
//export for users of standalone build.
//(perhaps this should be browserify-shim-ed instead)
exports.Promise = require('es6-promise').Promise;

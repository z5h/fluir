var
  _            = require('underscore'),
  Promise      = require('es6-promise').Promise,
  EventEmitter = require('eventemitter2').EventEmitter2,
  Router       = require('director').Router;

var CHANGE_EVENT = 'change';

function AppScope(nameToStores){
  EventEmitter.call(this);
  if (nameToStores){
    this._router = new Router();
    this._values = nameToStores;
    this._stores = _.values(nameToStores);
    this.root = this;

    var self = this;
    var fireEvent = function(){
      self.emitChange();
    };
    _.each(this._stores, function(store){
      store.on(CHANGE_EVENT, fireEvent);
      store.go = function(r){
        self._router.setRoute(r);
      };
      _.chain(store)
        .functions()
        .filter(function(x){return x.charAt(0)==='/';})
        .each(function(route){
          var action = store[route];
          self._router.on(route, _.bind(action, store));
        });
      _.chain(store)
        .keys()
        .filter(function(x){return x.charAt(0)==='/' && typeof(store[x])==='string';})
        .each(function(route){
          var actionName = store[route];
          self._router.on(route, _.bind(store[actionName], store));
        });
    });
  }
}
AppScope.prototype = Object.create(EventEmitter.prototype);
_.extend(AppScope.prototype, {

  beforeDispatch: function(event_name, payload){
  },

  //called by react components, event -> stores
  dispatch: function(event_name, payload){
    var promises = _.map(this.root._stores, function(store){
      var fn = store[event_name];
      if (typeof(fn) === 'function') {
        beforeDispatch(event_name, payload);
        return fn.call(store, payload);
      }
    });
    return Promise.all(promises);
  },


  push: function(values){
    var appScope = new AppScope();
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
    this.emit(CHANGE_EVENT);
  },

  /**
   * @param {function} callback
   */
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  /**
   * @param {function} callback
   */
  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  }
});

var AppScopeMixin = {
  debounceTime : 10,
  componentWillMount: function(){
    this.callback = (function(){
      this.forceUpdate();
    }).bind(this);
    this.props.scope.on('change', _.debounce(this.callback, this.debounceTime));
  },
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

exports.AppScope = AppScope;
exports.AppScopeMixin = AppScopeMixin;

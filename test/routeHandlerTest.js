function MockRouter(){
  this.routes = {};
}
MockRouter.prototype.on = function(route, def){
  this.routes[route] = def;
};

var RouteHandler = require('../lib/routeHandler').defineRouteHandler(MockRouter);
require('z5h.nodeunit-asserts');

exports.routeHandler = {
  'new empty': function(t){
    var routeHandler = new RouteHandler([]);
    t.ok(routeHandler);
    t.done();
  },

  'routing': function(t){
    var called = null;
    var routes = {
      '/a': function(){
        called = '/a';
      },
      'a' : 'not a route',
      '/a2': '/a'
    };
    var routes2 = {
      '/b/:value': function(value){
        called = '/b/' + value;
      }
    };

    var routeHandler = new RouteHandler([routes, routes2]);
    routeHandler.emitChange = function(){};

    routeHandler._router.routes['/a'].call();
    t.equal(called, '/a');
    routeHandler._router.routes['/b/:value'].call(null, 'foo');
    t.equal(called, '/b/foo');
    routeHandler._router.routes['/a2'].call();
    t.equal(called, '/a');
    t.ok(routeHandler._router.routes['a'] === undefined);
    t.done();
  }
};
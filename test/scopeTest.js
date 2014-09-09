var Scope = require('../lib/scope').Scope;

exports.scope = {
  'new null': function(t){
    var scope = new Scope();
    t.ok(scope);
    t.done();
  },
  'new empty': function(t){
    var scope = new Scope({});
    t.ok(scope);
    t.done();
  },
  'get fail': function(t){
    var scope = new Scope();
    t.throws(function(){
      scope.get('not there')
    }, /not there/);
    t.done();
  },
  'get success': function(t){
    var scope = new Scope({key1: 'value1', key2: 'value2'});
    t.equal(scope.get('key1'), 'value1');
    t.equal(scope.get('key2'), 'value2');
    t.done();
  },
  'push empty': function(t){
    var scope = new Scope({key1: 'value1', key2: 'value2'});
    var newScope = scope.push({});
    t.notEqual(scope, newScope);
    t.equal(newScope.get('key1'), 'value1');
    t.equal(newScope.get('key2'), 'value2');
    t.done();
  },
  'push shadows': function(t){
    var scope = new Scope({key1: 'value1', key2: 'value2'});
    var newScope = scope.push({key1: 'new value1'});
    t.notEqual(scope, newScope);
    t.equal(scope.get('key1'), 'value1');
    t.equal(newScope.get('key1'), 'new value1');
    t.equal(newScope.get('key2'), 'value2');
    t.done();
  }
};
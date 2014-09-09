var DispatchHandler = require('../lib/dispatchHandler').DispatchHandler,
  Promise = require('es6-promise').Promise;

exports.dispatchHandler = {
  'dispatch': function(t){

    var lowercaser = {
      'EVENT' : function(payload){
        return new  Promise(function(resolve, reject) {
          resolve({event : 'EVENT', payload: payload.toLowerCase()});
        });
      }
    };
    var uppercaser = {
      'EVENT' : function(payload){
        return new  Promise(function(resolve, reject) {
          resolve({event : 'EVENT', payload: payload.toUpperCase()});
        });
      }
    };

    var dispatchHandler = new DispatchHandler([{}, lowercaser, uppercaser, {}]);
    var result = dispatchHandler.dispatch('EVENT', 'aBc');
    result.then(function(values){
      t.deepEqual(values, [{event: 'EVENT', payload: 'abc'}, {event: 'EVENT', payload: 'ABC'}]);
      t.done();
    });

  }
};
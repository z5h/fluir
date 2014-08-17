var _ = require('underscore');

function Clock(){
  var tick = _.bind(function(){
    var date = new Date();
    if (date.getSeconds() != this.seconds){
      this.hours = date.getHours();
      this.minutes = date.getMinutes();
      this.seconds = date.getSeconds();
      this.trigger("change");
    }
  }, this);
  setInterval(tick, 25);
}
_.extend(Clock.prototype, {
  hours : 0,
  minutes : 0,
  seconds : 0,
  time : function(){
    var minutes = ("0" + this.minutes).slice(-2);
    var seconds = ("0" + this.seconds).slice(-2);
    return this.hours + ":" + minutes + ":" + seconds;
  },
  listeners : {},
  on: function(event, f){
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(f);
  },
  trigger: function(event, payload){
    _.map(this.listeners[event], function(l){
      l.call(payload);
    });
  }
});

exports.Clock = Clock;
var React = require('react/addons');
var EventEmitter = require('events').EventEmitter;

function State(){
  EventEmitter.call(this);
  this.value = {};
}
State.prototype = Object.create(EventEmitter.prototype);
State.prototype.constructor = State;

State.prototype.setState = function(namespace, nextState){
  var command = {};
  if (this.value[namespace]){
    command[namespace] = {$merge: nextState};
  } else {
    command[namespace] = {$set: nextState};
  }
  this.value = React.addons.update(this.value, command);
  this.emit('change', namespace, this.value);
  return this.value;
};

State.prototype.replaceState = function(namespace, nextState){
  var command = {};
  command[namespace] = {$set: nextState};
  this.value = React.addons.update(this.value, command);
  this.emit('change', namespace, this.value);
  return this.value;
};

State.prototype.forceUpdate = function(namespace){
  var command = {};
  command[namespace] = {$set: this.value[namespace]};
  this.value = React.addons.update(this.value, command);
  this.emit('change', namespace, this.value);
};

exports.State = State;
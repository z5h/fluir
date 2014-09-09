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
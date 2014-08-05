var _ = require('underscore');

function PhoneBook(name){
  this.name = name;
}
_.extend(PhoneBook.prototype, {
  contacts : [],
  nextNewContactId : 0,
  getContact: function(id){
    return _.findWhere(this.contacts, {id: id});
  },

  addContact: function(properties){
    this.updateContact(this.nextNewContactId++, properties);
  },
  updateContact: function(id, properties){
    var contact = this.getContact(id);
    if (contact){
      _.extend(contact, properties);
    } else {
      this.contacts.push(_.extend({}, {id: id}, properties));
    }
    this.trigger("change");
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

exports.PhoneBook = PhoneBook;
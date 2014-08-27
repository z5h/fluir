var _ = require('underscore');

function PhoneBook(name){
  this.name = name;
}
_.extend(PhoneBook.prototype, {
  contacts : [],
  nextNewContactId : 0,
  getContact: function(id){
    return _.findWhere(this.contacts, {id: parseInt(id)});
  },
  deleteContact : function(id){
    var index = _.indexOf(this.contacts, this.getContact(id));
    if (index > -1){
      this.contacts.splice(index, 1);
    }
    this.trigger("change");
  },

  addContact_with_lag: function(properties){
    var run = _.bind(function(){
      this.updateContact(this.nextNewContactId, properties);
      this.nextNewContactId += 1;
    }, this);
    return new Promise(function(resolve, reject){
      _.delay(function(){
        run();
        resolve();
      }, 1000);
    });
  },

  addContact: function(properties){
    this.updateContact(this.nextNewContactId, properties);
    this.nextNewContactId += 1;
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

function loadExampleData(phoneBook){
  phoneBook.addContact({
    name : "Joe",
    phoneNumbers : {
      cell :   '555-1234',
      work : '123-1234'
    }
  });
  phoneBook.addContact({
    name : "Sally",
    phoneNumbers : {
      cell :   '555-9876',
      home : '123-9876'
    }
  });
  phoneBook.addContact({
    name : "Steve",
    phoneNumbers : {
      cell :   '555-0000',
      work : '123-0000'
    }
  });
  console.log('phoneBook',phoneBook);
}

exports.PhoneBook = PhoneBook;
exports.loadExampleData = loadExampleData;
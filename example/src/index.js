/** @jsx React.DOM */

var _     = require('underscore');
var React = require('react');

var AppScope          = require('../../index.js').AppScope;
var AppViewMixin     = require('../../index.js').AppViewMixin;
var RootAppViewMixin = require('../../index.js').RootAppViewMixin;

var PhoneBook = require('./phoneBook.js').PhoneBook;

AppScope.prototype.beforeDispatch = function(event_name, payload){
  console.log(event_name, payload);
};


var phoneBook = new PhoneBook();
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

var phoneBookStore = {
  phoneBook : phoneBook,
  on : function(event, f){
    this.phoneBook.on(event, f);
  },

  //-- ACTIONS -----------------------
  ADD_CONTACT : function(payload){
    this.phoneBook.addContact(payload);
  },
  UPDATE_CONTACT: function(payload){
    this.phoneBook.updateContact(payload.id, payload.properties);
  },

  //-- ROUTES -----------------------
  '/':  function(){
      this.viewData = {
        viewClass : PhoneBookView,
        scope : this.scope({phoneBook : this.phoneBook})
      };
    },
  '/phonebook' : function(){
    this.viewData = {
      viewClass : PhoneBookView,
      scope : this.scope({phoneBook : this.phoneBook})
    };
  },
  '/contact/:id' : function(id){
    var contact = this.phoneBook.getContact(id);
    this.viewData = {
      viewClass : ContactView,
      scope : this.scope({
        contact : contact
      })
    };
  },
  '/contact/:id/:phoneIndex' : function(id, phoneIndex){
    var contact = this.phoneBook.getContact(id);
    this.viewData = {
      view : PhoneView,
      scope : this.scope({
        contact : contact,
        phoneIndex : phoneIndex
      })
    };
  }
};

var appScope = new AppScope({phoneBookStore: phoneBookStore});

var RootAppView = React.createClass({
  mixins: [RootAppViewMixin],
  render: function(){
    console.log('render');
    var viewData = this.resolve('phoneBookStore').viewData;
    if (viewData) {
      return <viewData.viewClass scope={viewData.scope}/>;
    } else {
      return <div>:(</div>;
    }
  }
});

var PhoneBookView = React.createClass({
  mixins: [AppViewMixin],
  render : function(){
    var self = this;
    var phoneBook = this.resolve('phoneBook');
    var contactViews = _.map(phoneBook.contacts, function(contact){
      var scope = self.scope({contact: contact});
      return <li><ContactView scope={scope}/></li>;
    });
    return <div>
      <div>PhoneBook</div>
      <ul>
        {contactViews}
      </ul>
    </div>;

  }
});
var ContactView = React.createClass({
  mixins: [AppViewMixin],
  render : function(){
    var self = this;
    var contact = this.resolve('contact');
    var phoneViews = _.map(contact.phoneNumbers, function(phoneNumber, key){
      var scope = self.scope({
        contact : contact,
        phoneKey : key
      });
      return <li><PhoneView scope={scope}/></li>;
    });
    return <div style={{border: '1px solid #aaa'}}>
      {contact.name}
      <br/>
      Phones:
      <ul>
        {phoneViews}
      </ul>
    </div>
  }
});

var PhoneView = React.createClass({
  mixins: [AppViewMixin],
  render : function(){
    var contact = this.resolve('contact');
    var phoneKey = this.resolve('phoneKey');
    var phoneNumber = contact.phoneNumbers[phoneKey];
    return <span>
    {phoneKey} : {phoneNumber}
    </span>;
  }
});

React.renderComponent(
  <RootAppView scope={appScope} />,
  document.getElementById('app')
);

appScope.go('/');
/** @jsx React.DOM */

var _     = require('underscore');
var React = require('react');

var Application          = require('../../index.js').Application;
var ViewMixin     = require('../../index.js').ViewMixin;
var RootViewMixin = require('../../index.js').RootViewMixin;

var PhoneBook = require('./phoneBook.js').PhoneBook;
var loadExampleData = require('./phoneBook.js').loadExampleData;

Application.prototype.beforeDispatch = function(event_name, payload){
  console.log(event_name, payload);
};


var phoneBook = new PhoneBook();
loadExampleData(phoneBook);

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
  '/': '/phonebook',
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
      viewClass : PhoneView,
      scope : this.scope({
        contact : contact,
        phoneIndex : phoneIndex
      })
    };
  }
};

var application = new Application({phoneBookStore: phoneBookStore});

var RootAppView = React.createClass({
  mixins: [RootViewMixin],
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
  mixins: [ViewMixin],
  render : function(){
    var self = this;
    var phoneBook = this.resolve('phoneBook');
    var contactViews = _.map(phoneBook.contacts, function(contact){
      var scope = self.scope({contact: contact});
      return <li key={contact.id}><ContactView scope={scope}/></li>;
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
  mixins: [ViewMixin],
  render : function(){
    var self = this;
    var contact = this.resolve('contact');
    var phoneViews = _.map(contact.phoneNumbers, function(phoneNumber, key){
      var scope = self.scope({
        contact : contact,
        phoneKey : key
      });
      return <li key={key}><PhoneView scope={scope}/></li>;
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
  mixins: [ViewMixin],
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
  <RootAppView scope={application} />,
  document.getElementById('app')
);

//appScope.go('/');
application._router.init();
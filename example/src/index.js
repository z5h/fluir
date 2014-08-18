/** @jsx React.DOM */

var _     = require('underscore');
var React = require('react');

var Application          = require('../../index.js').Application;
var ViewMixin     = require('../../index.js').ViewMixin;
var RootViewMixin = require('../../index.js').RootViewMixin;

var Clock = require('./clock.js').Clock;
var PhoneBook = require('./phoneBook.js').PhoneBook;
var loadExampleData = require('./phoneBook.js').loadExampleData;

Application.prototype.beforeDispatch = function(event_name, payload){
  console.log(event_name, payload);
};


var phoneBook = new PhoneBook();
loadExampleData(phoneBook);
var clock = new Clock();

var clockStore = {
  clock : clock,
  on : function(event, f){
    this.clock.on(event, f);
  }
};

var phoneBookStore = {
  phoneBook : phoneBook,
  on : function(event, f){
    this.phoneBook.on(event, f);
  },

  //-- ACTIONS -----------------------
  ADD_CONTACT : function(payload){
    //the immediate implementation of this feature
    //this.phoneBook.addContact(payload);

    //the implementation of this feature that mimics 1s network lag to complete
    var phoneBook = this.phoneBook;
    return new Promise(function(resolve, reject){
      _.delay(function(){
        phoneBook.addContact(payload);
        resolve();
      }, 1000);
    });

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
    console.log('contact',contact);
    this.viewData = {
      viewClass : ContactView,
      scope : this.scope({
        contact : contact
      })
    };
  },
  '/contact/:id/:phoneIndex' : function(id, phoneKey){
    var contact = this.phoneBook.getContact(id);
    this.viewData = {
      viewClass : PhoneView,
      scope : this.scope({
        contact : contact,
        phoneKey : phoneKey
      })
    };
  }
};

var application = new Application(
  {
    phoneBookStore: phoneBookStore,
    clockStore : clockStore
  }
);

var RootAppView = React.createClass({
  mixins: [RootViewMixin],
  render: function(){
    var time = this.resolve('clockStore').clock.time();
    var viewData = this.resolve('phoneBookStore').viewData;
    if (viewData) {
      return <div>
        <div>Time : {time}</div>
        <viewData.viewClass scope={viewData.scope}/>
        </div>;
    } else {
      return <div>Time: {time}</div>;
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
      <br/>
      <CreateContactView scope={this.scope()}/>
    </div>;
  }
});

var CreateContactView = React.createClass({
  mixins: [ViewMixin],
  getInitialState: function(){
    return {disabled : false}
  },
  handleClick : function(){
    this.setState({disabled : true});

    var phoneNumbers = {};
    phoneNumbers[this.refs.phoneType.getDOMNode().value] =
      this.refs.phoneNumber.getDOMNode().value;

    this.dispatch('ADD_CONTACT', {
      name : this.refs.name.getDOMNode().value,
      phoneNumbers : phoneNumbers
    }).then(_.bind(function(){
        this.setState({disabled : false});
    }, this));
  },
  render : function(){
    var button = this.state.disabled
      ? <button disabled onClick={this.handleClick}>Add</button>
      : <button onClick={this.handleClick}>Add</button>;
    return <div className='bordered pure-form pure-form-stacked'>
      <div>New User:</div>
      <label for="name">Name</label>
      <input id='name' ref='name'/>
      <label for="phoneType">Phone Type</label>
      <input id='phoneType' ref='phoneType'/>
      <label for="phoneNumber">Phone Number</label>
      <input id='phoneNumber' ref='phoneNumber'/>
      {button}
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
    return <div className='bordered'>
      <a href={"#/contact/" + contact.id}>
        {contact.name}
      </a>
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
      <a href={"#/contact/" + contact.id + "/" + phoneKey}>
      {phoneKey}
      </a>
     : {phoneNumber}
    </span>;
  }
});

React.renderComponent(
  <RootAppView scope={application} />,
  document.getElementById('app')
);

application.initRoute('/');

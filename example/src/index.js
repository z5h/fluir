/** @jsx React.DOM */

/**
 * An Application is created by passing in a hash of names -> stores.
 * Stores may expose functionality to the Application.
 * At minimum, each store will be available to components via it's name.
 */
var Application = require('../../index.js').Application;

/**
 * The root react view(s) must use this mixin.
 * In doing so, they will be wired into all of the store's
 * on('change') callbacks. And will forceUpdate (repaint) when stores change.
 */
var RootViewMixin = require('../../index.js').RootViewMixin;

/**
 * All other views must use the ViewMixin.
 * In doing so they can resove variables in their scope:
 *   var myPerson = this.resolve('person'),
 * they can extend the scope with new properties to pass into a child:
 *   var scopeForChile = this.scope({newPropForChild : someValue});
 * and they can dispatch events to the stores:
 *   this.dispatch('CREATE_FOO', {fooProperty: fooValue});
 */
var ViewMixin = require('../../index.js').ViewMixin;


var _     = require('underscore');
var React = require('react/addons');

/**
 * Clock and Phonebook are plain javascript objects.
 * Importantly, they implement on(event, callback), and will call
 * on('change', callback) when their data changes.
 */
var Clock = require('./clock.js').Clock;
var PhoneBook = require('./phoneBook.js').PhoneBook;
var loadExampleData = require('./phoneBook.js').loadExampleData;

/**
 * This is used for animations.
 */
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

/**
 * We can use this hook to log events.
 */
Application.prototype.beforeDispatch = function(event_name, payload){
  console.log(event_name, payload);
};


var phoneBook = new PhoneBook();
loadExampleData(phoneBook);
var clock = new Clock();

/**
 * Create a clockStore.
 * Registering for an event simply passes the call to the clock object.
 */
var clockStore = {
  clock : clock,
  on : function(event, f){
    this.clock.on(event, f);
  }
};

/**
 * Create a phoneBookStore.
 * As a convetions, actions are UPPER CASE.
 * When a view calls this.dispatch('EVENT_NAME', paramsMap),
 * all stores who have a method called EVENT_NAME will have that method invoked.
 * These methods should return promises to make used of the fact that the dispatcher will
 * wrap all results in a Promise.all so that the callee can respond asynchronously to
 * success or failure.
 *
 * Any function whose key-name starts with a '/' will be added to the routes table.
 * An alias for a defined route can be added by declaring a key value pair as such:
 * '/alias' : '/definedRoute'
 *
 * RootViewMixin instances will be told to update after the route functions are done.
 * So the route functions can simply set some state that will be used during render.
 */
var phoneBookStore = {
  phoneBook : phoneBook,
  on : function(event, f){
    this.phoneBook.on(event, f);
  },

  //-- ACTIONS -----------------------
  ADD_CONTACT : function(payload){

    /**
     * We emulate lag here, but return a promise. In the UI, we make use of this to
     * disable/reneable features accordingly.
     */
    return this.phoneBook.addContact_with_lag(payload);
  },
  DELETE_CONTACT : function(payload){
    return this.phoneBook.deleteContact(payload);
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

/**
 * Create the application.
 * Routes are rigged up now, so don't dynamically add them later.
 * Make sure to call application.initRoute('/'); or similar to start the router.
 * See the end of this file.
 */
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
      //our main content is driven by URL, so URL is a fine key to use for
      //React's key functionality that tells it when something has changed.
      var key = document.location.toString();
      return <div>
        <div className="time">Time : {time}</div>
        <hr/>
        <ReactCSSTransitionGroup transitionName="slide">
          <viewData.viewClass key={key} scope={viewData.scope}/>
        </ReactCSSTransitionGroup>
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
      /**
       * Here we create a new scope for the sub-component. It will have access to
       * values in parent views that have not been shadowed.
       */
      var scope = self.scope({contact: contact});
      return <li key={contact.id}><ContactView scope={scope}/></li>;
    });
    return <div>
      <div>PhoneBook</div>
      <ul>
        <ReactCSSTransitionGroup transitionName="example">
          {contactViews}
        </ReactCSSTransitionGroup>
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
  deleteSelf : function(){
    this.dispatch('DELETE_CONTACT', this.resolve('contact').id);
    return false;
  },
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
      [<a href="" onClick={this.deleteSelf}>
        X
      </a>]
      <a cssStyle="float:left" href={"#/contact/" + contact.id}>
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

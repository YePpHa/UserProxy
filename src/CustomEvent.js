define(["utils"], function(utils){
  function addEventListener(event, listener) {
    if (!events[event]) {
      // Creating the array of listeners for event
      events[event] = [];
      
      // Adding the event listener.
      window.addEventListener(event, utils.bind(null, eventListener, event, events[event]), false);
    }
    
    // Adding listener to array.
    events[event].push(listener);
  }
  
  function eventListener(event, listeners, e) {
    e = e || window.event;
    
    // Parse the detail to the original object.
    var data = JSON.parse(e.detail);
    
    if (typeof data.detail === "object" && data.token !== token) {
      var detail = data.detail;
      for (var i = 0, len = listeners.length; i < len; i++) {
        // Call the listener with the event name and the parsed detail.
        listeners[i](detail);
      }
      
      // Prevent propagation
      if (e && typeof e.stopPropagation === "function") {
        e.stopPropagation();
      }
    }
  }
  
  /*function eventListener(event, listener, e) {
    e = e || window.event;
    
    // Parse the detail to the original object.
    var data = JSON.parse(e.detail);
    
    if (typeof data.detail === "object" && data.token !== token) {
      // Prevent propagation
      if (e && typeof e.stopPropagation === "function") {
        e.stopPropagation();
      }
      
      // Call the listener with the parsed detail.
      listener(data.detail);
    }
  }*/
  
  function fireEvent(event, detail) {
    // Creating the event
    var e = document.createEvent("CustomEvent");
    e.initCustomEvent(event, true, true, JSON.stringify({ detail: detail, token: token }));
    
    // Firing the event
    document.documentElement.dispatchEvent(e);
  }
  
  var token = utils.generateToken(); // The token is used to identify itself and prevent calling its own listeners.
  var events = {};
  
  return {
    addEventListener: addEventListener,
    fireEvent: fireEvent
  };
});
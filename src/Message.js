define(["utils"], function(utils){
  function addEventListener(event, listener) {
    initMessage(); // Init the message event listener if not already initialized.
    
    if (!events[event]) events[event] = [];
    
    // Bind the event name to the listener as an argument.
    var boundListener = utils.bind(null, listener, event);
    
    // Add the boundListener to the event
    events[event].push(boundListener);
  }
  
  function fireEvent(event, detail) {
    window.postMessage(JSON.stringify({ token: token, event: event, detail: detail }), "*");
  }
  
  function messageListener(e) {
    e = e || window.event;
    
    // Parse the detail to the original object.
    var data = JSON.parse(e.data);
    
    // Verify that the retrieved information is correct and that it didn't call itself.
    if (typeof data.event === "string" && typeof data.detail === "object" && data.token !== token) {
      
      // Iterate through every listener for data.event.
      if (utils.isArray(events[data.event])) {
        var listeners = events[data.event];
        
        var detail = data.detail;
        for (var i = 0, len = listeners.length; i < len; i++) {
          listeners(detail);
        }
    
        // Prevent propagation only if everything went well.
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
      }
    }
  }
  
  function initMessage() {
    if (!messageEventAdded) {
      // Adding the message event listener.
      window.addEventListener("message", messageListener, false);
    }
  }
  
  var messageEventAdded = false;
  var token = utils.generateToken(); // The token is used to identify itself and prevent calling its own listeners.
  
  var events = {};
  
  return {
    addEventListener: addEventListener,
    fireEvent: fireEvent
  };
});
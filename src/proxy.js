define(["support", "CustomEvent", "Message", "utils", "memFunction"], function(support, customEvent, message, utils, mem){
  function listener(detail) {
    if (typeof detail.callbackId === "number" && utils.isArray(detail.args) && detail.mem) {
      var args = mem.restoreObject(detail.args, token, "page");
      var func = mem.getCacheFunction(detail.callbackId);
      if (typeof func === "function") {
        func.apply(null, args);
      }
    } else if (typeof detail.callbackId === "number" && utils.isArray(detail.args)) {
      var args = mem.restoreObject(detail.args, token, "page");
      if (typeof callbackCache[detail.callbackId] === "function") {
        callbackCache[detail.callbackId].apply(null, args);
      }
      callbackCache[detail.callbackId] = null; // Remove reference for GC.
    } else {
      throw Error("Malformed detail!", detail);
    }
  }
  
  function call(method, args, callback) {
    if (!utils.isArray(args)) {
      args = [];
    }
    
    if (!has(method)) {
      throw Error(method + " is not a defined function!");
    }
    
    args = mem.parseObject(args, token, "page");
    var detail = {
      method: method,
      args: args
    };
    
    if (typeof callback === "function") {
      detail.id = callbackCache.push(callback) - 1;
    }
    
    if (support.CustomEvent) {
      customEvent.fireEvent(token + "-content", detail);
    } else {
      message.fireEvent(token + "-content", detail);
    }
  }
  
  function call2(method, args) {
    function setCallback(callback) {
      clearTimeout(timer);
      if (typeof callback === "function") {
        detail.id = callbackCache.push(callback) - 1;
      }
      execute();
    }
    function execute() {
      if (support.CustomEvent) {
        customEvent.fireEvent(token + "-content", detail);
      } else {
        message.fireEvent(token + "-content", detail);
      }
    }
    args = Array.prototype.slice.call(arguments, 1);
    
    if (!has(method)) {
      throw Error(method + " is not a defined function!");
    }
    
    args = mem.parseObject(args, token, "page");
    var detail = {
      method: method,
      args: args
    };
    
    var timer = setTimeout(execute, 4);
    
    return {
      then: setCallback
    };
  }
  
  function has(method) {
    return utils.indexOfArray(method, functions) > -1;
  }
  
  var callbackCache = [];
  
  if (support.CustomEvent) {
    customEvent.addEventListener(token + "-page", listener);
  } else {
    message.addEventListener(token + "-page", listener);
  }
  
  for (var i = 0, len = functions.length; i < len; i++) {
    scope[functions[i]] = utils.bind(null, call2, functions[i]);
  }
  
  return {
    call: call2,
    has: has
  };
});
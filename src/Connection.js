define(["CustomEvent", "Message", "utils", "support", "memFunction"], function(customEvent, message, utils, support, mem){
  function initListeners(token, functions) {
    if (support.CustomEvent) {
      customEvent.addEventListener(token + "-content", utils.bind(null, listenerProxy, functions, token, "content"));
    } else {
      message.addEventListener(token + "-content", utils.bind(null, listenerProxy, functions, token, "content"));
    }
  }
  
  function listenerProxy(functions, token, type, detail) {
    setTimeout(utils.bind(null, listener, functions, token, type, detail), 4);
  }
  
  function listener(functions, token, type, detail) {
    var keys = utils.getKeys(functions);
    var index = utils.indexOfArray(detail.method, keys);
    if (index > -1) {
      var result = functions[keys[index]].apply(null, mem.restoreObject(detail.args, token, type));
      if (typeof detail.id === "number") {
        var memResult = mem.parseObject(result, token, type);
        var detail = { callbackId: detail.id, args: [ memResult ] };
        if (support.CustomEvent) {
          customEvent.fireEvent(token + "-page", detail);
        } else {
          message.addEventListener(token + "-page", detail);
        }
      }
    } else {
      throw "Method " + detail.method + " has not been set!";
    }
  }
  
  function Connection(pageProxy) {
    this.token = utils.generateToken();
    this.functions = {};
    this.namespace = "UserProxy";
    this.pageProxy = pageProxy;
  }
  
  Connection.prototype.setFunctions = function setFunctions(functions) {
    this.functions = functions;
  }
  
  Connection.prototype.setNamespace = function setFunctions(namespace) {
    this.namespace = namespace;
  }
  
  Connection.prototype.inject = function inject(code) {
    var parent = (document.body || document.head || document.documentElement);
    if (!parent) throw "Parent was not found!";
    
    var script = document.createElement("script")
    script.setAttribute("type", "text/javascript");
    
    var wrapper = [";(function(unsafeWindow){var " + utils.escapeECMAVariable(this.namespace) + " = (" + this.pageProxy + ")(\"" + this.token + "\", " + JSON.stringify(utils.getKeys(this.functions)) + ", this);", "})(window);"];
    
    if (typeof code === "string") {
      code = "function(){" + code + "}"
    }
    
    initListeners(this.token, this.functions);
    
    script.appendChild(document.createTextNode(wrapper[0] + "(" + code + ")();" + wrapper[1]));
    parent.appendChild(script);
    parent.removeChild(script);
  }
  
  return Connection;
});
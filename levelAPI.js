/**
  The MIT License (MIT)

  Copyright (c) 2014 Jeppe Rune Mortensen

  Permission is hereby granted, free of charge, to any person obtaining a copy of
  this software and associated documentation files (the "Software"), to deal in
  the Software without restriction, including without limitation the rights to
  use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
  the Software, and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
  FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
  IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 **/
(function(){
  "use strict";
  
  function injectedScript() {
    function isArray(arr) {
      return Object.prototype.toString.call(arr) === "[object Array]";
    }
    function createSafeObject(obj) {
      if (isArray(obj)) {
        var i;
        for (i = 0; i < obj.length; i++) {
          obj[i] = createSafeObject(obj[i]);
        }
      } else if (typeof obj === "function") {
        return createFunctionLink(obj);
      } else if (obj === Object(obj)) {
        var key;
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            obj[key] = createSafeObject(obj[key]);
          }
        }
      }
      return obj;
    }
    function restoreOriginalObject(obj) {
      if (isArray(obj)) {
        var i;
        for (i = 0; i < obj.length; i++) {
          obj[i] = restoreOriginalObject(obj[i]);
        }
      } else if (typeof obj === "string" && isFunctionLink(obj)) {
        return getFunctionByLink(obj);
      } else if (obj === Object(obj)) {
        var key;
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            obj[key] = restoreOriginalObject(obj[key]);
          }
        }
      }
      return obj;
    }
    
    function bind(func, b){
      return func.call.apply(func.bind, arguments);
    }
    
    function createFunctionCaller(funcLink) {
      return bind(function(){ call(funcLink, Array.prototype.slice.call(arguments)); });
    }
    
    function isFunctionLink(funcLink) {
      return !!/^#\/func\/(safe|unsafe)\/id=([0-9]+);#$/g.exec(funcLink);
    }
    
    function getFunctionByLink(funcLink) {
      var exec = /^#\/func\/(safe|unsafe)\/id=([0-9]+);#$/g.exec(funcLink);
      if(!exec) throw new Error("Malformed function link!");
      
      if (exec[1] === "unsafe") {
        if (functionStorage.length <= exec[2]) throw new Error("Function not found in memory!");
        return functionStorage[exec[2]];
      } else if (exec[1] === "safe") {
        var func = createFunctionCaller(funcLink);
        callbackFunctionStorage[funcLink] = func;
        return func;
      }
      
      return functionStorage[exec[2]];
    }
    function getFunctionLinkInCallerStorage(func) {
      var key;
      for (key in callbackFunctionStorage) {
        if (callbackFunctionStorage.hasOwnProperty(key) && callbackFunctionStorage[key] === func) {
          return key;
        }
      }
      
      return null;
    }
    function createFunctionLink(func) {
      var funcLink = getFunctionLinkInCallerStorage(func);
      if (funcLink) {
        return funcLink;
      } else if (typeof func === "function") {
        var id = functionStorage.push(func) - 1;
        return "#/func/unsafe/id=" + id + ";#";
      } else {
        return null;
      }
    }
    function safeWindowMessageListener(e) {
      if (!e || !e.data) return; // Checking if data is present
      if (typeof e.data !== "string") return; // Checking if the object is a string.
      if (!e.data.indexOf || e.data.indexOf("{") !== 0) return;
      
      var d = JSON.parse(e.data);
      if (d.address !== "safeLevel") return;
      
      if (d.method) {
        if (typeof unsafeFunctions[d.method] === "function") {
          var args = restoreOriginalObject(d.arguments);
          var returnVal = unsafeFunctions[d.method].apply(namespace, args);
          if (d.callback) {
            call(d.callback, [returnVal]);
          }
        } else {
          throw new Error("Unknown method!");
        }
      } else if (d.call) {
        var args = restoreOriginalObject(d.arguments);
        var func = getFunctionByLink(d.call);
        
        var returnVal = func.apply(namespace, args);
        if (d.callback) {
          call(d.callback, [returnVal]);
        }
      }
    }
    function call(_call, args) {
      namespace.postMessage(JSON.stringify({
        address: "pageLevel",
        call: _call,
        arguments: createSafeObject(args)
      }), "*");
    }
    function callMethod(method, args, callback) {
      namespace.postMessage(JSON.stringify({
        address: "pageLevel",
        method: method,
        arguments: createSafeObject(args),
        callback: createFunctionLink(callback)
      }), "*");
    }
    function initPageLevel() {
      namespace.addEventListener("message", safeWindowMessageListener, false);
    }
    function setFunctions(unsafeFuncs) {
      unsafeFunctions = unsafeFuncs
    }
    var functionStorage = [], callbackFunctionStorage = {}, unsafeFunctions = {};
    
    initPageLevel();
    
    return { setFunctions: setFunctions, call: callMethod };
  }
  function isArray(arr) {
    return Object.prototype.toString.call(arr) === "[object Array]";
  }
  function stringifyArguments(args) {
    if (!isArray(args)) return null;
    var str = JSON.stringify(args);
    
    return str.substring(1, str.length - 1);
  }
  function injectScript(func, filename, args) {
    var script = document.createElement("script"), p = (document.body || document.head || document.documentElement);
    if (!p) return;
    script.setAttribute("type", "text/javascript");
    
    var sourceURL = (typeof filename === "string" ? "\n//# sourceURL=" + encodeURIComponent(filename) : "");
    var argsStringified = stringifyArguments(args) || "";
    
    script.appendChild(document.createTextNode("(" + func + ")(" + argsStringified + ");" + sourceURL));
    p.appendChild(script);
    p.removeChild(script);
  }
  function createSafeObject(obj) {
    if (isArray(obj)) {
      var i;
      for (i = 0; i < obj.length; i++) {
        obj[i] = createSafeObject(obj[i]);
      }
    } else if (typeof obj === "function") {
      return createFunctionLink(obj);
    } else if (obj === Object(obj)) {
      var key;
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = createSafeObject(obj[key]);
        }
      }
    }
    return obj;
  }
  function restoreOriginalObject(obj) {
    if (isArray(obj)) {
      var i;
      for (i = 0; i < obj.length; i++) {
        obj[i] = restoreOriginalObject(obj[i]);
      }
    } else if (typeof obj === "string" && isFunctionLink(obj)) {
      return getFunctionByLink(obj);
    } else if (obj === Object(obj)) {
      var key;
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = restoreOriginalObject(obj[key]);
        }
      }
    }
    return obj;
  }
  
  function bind(func, b){
    return func.call.apply(func.bind, arguments);
  }
  
  function createFunctionCaller(funcLink) {
    return bind(function(){ call(funcLink, Array.prototype.slice.call(arguments)); });
  }
  
  function isFunctionLink(funcLink) {
    return !!/^#\/func\/(safe|unsafe)\/id=([0-9]+);#$/g.exec(funcLink);
  }
  
  function getFunctionByLink(funcLink) {
    var exec = /^#\/func\/(safe|unsafe)\/id=([0-9]+);#$/g.exec(funcLink);
    if(!exec) throw new Error("Malformed function link!");
    
    if (exec[1] === "safe") {
      if (functionStorage.length <= exec[2]) throw new Error("Function not found in memory!");
      return functionStorage[exec[2]];
    } else if (exec[1] === "unsafe") {
      var func = createFunctionCaller(funcLink);
      callbackFunctionStorage[funcLink] = func;
      return func;
    }
    
    return functionStorage[exec[2]];
  }
  function getFunctionLinkInCallerStorage(func) {
    var key;
    for (key in callbackFunctionStorage) {
      if (callbackFunctionStorage.hasOwnProperty(key) && callbackFunctionStorage[key] === func) {
        return key;
      }
    }
    
    return null;
  }
  function createFunctionLink(func) {
    var funcLink = getFunctionLinkInCallerStorage(func);
    if (funcLink) {
      return funcLink;
    } else if (typeof func === "function") {
      var id = functionStorage.push(func) - 1;
      return "#/func/safe/id=" + id + ";#";
    } else {
      return null;
    }
  }
  function unsafeWindowMessageListener(e) {
    if (!e || !e.data) return; // Checking if data is present
    if (typeof e.data !== "string") return; // Checking if the object is a string.
    if (!e.data.indexOf || e.data.indexOf("{") !== 0) return;
    
    var d = JSON.parse(e.data);
    if (d.address !== "pageLevel") return
    
    if (d.method) {
      if (typeof safeFunctions[d.method] === "function") {
        var args = restoreOriginalObject(d.arguments);
        var returnVal = safeFunctions[d.method].apply(namespace, args);
        if (d.callback) {
          call(d.callback, [returnVal]);
        }
      } else {
        throw new Error("Unknown method!");
      }
    } else if (d.call) {
      var args = restoreOriginalObject(d.arguments);
      var func = getFunctionByLink(d.call);
      
      var returnVal = func.apply(namespace, args);
      if (d.callback) {
        call(d.callback, [returnVal]);
      }
    }
  }
  function call(_call, args) {
    namespace.postMessage(JSON.stringify({
      address: "safeLevel",
      call: _call,
      arguments: createSafeObject(args)
    }), "*");
  }
  function callMethod(method, args, callback) {
    namespace.postMessage(JSON.stringify({
      address: "safeLevel",
      method: method,
      arguments: createSafeObject(args),
      callback: createFunctionLink(callback)
    }), "*");
  }
  function initPageLevel() {
    namespace.addEventListener("message", unsafeWindowMessageListener, false);
  }
  function setFunctions(safeFuncs) {
    safeFunctions = safeFuncs;
  }
  function scopeScript(func) {
    var script = document.createElement("script"), p = (document.body || document.head || document.documentElement);
    if (!p) return;
    script.setAttribute("type", "text/javascript");
    
    script.appendChild(document.createTextNode("(function(){var levelAPI = (" + injectedScript + ")();(function(window, document, unsafeWindow){(" + func + ").apply(Object.create(null), [levelAPI]);}).apply(Object.create(null), [{}, document, window]);})();\n//# sourceURL=sandbox.js"));
    p.appendChild(script);
    p.removeChild(script);
  }
  var functionStorage = [], callbackFunctionStorage = {}, safeFunctions = {};
  
  var namespace;
  if (typeof module !== "undefined") {
    namespace = module.exports = _strftime;
  } else {
    namespace = (function(){ return this || (1,eval)("this") }());
  }
  
  // Initialize the connection
  initPageLevel();
  
  namespace.levelAPI = { setFunctions: setFunctions, call: callMethod, scopeScript: scopeScript };
})();
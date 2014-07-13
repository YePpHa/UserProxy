var UserProxy = (function(){
/**
 * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../vendor/almond", function(){});

define('utils',[], function(){
  function bind(scope, func) {
    var args = Array.prototype.slice.call(arguments, 2);
    return function(){
      return func.apply(scope, args.concat(Array.prototype.slice.call(arguments)))
    };
  }
  
  // Iterate through obj with the callback function.
  function each(obj, callback) {
    if (isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        if (callback(i, obj[i]) === true) break;
      }
    } else {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (callback(key, obj[key]) === true) break;
        }
      }
    }
  }
  
  function getKeys(obj) {
    var keys = [];
    each(obj, function(key){
      keys.push(key);
    });
    return keys;
  }
  
  // Returns a boolean indicating if object arr is an array.
  function isArray(arr) {
    return Object.prototype.toString.call(arr) === "[object Array]";
  }
  
  // Returns a boolean indicating if the value is in the array.
  function inArray(value, arr) {
    for (var i = 0, len = arr.length; i < len; i++) {
      if (arr[i] === value) {
        return true;
      }
    }
    return false;
  }
  
  function indexOfArray(value, arr) {
    for (var i = 0, len = arr.length; i < len; i++) {
      if (arr[i] === value) {
        return i;
      }
    }
    return -1;
  }
  
  function indexOf(value, arr) {
    if (isArray(value, arr)) {
      return indexOfArray(value, arr);
    }
  }
  
  // Returns a random number between min and max
  function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  // Returns a random integer between min (included) and max (excluded)
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }
  
  // Returns a random string of characters of chars with the length of length
  function generateToken(chars, length) {
    if (typeof chars !== "string") chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
    if (typeof length !== "number") length = 64;
    
    var charsLength = chars.length;
    
    var token = "";
    for (var i = 0; i < length; i++) {
      token += chars[getRandomInt(0, charsLength)];
    }
    
    return token;
  }
  
  function escapeECMAVariable(key, defaultKey) {
    key = key.replace(/[^0-9a-zA-Z_\$]/g, "");
    while (/$[0-9]/g.test(key)) {
      if (key === "") return defaultKey;
      key = key.substring(1);
    }
    return key;
  }
  
  return {
    bind: bind,
    each: each,
    getKeys: getKeys,
    isArray: isArray,
    inArray: inArray,
    indexOf: indexOf,
    indexOfArray: indexOfArray,
    getRandomArbitrary: getRandomArbitrary,
    getRandomInt: getRandomInt,
    generateToken: generateToken,
    escapeECMAVariable: escapeECMAVariable
  };
});
define('support',[], function(){
  function customEvent() {
    try {
      var e = document.createEvent('CustomEvent');
      if (e && typeof e.initCustomEvent === "function") {
        e.initCustomEvent(mod, true, true, { mod: mod });
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  var mod = "support.test";
  
  return {
    CustomEvent: customEvent
  };
});
define('CustomEvent',["utils"], function(utils){
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
define('Message',["utils"], function(utils){
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
define('memFunction',["utils", "CustomEvent", "Message", "support"], function(utils, customEvent, message, support){
  function parseObject(obj, token, type) {
    if (typeof obj === "object") {
      utils.each(obj, function(key, value){
        if (typeof value === "object") {
          obj[key] = parseObject(value, token, type);
        } else if (typeof value === "string") {
          obj[key] = parseString(value);
        } else if (typeof value === "function") {
          var id = cache.push(value) - 1;
          obj[key] = "${" + token + "/" + type + "/" + id + "}";
        }
      });
    } else if (typeof value === "string") {
      obj = parseString(obj);
    } else if (typeof obj === "function") {
      var id = cache.push(obj) - 1;
      obj = "${" + token + "/" + type + "/" + id + "}";
    }
    return obj;
  }
  
  function parseString(str) {
    if (/^\$[\\]*\{([0-9a-zA-Z\.\-_\/\\]+)\}$/g.test(str)) {
      return "$\\" + str.substring(1);
    }
    return str;
  }
  
  function restoreString(str, token, type) {
    if (/^\$\{([0-9a-zA-Z\.\-_]+)\/([0-9a-zA-Z\.\-_]+)\/([0-9]+)\}$/g.test(str)) {
      var parsed = str.substring(2, str.length - 1).split("/"); // " + token + "/" + type + "/" + id + "
      var id = parseInt(parsed[2], 10);
      if (parsed[0] === token && parsed[1] === type) {
        return cache[id];
      } else {
        return utils.bind(null, functionPlaceholder, parsed[0] + "-" + parsed[1], id);
      }
    } else if (/^\$[\\]+\{([0-9a-zA-Z\.\-_\/\\]+)\}$/g.test(str)) {
      return "$" + str.substring(2);
    }
    return str;
  }
  
  function restoreObject(obj, token, type) {
    if (typeof obj === "object") {
      utils.each(obj, function(key, value){
        if (typeof value === "object") {
          obj[key] = restoreObject(value, token, type);
        } else if (typeof value === "string") {
          obj[key] = restoreString(value, token, type);
        } else if (typeof value === "function") {
          throw Error("Function was found!");
        }
      });
    } else if (typeof value === "string") {
      return restoreString(value, token, type);
    } else if (typeof value === "function") {
      throw Error("Function was found!");
    }
    return obj;
  }
  
  function functionPlaceholder(event, id) {
    var args = Array.prototype.slice.call(arguments, 2);
    if (support.CustomEvent) {
      return customEvent.fireEvent(event, { callbackId: id, args: args, mem: true });
    } else {
      return message.fireEvent(event, { callbackId: id, args: args, mem: true });
    }
  }
  
  function getCacheFunction(id) {
    return cache[id];
  }
  
  var cache = [];
  
  return {
    parseObject: parseObject,
    restoreObject: restoreObject,
    getCacheFunction: getCacheFunction
  };
});
define('Connection',["CustomEvent", "Message", "utils", "support", "memFunction"], function(customEvent, message, utils, support, mem){
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
define('main',["utils", "support", "Connection"], function(utils, support, Connection){
  function inject(code) {
    var conn = new Connection(pageProxy);

    conn.setFunctions(funcs);
    conn.setNamespace(namespace);
    
    conn.inject(code);
  }
  
  function setFunctions(functions) {
    funcs = functions;
  }
  
  function setNamespace(n) {
    namespace = n;
  }
  
  var funcs = {};
  var namespace = "UserProxy";
  
  var pageProxy = function(token, functions, scope){
/**
 * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../vendor/almond", function(){});

define('support',[], function(){
  function customEvent() {
    try {
      var e = document.createEvent('CustomEvent');
      if (e && typeof e.initCustomEvent === "function") {
        e.initCustomEvent(mod, true, true, { mod: mod });
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  var mod = "support.test";
  
  return {
    CustomEvent: customEvent
  };
});
define('utils',[], function(){
  function bind(scope, func) {
    var args = Array.prototype.slice.call(arguments, 2);
    return function(){
      return func.apply(scope, args.concat(Array.prototype.slice.call(arguments)))
    };
  }
  
  // Iterate through obj with the callback function.
  function each(obj, callback) {
    if (isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        if (callback(i, obj[i]) === true) break;
      }
    } else {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (callback(key, obj[key]) === true) break;
        }
      }
    }
  }
  
  function getKeys(obj) {
    var keys = [];
    each(obj, function(key){
      keys.push(key);
    });
    return keys;
  }
  
  // Returns a boolean indicating if object arr is an array.
  function isArray(arr) {
    return Object.prototype.toString.call(arr) === "[object Array]";
  }
  
  // Returns a boolean indicating if the value is in the array.
  function inArray(value, arr) {
    for (var i = 0, len = arr.length; i < len; i++) {
      if (arr[i] === value) {
        return true;
      }
    }
    return false;
  }
  
  function indexOfArray(value, arr) {
    for (var i = 0, len = arr.length; i < len; i++) {
      if (arr[i] === value) {
        return i;
      }
    }
    return -1;
  }
  
  function indexOf(value, arr) {
    if (isArray(value, arr)) {
      return indexOfArray(value, arr);
    }
  }
  
  // Returns a random number between min and max
  function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  // Returns a random integer between min (included) and max (excluded)
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }
  
  // Returns a random string of characters of chars with the length of length
  function generateToken(chars, length) {
    if (typeof chars !== "string") chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
    if (typeof length !== "number") length = 64;
    
    var charsLength = chars.length;
    
    var token = "";
    for (var i = 0; i < length; i++) {
      token += chars[getRandomInt(0, charsLength)];
    }
    
    return token;
  }
  
  function escapeECMAVariable(key, defaultKey) {
    key = key.replace(/[^0-9a-zA-Z_\$]/g, "");
    while (/$[0-9]/g.test(key)) {
      if (key === "") return defaultKey;
      key = key.substring(1);
    }
    return key;
  }
  
  return {
    bind: bind,
    each: each,
    getKeys: getKeys,
    isArray: isArray,
    inArray: inArray,
    indexOf: indexOf,
    indexOfArray: indexOfArray,
    getRandomArbitrary: getRandomArbitrary,
    getRandomInt: getRandomInt,
    generateToken: generateToken,
    escapeECMAVariable: escapeECMAVariable
  };
});
define('CustomEvent',["utils"], function(utils){
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
define('Message',["utils"], function(utils){
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
define('memFunction',["utils", "CustomEvent", "Message", "support"], function(utils, customEvent, message, support){
  function parseObject(obj, token, type) {
    if (typeof obj === "object") {
      utils.each(obj, function(key, value){
        if (typeof value === "object") {
          obj[key] = parseObject(value, token, type);
        } else if (typeof value === "string") {
          obj[key] = parseString(value);
        } else if (typeof value === "function") {
          var id = cache.push(value) - 1;
          obj[key] = "${" + token + "/" + type + "/" + id + "}";
        }
      });
    } else if (typeof value === "string") {
      obj = parseString(obj);
    } else if (typeof obj === "function") {
      var id = cache.push(obj) - 1;
      obj = "${" + token + "/" + type + "/" + id + "}";
    }
    return obj;
  }
  
  function parseString(str) {
    if (/^\$[\\]*\{([0-9a-zA-Z\.\-_\/\\]+)\}$/g.test(str)) {
      return "$\\" + str.substring(1);
    }
    return str;
  }
  
  function restoreString(str, token, type) {
    if (/^\$\{([0-9a-zA-Z\.\-_]+)\/([0-9a-zA-Z\.\-_]+)\/([0-9]+)\}$/g.test(str)) {
      var parsed = str.substring(2, str.length - 1).split("/"); // " + token + "/" + type + "/" + id + "
      var id = parseInt(parsed[2], 10);
      if (parsed[0] === token && parsed[1] === type) {
        return cache[id];
      } else {
        return utils.bind(null, functionPlaceholder, parsed[0] + "-" + parsed[1], id);
      }
    } else if (/^\$[\\]+\{([0-9a-zA-Z\.\-_\/\\]+)\}$/g.test(str)) {
      return "$" + str.substring(2);
    }
    return str;
  }
  
  function restoreObject(obj, token, type) {
    if (typeof obj === "object") {
      utils.each(obj, function(key, value){
        if (typeof value === "object") {
          obj[key] = restoreObject(value, token, type);
        } else if (typeof value === "string") {
          obj[key] = restoreString(value, token, type);
        } else if (typeof value === "function") {
          throw Error("Function was found!");
        }
      });
    } else if (typeof value === "string") {
      return restoreString(value, token, type);
    } else if (typeof value === "function") {
      throw Error("Function was found!");
    }
    return obj;
  }
  
  function functionPlaceholder(event, id) {
    var args = Array.prototype.slice.call(arguments, 2);
    if (support.CustomEvent) {
      return customEvent.fireEvent(event, { callbackId: id, args: args, mem: true });
    } else {
      return message.fireEvent(event, { callbackId: id, args: args, mem: true });
    }
  }
  
  function getCacheFunction(id) {
    return cache[id];
  }
  
  var cache = [];
  
  return {
    parseObject: parseObject,
    restoreObject: restoreObject,
    getCacheFunction: getCacheFunction
  };
});
define('proxy',["support", "CustomEvent", "Message", "utils", "memFunction"], function(support, customEvent, message, utils, mem){
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

return require("proxy");
};
  
  return { connect: inject, setFunctions: setFunctions, setNamespace: setNamespace };
});

return require("main");
})();
define(["utils", "CustomEvent", "Message", "support"], function(utils, customEvent, message, support){
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
define([], function(){
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
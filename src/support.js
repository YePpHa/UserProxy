define([], function(){
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
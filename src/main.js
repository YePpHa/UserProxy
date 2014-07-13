define(["utils", "support", "Connection"], function(utils, support, Connection){
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
  
  var pageProxy = ${page-proxy};
  
  return { connect: inject, setFunctions: setFunctions, setNamespace: setNamespace };
});
module.exports = function(grunt) {
  var appConfig = {};
  grunt.initConfig({
    copy: {
      all: {
        files: [
          { expand: true, cwd: "./src/", dest: "./build/", src: ["**/*.js"] }
        ]
      },
      test: {
        files: [
          { expand: true, cwd: "./test/", dest: "./build/", src: ["**/*.js"] }
        ]
      },
      test2: {
        files: [ { expand: true, cwd: "./build/", dest: "./", src: ["**/*.js"] } ]
      }
    },
    requirejs: {
      "proxy": {
        options: {
          baseUrl: "./build",
          name: "../vendor/almond",
          optimize: "none",
          include: ["proxy"],
          out: "./dist/proxy.js",
          wrap: false
        }
      },
      "proxy-debug": {
        options: {
          baseUrl: "./build",
          name: "../vendor/almond",
          optimize: "none",
          include: ["proxy"],
          out: "./dist/proxy.debug.js",
          wrap: false,
          generateSourceMaps: true,
          useSourceUrl: true
        }
      },
      "proxy-min": {
        options: {
          baseUrl: "./build",
          name: "../vendor/almond",
          optimize: "uglify2",
          include: ["proxy"],
          out: "./dist/proxy.min.js",
          wrap: false,
          preserveLicenseComments: false
        }
      },
      "main": {
        options: {
          baseUrl: "./build",
          name: "../vendor/almond",
          optimize: "none",
          include: ["main"],
          out: "./dist/main.js",
          wrap: false
        }
      },
      "main-debug": {
        options: {
          baseUrl: "./build",
          name: "../vendor/almond",
          optimize: "none",
          include: ["main"],
          out: "./dist/main.debug.js",
          wrap: false,
          generateSourceMaps: true,
          useSourceUrl: true
        }
      },
      "main-min": {
        options: {
          baseUrl: "./build",
          name: "../vendor/almond",
          optimize: "uglify2",
          include: ["main"],
          out: "./dist/main.min.js",
          wrap: false,
          preserveLicenseComments: false
        }
      }
    },
    replace: {
      config: {
        options: {
          patterns: [
            {
              match: /\$\{([0-9a-zA-Z\.\-_]+)\}/g,
              replacement: function(match, $1){
                if ($1 in appConfig) {
                  return appConfig[$1];
                } else {
                  return "${" + $1 + "}";
                }
              }
            }
          ]
        },
        files: [
          { expand: true, flatten: false, cwd: "./build/", src: "**/*.js", dest: "./build/" }
        ]
      }
    },
    clean: {
      pre: ["./build/", "./dist/"],
      after: ["./build/", "./dist/"]
    },
  });
  
  grunt.registerTask("sourcemap:main", "Convert the sourcemap url to a data uri.", function() {
    var path = "./dist/main.debug.js";
    var mapPath = "./dist/main.debug.js.map";
    
    var sourceMap = grunt.file.read(mapPath);
    var dataURI = new Buffer(sourceMap).toString("base64");
    var data = "data:application/json;base64," + dataURI;
    
    var content = grunt.file.read(path);
    content = content.replace("main.debug.js.map", data);

    grunt.file.write(path, content);
  });
  
  grunt.registerTask("sourcemap:proxy", "Convert the sourcemap url to a data uri.", function() {
    var path = "./dist/proxy.debug.js";
    var mapPath = "./dist/proxy.debug.js.map";
    
    var sourceMap = grunt.file.read(mapPath);
    var dataURI = new Buffer(sourceMap).toString("base64");
    var data = "data:application/json;base64," + dataURI;
    
    var content = grunt.file.read(path);
    content = content.replace("proxy.debug.js.map", data);

    grunt.file.write(path, content);
  });
  
  grunt.registerTask("wrap:proxy", "Wrapping...", function() {
    var inPath = "./dist/proxy.js";
    var outPath = "./dist/proxy.js";
    var before = "function(token, functions, scope){\n";
    var after = "\nreturn require(\"proxy\");\n}";
    var content = grunt.file.read(inPath);
    grunt.file.write(outPath, before + content + after);
  });
  
  grunt.registerTask("wrap:proxy-debug", "Wrapping...", function() {
    var inPath = "./dist/proxy.debug.js";
    var outPath = "./dist/proxy.debug.js";
    var before = "function(token, functions, scope){\n";
    var after = "\nreturn require(\"proxy\");\n}";
    var content = grunt.file.read(inPath);
    grunt.file.write(outPath, before + content + after);
  });
  
  grunt.registerTask("wrap:proxy-min", "Wrapping...", function() {
    var inPath = "./dist/proxy.min.js";
    var outPath = "./dist/proxy.min.js";
    var before = "function(token, functions, scope){";
    var after = ";return require(\"proxy\");}";
    var content = grunt.file.read(inPath);
    grunt.file.write(outPath, before + content + after);
  });
  
  grunt.registerTask("wrap:main", "Wrapping...", function() {
    var inPath = "./dist/main.js";
    var outPath = "./UserProxy.js";
    var before = "var UserProxy = (function(){\n";
    var after = "\nreturn require(\"main\");\n})();";
    var content = grunt.file.read(inPath);
    grunt.file.write(outPath, before + content + after);
  });
  
  grunt.registerTask("wrap:main-debug", "Wrapping...", function() {
    var inPath = "./dist/main.debug.js";
    var outPath = "./UserProxy.debug.js";
    var before = "var UserProxy = (function(){\n";
    var after = "\nreturn require(\"main\");\n})();";
    var content = grunt.file.read(inPath);
    grunt.file.write(outPath, before + content + after);
  });
  
  grunt.registerTask("wrap:main-min", "Wrapping...", function() {
    var inPath = "./dist/main.min.js";
    var outPath = "./UserProxy.min.js";
    var before = "var UserProxy = (function(){";
    var after = ";return require(\"main\");})();";
    var content = grunt.file.read(inPath);
    grunt.file.write(outPath, before + content + after);
  });
  
  grunt.registerTask("load:proxy", "Loading proxy into mem", function() {
    var path = "./dist/proxy.js";
    var content = grunt.file.read(path);
    appConfig["page-proxy"] = content;
  });
  
  grunt.registerTask("load:proxy-debug", "Loading proxy into mem", function() {
    var path = "./dist/proxy.debug.js";
    var content = grunt.file.read(path);
    appConfig["page-proxy"] = content;
  });
  
  grunt.registerTask("load:proxy-min", "Loading proxy into mem", function() {
    var path = "./dist/proxy.min.js";
    var content = grunt.file.read(path);
    appConfig["page-proxy"] = content;
  });
  
  grunt.registerTask("load:main", "Loading proxy into mem", function() {
    var path = "./UserProxy.js";
    var content = grunt.file.read(path);
    appConfig["main-proxy"] = content;
  });
  
  grunt.registerTask("load:main-debug", "Loading proxy into mem", function() {
    var path = "./UserProxy.debug.js";
    var content = grunt.file.read(path);
    appConfig["main-proxy"] = content;
  });
  
  grunt.registerTask("load:main-min", "Loading proxy into mem", function() {
    var path = "./UserProxy.min.js";
    var content = grunt.file.read(path);
    appConfig["main-proxy"] = content;
  });
  
  grunt.registerTask("task:proxy", "Running task", function() {
    grunt.task.run("proxy");
  });
  grunt.registerTask("task:main", "Running task", function() {
    grunt.task.run("main");
  });
  
  grunt.registerTask("task:proxy-debug", "Running task", function() {
    grunt.task.run("proxy-debug");
  });
  grunt.registerTask("task:main-debug", "Running task", function() {
    grunt.task.run("main-debug");
  });
  
  grunt.registerTask("task:proxy-min", "Running task", function() {
    grunt.task.run("proxy-min");
  });
  grunt.registerTask("task:main-min", "Running task", function() {
    grunt.task.run("main-min");
  });
  
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-replace");
  grunt.loadNpmTasks("grunt-contrib-requirejs");
  grunt.loadNpmTasks("grunt-contrib-clean");
  
  grunt.registerTask("proxy", [
    "copy:all",
    "requirejs:proxy",
    "wrap:proxy"
  ]);
  grunt.registerTask("main", [
    "clean:pre",
    "task:proxy",
    "copy:all",
    "load:proxy",
    "replace:config",
    "requirejs:main",
    "wrap:main",
    "clean:after"
  ]);
  
  grunt.registerTask("proxy-debug", [
    "copy:all",
    "requirejs:proxy-debug",
    "sourcemap:proxy",
    "wrap:proxy-debug"
  ]);
  grunt.registerTask("main-debug", [
    "clean:pre",
    "task:proxy-debug",
    "copy:all",
    "load:proxy-debug",
    "replace:config",
    "requirejs:main-debug",
    "sourcemap:main",
    "wrap:main-debug",
    "clean:after"
  ]);
  
  grunt.registerTask("proxy-min", [
    "copy:all",
    "requirejs:proxy-min",
    "wrap:proxy-min"
  ]);
  grunt.registerTask("main-min", [
    "clean:pre",
    "task:proxy-min",
    "copy:all",
    "load:proxy-min",
    "replace:config",
    "requirejs:main-min",
    "wrap:main-min",
    "clean:after"
  ]);
  
  grunt.registerTask("test", [
    "task:main",
    "copy:test",
    "load:main",
    "replace:config",
    "copy:test2",
    "clean:after"
  ]);
  
  grunt.registerTask("test-debug", [
    "task:main-debug",
    "copy:test",
    "load:main-debug",
    "replace:config",
    "copy:test2",
    "clean:after"
  ]);
  
  grunt.registerTask("test-min", [
    "task:main-min",
    "copy:test",
    "load:main-min",
    "replace:config",
    "copy:test2",
    "clean:after"
  ]);
};
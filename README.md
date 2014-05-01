LevelAPI
==============
This library will make it possible to inject your userscript into the page and still have access to functions like GM_setValue and GM_getValue.

How does it work?
-----------------
LevelAPI sets up a message system between the page and the userscript. This system
works by sending stringified objects by using `JSON`. In these objects there are
information on which function to call and with what arguments. LevelAPI will when
sending arguments transform them into a `safe` object where the functions are
stored into the memory and an unique id is generated which will be sent instead
of the function. The reciever will then be able to identify from where that
unique function id came from and how to handle it.

All this is made into a simple API where it's not needed to know how the system
works and how the transformation works.

Requirements
------------
This library is supported on all browsers which supports `postMessage` and the
event `message`.

Getting started
---------------
To start using this library you need to include `levelAPI.js` in your userscript.
After that you will have to move your userscript into a function which you can
pass to `scopeScript`. You might also need to change on which object LevelAPI
will be accessible from. This can be done by changing `window` at the bottom
of `levelAPI.js` to another variable of your choosing.

API
---
The API of LevelAPI is made into two parts. One for the userscript and one for
the injected script/function.

### Injecting the script (Only for the Userscript)
To inject your script into the page you will have to make a function which you can
pass to `scopeScript`:
```JavaScript
function exampleScript(levelAPI) {
  // ... your code
}
```

This function can then be injected into the page by calling
```JavaScript
scopeScript(exampleScript);
```

### Setting the functions
This function will link the functions you want to be made available for the injected
script or userscript (depends on where you call the function).

To set the functions you call `setFunctions` with an object as the argument. Every
entry in the object is each one callable function. The object key is the name of
the function and the value is the function itself. To link `GM_getValue` and
`GM_setValue` to LevelAPI you call `setFunctions` as follows
```JavaScript
setFunctions({
  "GM_getValue": GM_getValue,
  "GM_setValue": GM_setValue
});
```

### Calling functions
To call a function can only be done to the functions made available through the
function `setFunctions`.

The function `call` can have up to 3 arguments where only the 2 first are required.
The first argument is the name of the function you want to call. The second argument
is the arguments you want to give the function when you call it. This argument needs
to be in an array. If you don't want to give any arguments just give it an empty
array. The last argument is the callback function which will be called when the
function you called has been executed.

An example of `call`
```JavaScript
call("GM_getValue", ["myKey"], function(value){
  // ... my callback code
});
```

In the example the function `GM_getValue` is called with the argument `myKey`. As soon
as this function has been completed it will call the callback function. In this case
the callback function will be given value as an argument, because the function
`GM_getValue` returns the value of the given key.

The `call` function is run asynchronous and therefore call will return `null` no matter
what function you try to call.

TODO
----
* Create a garbage collector which will clean callback functions which have already been
used.
* Create an API to delete stored functions.

License
-------
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
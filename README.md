UserProxy
==============
This library will make it possible to inject your userscript into the page and still have access to functions like GM_setValue, GM_getValue, GM_log and GM_xmlhttpRequest.

How does it work?
-----------------
UserProxy sets up a message system between the page and the userscript. This system
works by sending stringified objects by using `JSON`. In these objects there are
information on which function to call and with what arguments. UserProxy will when
sending arguments transform them into a passable object where the functions are
stored into the memory and an unique id is generated which will be sent instead
of the function. The reciever will then be able to identify from where that
unique function id came from and how to handle it.

All this is made into a simple API where it's not needed to know how the system
works and how the transformation works.

Requirements
------------
This library uses [CustomEvents](https://developer.mozilla.org/en/docs/Web/API/CustomEvent)
and if that is not supported it will fallback to
[postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window.postMessage).

Getting started
---------------
To start using this library you need to include `UserProxy.js` in your userscript.
After that you will have to move your userscript into a function which you can
pass to `connect`.

API
---
The API of UserProxy is made into two parts. One for the userscript and one for
the injected script/function.

### Injecting/Connecting the script (Only for the Userscript)
To inject your script into the page you will have to make a function which you can
pass to `connect`:
```JavaScript
function exampleScript() {
  // ... your code
}
```

This function can then be injected into the page by calling
```JavaScript
UserProxy.connect(exampleScript);
```

The injected function/script will have the variable `window` and `unsafeWindow`
to refer to the global window.

### Setting the functions
To leak functions from the userscript scope to the page scope you need to use the
function `UserProxy.setFunctions`.

To use the API `UserProxy.setFunctions` you need to create an object where the
key is the name of the function and the value is the function itself.
An example of this for both `GM_getValue` and `GM_setValue`:
```JavaScript
UserProxy.setFunctions({
  "GM_getValue": GM_getValue,
  "GM_setValue": GM_setValue
});
```

### Calling functions
To call a function can only be done for the functions made available through the
function `setFunctions`.

UserProxy will by default define the functions in the userscript scope so that
the userscript can call the functions directly without needing to call an API.

An example of calling `GM_getValue`:
```JavaScript
GM_getValue("myKey");
```

The calling of the defined functions are asynchronous and therefore a callback
is needed to i.e. get the value of `myKey`. To set the callback a function
`then` needs to be called directly after calling the function.

```JavaScript
GM_getValue("myKey").then(function(value){
  // ... your callback code
});
```

Security
--------
If you decide to allow your script to use `GM_xmlhttpRequest` then make a domain
check to only allow domains through that you use as there is an open connection
with the page and userscript. This connection should in theory be interceptable
but requires the intercepter to know the token.

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
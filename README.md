UserProxy
==============
This library will make it possible to inject your userscript into the page and still
have access to functions like GM_setValue, GM_getValue, GM_log and GM_xmlhttpRequest.

This is useful for the changes made to Firefox 32+, which limits the unsafeWindow. So
to maintain the same, old `unsafeWindow` you will have to inject your userscript into
the page, where you don't have access to the GM api. What UserProxy does is that it
maintains the old `unsafeWindow` while the userscript still have access to the GM api.

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

You will then have to modify the userscript to handle asynchronous functions instead
of synchronous functions. The difference is that you have to attach callback functions
to an asynchrnous function whereas synchronous functions return their result.

So if you need to call `GM_getValue` synchronously it would look like this
```JavaScript
var myValue = GM_getValue("myKey");
// ... your code
```

whereas in UserProxy every function is asynchronous and needs to be called as
```JavaScript
GM_getValue("myKey").then(function(myValue){
  // ... your code
});
```

API
---
The API of UserProxy is made into two parts. One for the userscript and one for
the injected script/function.

### Injecting/Connecting the script (Only for the Userscript)
To inject your script into the page you will have to make a function which you can
pass to `connect`. The function will not be able to access anything outside it's closure.
```JavaScript
function exampleScript() {
  // ... your code
}
```

The `exampleScript` function will be injected into the page by calling `connect`.
```JavaScript
UserProxy.connect(exampleScript);
```

The injected function/script will have the variables: `window` and `unsafeWindow`, which
both refers to the global window.

### Setting the functions
You can pass functions from the userscript closure to the page closure by defining
an object with the name of the function as the key of a property and the function
itself as the value. For the page closure to be able to access the functions
from the userscript closure the key pairs are needed to be passed to the 
`UserProxy.setFunctions` function. However remember that try to keep as much
unsafe code in the userscript closure to prevent any or minimize security holes.

An example on how to make functions available to the page closure is below.
```JavaScript
UserProxy.setFunctions({
  "GM_getValue": GM_getValue,
  "GM_setValue": GM_setValue
});
// ...
UserProxy.connect(exampleScript);
```

After `UserProxy.connect` have been called it's not possible to change the functions
available to the page closure from the userscript closure. So be sure to predefine
anything that's needed.

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

### Alternate way to call functions
It's possible to also call the functions by using `call` where the first argument
is the method and the rest is the argument that should be passed to the defined
function.

```JavaScript
UserProxy.call("GM_getValue", "myKey").then(function(value){
  // ... your callback code
});
```

### Prepare function call
If you're going to call the same function with the same callback function multiple
times. Then you can use `prepareCall`, where the first argument is the method, the
second argument is the callback. The arguments after that will be passed to the
defined function.

The `prepareCall` function will return a function where the arguments are passed to the defined
function.

```JavaScript
function callback() {
  // ... your code
}
var myFunc = UserProxy.prepareCall("GM_setValue", callback, "myKey");

myFunc("First value"); // Will call GM_setValue("myKey", "First value").then(callback);
myFunc("Second value"); // Will call GM_setValue("myKey", "Second value").then(callback);
```

### Listing defined functions
To list the defined functions in the injected code you can call `listFunctions`,
which will return an array of all the callable functions through UserProxy.

```JavaScript
var myFunctions = UserProxy.listFunctions();
```

### Getting a defined function
To get a defined function in the injected code through UserProxy you call
`getFunction`, where the argument is the method.

```JavaScript
var myFunction = UserProxy.getFunction("GM_getValue");
```

### Setting the UserProxy namespace for the injected code
If your injected code somehow uses the namespace `UserProxy` you can set it to
something else. This is done before the `connect` function has been called.

So if you want the namespace to be `MyProxy` instead of `UserProxy` you can do
the following:

```JavaScript
UserProxy.setNamespace("MyProxy");
// ... 
UserProxy.connect(exampleScript);
```

In the injected script i.e. `exampleScript` you can now call the UserProxy API
by using the `MyProxy` namespace:

```JavaScript
if (MyProxy.isDefined("GM_getValue")) {
  // ... your code
}
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

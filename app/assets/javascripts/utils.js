// ========================================================================
//                  Server Request
// ========================================================================
/*
Create a  request object and send the request to <url> using <verb> (one of "GET", "POST", "PUT", "DELETE").
 <params>, if specified, is a hash of key/value pairs. If the verb is GET, these are added as a query string to the
 url. If the verb is anything else, these are posted in the body of the request.
 When the server is done processing the request, call any queued then() callbacks, A then callback
 should be a function accepting a single arg. For vanilla requests, this arg is the request object itself.
 For json requests, it's a json object.

 This constructor takes care of massaging the data in params, setting the content-type
 correctly, putting params in the right place
 (query string or request body), and setting things up so that the callback is called when
 the server response is complete.

 Note that this is handled asynchronously, which means that construction returns immediately.
 It does not block waiting for the server's response.

 After the request is done, call any
 queued up then() callbacks in order. A callback is added to the queue using the then(), success() or failure() methods.
 A callback, when called, is passed a "result" object. See the FunctionQueue class defined below.
 */
var Request = function(verb, url, params, headers) {
  var self           = this;
  this.verb          = verb;
  this.url           = url;
  this.params        = params;
  this.headers       = headers || {};
  this.body          = null;
  this.request       = new XMLHttpRequest()
  this.functionQueue = new FunctionQueue; // For handling .then() functions to be queued until the request completes.

  // Handle params
  if (params && (verb === "GET")) {
    this.url = url + "?" +  makeFormStringFromHash(params)
  } else if (params && verb !== "GET") {
    this.body = JSON.stringify(params)
  }

  this.request.open(this.verb, this.url) // Specify verb and url for request.

  if (this.body) this.headers["Content-Type"] = "application/json";
  if (!this.isCsrfSafe()) this.headers["X-CSRF-Token"] = ITA.csrfToken;

  // Set up a callback to notify us when response is ready.
  this.request.onreadystatechange = function() {
    if (self.request.readyState == XMLHttpRequest.DONE) {
      self.done()
    }
  }

  this.send()
}

// Send ourselves to the server so it can act on the request.
Request.prototype.send = function () {
  this.setHeaders()
  this.request.send(this.body)
  return this
}

Request.prototype.setHeaders = function() {
  for (name in this.headers) this.request.setRequestHeader(name, this.headers[name])
}

// Called when the asynchronous request finishes. Tell the function queue we are done
// so that it can process the queue.
Request.prototype.done = function () {
  this.functionQueue.done(this.isSuccess(), this.initialResult())
}

// Return true if code is a success code, else false.
Request.prototype.isSuccess = function () {
  return this.request.status >= 200 && this.request.status < 300
}

// Return the initial "result"" object for function-queue processing (see class documentation above).
// The default defined by this base class is simply to return the Request object itself.
Request.prototype.initialResult = function () {
  return this;
}

// Run callback when the request is done. Multiple callbacks can be queued in a pipeline,
// each to be run when the request finishes.
// Each callback is passed as an argument the return value of the previous callback, if it has one.
// See FunctionQueue below for more details on this.
Request.prototype.then = function (callback) {
  this.functionQueue.then(callback)
  return this
}

// Run the callback on the result object when the request is done,
// but only if the request finished successfully.
Request.prototype.success = function (callback) {
  this.functionQueue.success(callback)
  return this
}

// Run the callback on the result object when the request is done,
// but only if the request failed to finish successfully.
Request.prototype.failure = function (callback) {
  this.functionQueue.failure(callback)
  return this
}

// Throw the specified error message if the request fails.
// Example: var x = new Request("GET", myUrl).errorMsg("Could not get myUrl from server.")
Request.prototype.errorMsg = function (msg) {
  return this.failure(function () {
    throw msg
  })
}


Request.prototype.isCsrfSafe = function() {
  return /^(GET|HEAD|OPTIONS|TRACE)$/.test(this.verb);
}
// ========================================================================
//                 Json Request
// ========================================================================

// Create a json request object. After the request is done,
// pass the result through the pipeline by calling each of the functions
// in functionPipe in turn, passing the result of the previous function, if it is not undefined,
// to the next function in the pipe.
var JsonRequest = function(verb, url, params) {
  Request.call(this, verb, url + '.json', params) // Append .json to tell the server we expect a json response.
}
JsonRequest.prototype = Object.create(Request.prototype);


JsonRequest.prototype.initialResult = function () {
  return this.isSuccess() ? JSON.parse(this.request.responseText) : {error: {status: this.request.status}}
}


// ========================================================================
//                   PseudoRequest Objects
// ========================================================================
// This is a wrapper for objects that aren't really
// async, but let's them handle the then() method so that sync and async object
// can be handled uniformly.

var PseudoRequest = function (obj, successState) {
  this.functionQueue = new FunctionQueue
  this.functionQueue.done(arguments.length == 1 || successState, obj)
}
PseudoRequest.prototype = Object.create(Request.prototype);

PseudoRequest.prototype.then = function(callback) {
  this.functionQueue.then(callback)
  return this;
}


PseudoRequest.prototype.success = function(callback) {
  this.functionQueue.success(callback)
  return this;
}


PseudoRequest.prototype.failure = function(callback) {
  this.functionQueue.failure(callback)
  return this;
}
// ========================================================================
//                   Asynchronous Condition-Checking
// ========================================================================
/*
Check periodically until predicate is true, then perform do() action.
Examples:

when(function() {return mycheck()}).do(something());

when(function() {return mycheck()}, 500).do(something()); // check every 500 milliseconds

whenReady(myObj).do(something()); // Do something() when myObj.ready is true.
*/

var when = function (predicate, checkInterval) {
  return new When(predicate, checkInterval);
}

var When = function (predicate, checkInterval) {
  this.predicate = predicate;
  this.checkInterval = checkInterval || 1000;
}

When.prototype.do = function(callback) {
  var me = this;
  var timerHandle = setInterval(function() {
    if (me.predicate()) {
      callback();
      clearInterval(timerHandle);
    }
  }, this.checkInterval);
}


// ========================================================================
//                   Function Queue
// ========================================================================
/*
A function queue is a FIFO queue of callback functions, to be called in sequence when
it receives the done() message. Callbacks are added to the queue via the then(), success(), and failure() methods.
Callbacks stack up in the queue until the done() message is received. At that point,
all callbacks in the queue are called in FIFO order. After the done() message is received, subsequent calls to then(),
success(), or failure() are executed immediately.

Each callback is passed a single object when it is called. This object is called the "result" object.
The initial value of the result object is passed as the second argument to the done() method. However,
this value can be changed by any of the callbacks in the queue. If any callback returns a value, this
value replaces the result object for downstream callbacks in the queue.
 */
var FunctionQueue = function() {
  this.queue  = []
  this._done   = false
}

/*
Call this method when you want to tell the function queue that whatever external
event we were waiting for is now done and that it is time to process the queue.

Each callback in the queue is passed a single object when it is called. This object is called the "result" object.
The initial value of the result object is passed as the second argument to this method. However,
this value can be changed by any of the callbacks in the queue. If any callback returns a value, this
value replaces the result object for downstream callbacks in the queue.

Inputs:
  success: pass true if the event finished successfully; otherwise false. This affects
     the behavior of the methods success() and failure(), defined below.
  result: this is the object to pass to each callback in turn (but any callback can
          alter the downstream flow with its return value. See documentation above.)
 */
FunctionQueue.prototype.done = function (success, result) {
  this._done    = true
  this._success = success || arguments.length == 0
  this.result  = result

  var self = this
  this.queue.forEach(function (callback) {self.doCallback(callback)})

  this.queue = [];
}


/*
Add a callback to the function queue, or process it immediately if
the done condition has already been satisfied.

NOTE that the return value of the callback *never affects the return value of then() or its
sibling methods. Those return values only affect the inputs to other callbacks in the pipeline.
the return value of then() and its siblings is also the FunctionQueue object itself, which allows
chaining of successive then() methods.
 */
FunctionQueue.prototype.then = function (callback) {
  if (this._done) {
    this.doCallback(callback)
  } else {
    this.queue.push(callback);
  }
  return this;
}

// Only process the callback if we got to done() successfully.
FunctionQueue.prototype.success = function (callback) {
  return this.then(function(result) {
    if (this._success) this.doCallback(callback);
  })
}

// Only process the callback if we got to done() unsuccessfully.
FunctionQueue.prototype.failure = function (callback) {
  return this.then(function(result) {
    if (!this._success) this.doCallback(callback);
  })
}

/*
Call the specified callback function, possibly changing the "result" object.
Note that the return value of the callback will alter
the value passed through the remainder of the queue.
 */
FunctionQueue.prototype.doCallback = function (callback) {
  var result = callback.call(this, this.result);
  if (result !== undefined) this.result = result;
}

// ========================================================================
//                   Misc
// ========================================================================
function makeFormStringFromHash (params) {
  if (!params) return ""

  var pairs = []
  for (var name in params) {
    if (!params.hasOwnProperty(name)) continue        // Ignore inherited values
    if (typeof(params[name] === "function")) continue // Ignore methods
    var value = params[name].toString()
    name = encodeURIComponent(name).replace("%20", "+")
    value = encodeURIComponent(value).replace("%20", "+")
    pairs.push(name + "=" + value)
  }
  return pairs.join('&')
}

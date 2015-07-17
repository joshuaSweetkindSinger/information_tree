// ========================================================================
//                  Server Request
// ========================================================================
// Create a  request object. After the request is done, call each of the
// queued then() callbacks. This is done
// by passing the result through the pipeline, calling each of the functions
// in the pipeline in turn.
/*
 Send a request to <url> using <verb> (one of "GET", "POST", "PUT", "DELETE").
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
 */
var Request = function(verb, url, params) {
  var self      = this;
  this.verb     = verb;
  this.url      = url;
  this.params   = params;
  this.body     = null;
  this.pipeline = []; // Handle chained .then() calls asynchronously.
  this.request  = new XMLHttpRequest()
  this.result   = this.request

  // Handle params
  if (verb == "GET") {
    if (params) this.url = url + "?" +  makeFormStringFromHash(params)
  } else {
    this.body = params ? JSON.stringify(params) : null
    request.setRequestHeader("Content-Type", "application/json")
  }

  this.request.open(this.verb, this.url) // Specify verb and url for request.

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
  this.request.send(this.body)
  return this
}

// Request is done: process the then() pipeline and set result to request to indicate we are done.
Request.prototype.done = function () {
  var self = this
  this.pipeline.forEach(function (callback) {self.doCallback(callback)})
  this.pipeline = [];
}


// Run the callback on the result object when the request is done.
Request.prototype.then = function (callback) {
  if (this.isDone()) {
    this.doCallback(callback)
  } else {
    this.pipeline.push(callback);
  }

  return this;
}

// Note that the return value of the callback will alter
// the value passed through the remainder of the pipeline.
Request.prototype.doCallback = function (callback) {
  var result = callback.call(this, this.result);
  if (result !== undefined) this.result = result;
}

Request.prototype.isDone = function() {
  return this.request.readyState === XMLHttpRequest.DONE
}

// Return true if code is a success code, else false.
Request.prototype.isSuccess = function () {
  return this.request.status >= 200 && this.request.status < 300
}

// Run the callback on the result object when the request is done,
// but only if the request finished successfully.
Request.prototype.success = function (callback) {
  return this.then(function(result) {
    if (this.isSuccess()) this.doCallback(callback);
  })
}

// ========================================================================
//                 Json Request
// ========================================================================

// Create a json request object. After the request is done,
// pass the result through the pipeline by calling each of the functions
// in functionPipe in turn, passing the result of the previous function, if it is not undefined,
// to the next function in the pipe.
var JsonRequest = function(verb, url, params) {
  Request.call(this, verb, url, params);
}
JsonRequest.prototype = Object.create(Request.prototype);

// Called by done() in order to set our result value as a function of the request object.
// If it did not finish successfully, the json object will have a single "error" key.
JsonRequest.prototype.done = function () {
  if (this.isSuccess()) {
    this.result = JSON.parse(this.request.responseText)
  } else {
    this.result = {error: {status: this.request.status}}
  }
  Request.prototype.done.call(this)
}



// ========================================================================
//                   PseudoRequest Objects
// ========================================================================
// This is a wrapper for objects that aren't really
// async, but let's them handle the then() method so that sync and async object
// can be handled uniformly.

var PseudoRequest = function (obj) {
  this.result = obj;
}
PseudoRequest.prototype = Object.create(Request.prototype);

PseudoRequest.prototype.then = function(callback) {
  callback.call(this, this.obj);
  return this;
}

PseudoRequest.prototype.isSuccess = function() {return true}


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
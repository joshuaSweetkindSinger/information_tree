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
      console.log("utils:request:onreadystatechange:this=", this);
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
  var result = this.setResult()
  this.pipeline.forEach(function (f) {f(result)});
  this.pipeline = [];
}

// Called when the request is done in order to establish a result value for the request.
Request.prototype.setResult = function () {
  return this.result = request;
}


// Run the callback on the json result object when the request is done.
// If it did not finish successfully, the json object will have a single "error" key.
Request.prototype.then = function (callback) {
  if ('result' in this) {
    callback.call(this, this.result);
  } else {
    this.pipeline.push(callback);
  }

  return this;
}

// Return true if code is a success code, else false.
Request.prototype.isSuccessCode = function (code) {
  return code >= 200 && code < 300
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

// Called by done() in order to set our result value as a function of the request object.
JsonRequest.prototype.setResult = function () {
  if (this.isSuccessCode(this.request.status)) {
    this.result = JSON.parse(this.request.responseText)
  } else {
    this.result = {error: {status: this.request.status}}
  }
  return this.result;
}



// ========================================================================
//                   Delayed Objects
// ========================================================================
// Currently not used, I think. This is a wrapper for objects that aren't really
// asynch, but let's them handle the then() method so that sync and async object
// can be handled uniformly.


var delayed = function (obj) {
  return ('then' in obj) ? obj : new Delayed(obj)
}

var Delayed = function (obj) {
  this.obj = obj;
}

Delayed.prototype.then = function(callback) {
  callback(this.obj);
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
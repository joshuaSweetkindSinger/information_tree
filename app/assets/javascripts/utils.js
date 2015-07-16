// ========================================================================
//                   Asynchronous Server Calls
// ========================================================================
var HTTP = {
  is_success_code: function(code) {
    return code >= 200 && code < 300
  }
};

// Ping the server at url with a request of type verb, augmented by query params.
// If the response is successful, parse it into json and call the callback.
// If not successful, pass back a json that contains the error status.
function getJsonFromServer (verb, url, callback, params) {
  sendServer(
    verb,
    url,
    function(request) {
      var json = null
      if (HTTP.is_success_code(request.status)) {
        json = JSON.parse(request.responseText)
      } else {
        json = {error: {status: request.status}}
      }
      callback(json)
    },
  params)
}


/*
 Send a request to <url> using <verb> (one of "GET", "POST", "PUT", "DELETE").
 <params>, if specified, is a hash of key/value pairs. If the verb is GET, these are added as a query string to the
 url. If the verb is anything else, these are posted in the body of the request.
 When the server is done processing the request, call <callback>, if specified,
 which should be a function accepting
 a single arg: a request object. The server's response can be found in request.responseText.

 This method takes care of massaging the data in params, setting the content-type
 correctly, putting params in the right place
 (query string or request body), and setting things up so that the callback is called when
 the server response is complete.

 Note that this is handled asynchronously, which means that sendServer() returns immediately.
 It does not block waiting for the server's response.
 */
function sendServer (verb, url, callback, params) {
  var request = new XMLHttpRequest()
  request.open(verb, url) // Specify verb and url for request.

  // Handle params
  var body = null
  if (verb == "GET") {
    if (params) url = url + "?" +  makeFormStringFromHash(params)
  } else {
    body = params ? JSON.stringify(params) : null
    request.setRequestHeader("Content-Type", "application/json")
  }


  // Set up the callback to be called when the server response is ready.
  if (callback
    ) {
    request.onreadystatechange = function() {
      if (request.readyState == XMLHttpRequest.DONE) {
        callback(request)
      }
    }
  }

  request.send(body)  // The meat.
}

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



// Create a json request object. After the request is done,
// pass the result through the pipeline by calling each of the functions
// in functionPipe in turn, passing the result of the previous function, if it is not undefined,
// to the next function in the pipe.
var JsonRequest = function(verb, url, params) {
  var self = this;
  this.pipeline = [];

  getJsonFromServer(verb, url,
    function(json) {
      self.pipeline.forEach(function (f) {f(json)});
      self.pipeline = [];
      self.result = json;
  },
    params)
}


// Run the callback on the json result object when the request is done.
// If it did not finish successfully, the json object will have a single "error" key.
JsonRequest.prototype.then = function (callback) {
  if ('result' in this) {
    callback.call(this, this.result);
  } else {
    this.pipeline.push(callback);
  }

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

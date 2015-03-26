HTTP = {
  is_success_code: function(code) {
    return code >= 200 && code < 300
  }
}

// Ping the server at url with a request of type verb, augmented by query params.
// If the response is successful, parse it into json and call the callback.
// If not successful, pass null to the callback.
function getJsonFromServer (verb, url, callback, params) {
  sendServer(
    verb,
    url,
    function(request) {
      callback(HTTP.is_success_code(request.status) ? JSON.parse(request.responseText) : null)
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
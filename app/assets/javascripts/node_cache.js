/*
This file defines the NodeCache class. A NodeCache is a singleton object that holds
all UiNode objects that are created on the client side.
 */


// =========================================================================
//                   Node Cache
// =========================================================================
/*
A NodeCache can hold uiNodes that are added to it and retrieve nodes that have been added by their ids.
 */
var NodeCache = function () {
  this.cache = {}
}

// Add a node to the cache.
NodeCache.prototype.add = function (uiNode) {
  this.cache[uiNode.id] = uiNode
}

// Retrieve a previously added node by its id, returning undefined if there is no node with that id.
NodeCache.prototype.get = function (id) {
  return this.cache[id]
}
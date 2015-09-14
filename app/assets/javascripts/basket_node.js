//= require node

/*
  This file defines the class BasketNode, which is a client-side
  representation of a basket node. The basket node holds all deleted and/or cut nodes.

  The basket node has a unique operation: it can be "emptied", which means that all the nodes
  underneath it are permanently deleted.

  This is non-ui class: it doesn't handle mouse or keyboard events. For that, see UiBasketNode.
*/

var BasketNode = function (nodeRep) {
  Node.call(this, nodeRep) // Initialize from parent class
}
BasketNode.prototype = Object.create(Node.prototype)

BasketNode.prototype.empty = function () {
  var self = this
  return App.server.emptyBasket()
    .success(function() {
      self._children       = [];
      self.childrenFetched = false
    })
}
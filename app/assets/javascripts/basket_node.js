//= require node

/*
  This file defines the class BasketNode, which is a client-side
  representation of a Basket node. The Basket node holds all deleted and/or cut nodes.

  The Basket node has a unique operation: it can be "emptied", which means that all the nodes
  underneath it are permanently deleted.

  This is non-ui class: it doesn't handle mouse or keyboard events. For that, see UiBasketNode.
*/

var BasketNode = function (nodeRep) {
  Node.call(this, nodeRep) // Initialize from parent class
}
BasketNode.prototype = Object.create(Node.prototype)

BasketNode.prototype.empty = function () {
  var self = this
  return ITA.server.emptyBasket()
    .success(function() {
      self._children       = [];
      self.childrenFetched = false
    })
}


/*
 Ask the server to push a node, specified by the node object nodeToInsert,
 onto the basket. After the server
 responds with a success code and node rep, effect the same changes on the client-side.

 nodeToInsert must contain an id, and the server will use the existing node
 with that id for the push operation and move it to the new location at the top of the basket.
 None of the attributes of the client-side node are used by the server.
 */
BasketNode.prototype.pushNode = function (nodeToInsert) {
  return ITA.server.putInBasket(nodeToInsert.id)
    .success(function(nodeRep) {
      return nodeToInsert.update(nodeRep)
    })
    .failure(function(error) {
      console.log("Got an error attempting to put a node in the basket on the server. node-to-insert = ", nodeToInsert, "; error = ", error);
    })
}
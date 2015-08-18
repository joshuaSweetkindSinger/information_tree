//= require node

/*
  This file defines the class TrashNode, which is a client-side
  representation of a trash node. The trash node holds all deleted and/or cut nodes.

  The trash node has a unique operation: it can be "emptied", which means that all the nodes
  underneath it are permanently deleted.

  This is non-ui class: it doesn't handle mouse or keyboard events. For that, see UiTrashNode.
*/

var TrashNode = function (nodeRep) {
  Node.call(this, nodeRep) // Initialize from parent class
}
TrashNode.prototype = Object.create(Node.prototype)

TrashNode.prototype.empty = function () {
  var self = this
  return App.server.emptyTrash()
    .success(function() {
      self._children       = [];
      self.childrenFetched = false
    })
}
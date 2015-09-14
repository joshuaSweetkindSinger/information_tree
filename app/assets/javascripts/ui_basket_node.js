//= require ui_node

/*
This file define the class UiBasketNode, which is the client-side representation of the basket node of the tree.
This is a thin modification of UiSubtree, with some special functionality related to being the basket node.
*/

// =========================================================================
//                   Ui Node
// =========================================================================
var UiBasketNode = defCustomTag('ui-basket-node', UiSubtree);


/*
 Create a UiBasketNode object from a Node object. The UiBasketNode object is a wrapper for the Node
 object and endows the Node object with the UI-related functionality particular to the basket node of the tree.
 The Node object is not a dom element, but the UiBasketNode object is.

 NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
 We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
 need to pass args, which can only be passed via afterCreate().
 */
UiBasketNode.prototype.afterCreate = function(node, state) {
  UiSubtree.prototype.afterCreate.call(this, node, state);
  $(this).draggable('disable') // Can't drag the basket node.
}


UiBasketNode.prototype.enableButtonPanelOptions = function(buttonPanel) {
  buttonPanel.enableAppropriateButtons(this)
  buttonPanel.addPredecessorButton.disable()
  buttonPanel.addSuccessorButton.disable()
  buttonPanel.cutButton.disable()
  $(buttonPanel.emptyBasketButton).show()

}

UiBasketNode.prototype.onKeypress = function(event) {
  App.controller.keyPressedOnTrashNode(this, event);
}

UiBasketNode.prototype.empty = function () {
  var self = this
  return this.node.empty()
    .success(function() {
      $(self._childrenContainer).empty()
      self.expand()
    })
}

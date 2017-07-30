//= require ui_node

/*
This file define the class UiBasketNode, which is the client-side representation of the basket node of the tree.
This is a thin modification of UiNode, with some special functionality related to being the basket node.
*/

// =========================================================================
//                   Ui Node
// =========================================================================
var UiBasketNode = defCustomTag('ui-basket-node', UiNode);


/*
 Create a UiBasketNode object from a BasketNode object. The UiBasketNode object is a wrapper for the BasketNode
 object and endows the BasketNode object with the UI-related functionality particular to the basket node of the tree.
 The BasketNode object is not a dom element, but the UiBasketNode object is.

 NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
 We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
 need to pass args, which can only be passed via afterCreate().
 */
UiBasketNode.prototype.afterCreate = function(basketNode, state) {
  UiNode.prototype.afterCreate.call(this, basketNode, state);
  $(this).draggable('disable') // Can't drag the basket basketNode.
}


UiBasketNode.prototype.enableButtonPanelOptions = function(buttonPanel) {
  buttonPanel.enableAppropriateButtons(this)
  buttonPanel.addPredecessorButton.disable()
  buttonPanel.addSuccessorButton.disable()
  buttonPanel.cutButton.disable()
  $(buttonPanel.emptyBasketButton).show()

}

UiBasketNode.prototype.onKeypress = function(event) {
  ITA.controller.keyPressedOnTrashNode(this, event);
}

UiBasketNode.prototype.empty = function () {
  var self = this
  return this.node.empty()
    .success(function() {
      $(self._childrenContainer).empty()
      self.expand()
    })
}

/*
 Push the existing node viewNode onto the basket.
 Do this first on server side, then on client side.
 */
UiBasketNode.prototype.push = function(viewNode) {
  var isInvalidRequest = this._isInvalidAddRequest(viewNode, 'insertChild');
  if (isInvalidRequest) return isInvalidRequest;

  return this.node.push(viewNode.node)
    .success(function(node) {
      viewNode.attachToTree();
      return viewNode
    })
};
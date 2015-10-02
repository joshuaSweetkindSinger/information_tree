//= require ui_node

/*
This file define the class UiRootNode, which is the client-side representation of the top node of the tree.
This is a thin modification of UiNode, with some special functionality related to being the top node.
*/

// =========================================================================
//                   Ui Node
// =========================================================================
var UiRootNode = defCustomTag('ui-top-node', UiNode);


/*
 Create a UiRootNode object from a Node object. The UiRootNode object is a wrapper for the Node
 object and endows the Node object with the UI-related functionality particular to the top node of the tree.
 The Node object is not a dom element, but the UiRootNode object is.

 NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
 We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
 need to pass args, which can only be passed via afterCreate().
 */
UiRootNode.prototype.afterCreate = function(node, state) {
  UiNode.prototype.afterCreate.call(this, node, state);
  $(this).draggable('disable') // Can't drag the top node.
}

/*
 This somewhat awkward intermediary is necessary because, at create time, we don't have
 a pointer to the Node parent from the UiNodeContent object. So we create a delegator
 that will work at click-time.
 */
UiRootNode.prototype.enableButtonPanelOptions = function(buttonPanel) {
  buttonPanel.enableAppropriateButtons(this)
  buttonPanel.addPredecessorButton.disable()
  buttonPanel.addSuccessorButton.disable()
  buttonPanel.cutButton.disable()
 $(buttonPanel.emptyBasketButton).hide()
}

UiRootNode.prototype.onKeypress = function(event) {
  ITA.controller.keyPressedOnTopNode(this, event);
}
//= require ui_node

/*
This file define the class UiTopNode, which is the client-side representation of the top node of the tree.
This is a thin modification of UiNode, with some special functionality related to being the top node.
*/

// =========================================================================
//                   Ui Node
// =========================================================================
var UiTopNode = defCustomTag('ui-top-node', UiNode);


/*
 Create a UiTopNode object from a Node object. The UiTopNode object is a wrapper for the Node
 object and endows the Node object with the UI-related functionality particular to the top node of the tree.
 The Node object is not a dom element, but the UiTopNode object is.

 NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
 We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
 need to pass args, which can only be passed via afterCreate().
 */
UiTopNode.prototype.afterCreate = function(node) {
  UiNode.prototype.afterCreate.call(this, node);

  // Modify handlers to content element from their defaults given by UiNode parent class.
  var $content = $(this._header.content);
  $content.on("contextmenu", this.onContextMenu.bind(this));
  $content.on("keypress", this.onKeypress.bind(this))
}

/*
 This somewhat awkward intermediary is necessary because, at create time, we don't have
 a pointer to the Node parent from the UiNodeContent object. So we create a delegator
 that will work at click-time.
 */
UiTopNode.prototype.onContextMenu = function(event) {
  App.controller.clickedRightOnTopNode(this, event);
}

UiTopNode.prototype.onKeypress = function(event) {
  App.controller.keyPressedOnTopNode(this, event);
}
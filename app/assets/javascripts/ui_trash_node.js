//= require ui_node

/*
This file define the class UiTrashNode, which is the client-side representation of the trash node of the tree.
This is a thin modification of UiNode, with some special functionality related to being the trash node.
*/

// =========================================================================
//                   Ui Node
// =========================================================================
var UiTrashNode = defCustomTag('ui-trash-node', UiNode);


/*
 Create a UiTrashNode object from a Node object. The UiTrashNode object is a wrapper for the Node
 object and endows the Node object with the UI-related functionality particular to the trash node of the tree.
 The Node object is not a dom element, but the UiTrashNode object is.

 NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
 We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
 need to pass args, which can only be passed via afterCreate().
 */
UiTrashNode.prototype.afterCreate = function(node, state) {
  UiNode.prototype.afterCreate.call(this, node, state);
}


UiTrashNode.prototype.enableButtonPanelOptions = function(buttonPanel) {
  buttonPanel.enableAll()
  buttonPanel.addPredecessorButton.disable()
  buttonPanel.addSuccessorButton.disable()
  buttonPanel.cutButton.disable()
  buttonPanel.followLinkButton.maybeDisable(this)
  $(buttonPanel.emptyTrashButton).show()

}

UiTrashNode.prototype.onKeypress = function(event) {
  App.controller.keyPressedOnTrashNode(this, event);
}

UiTrashNode.prototype.empty = function () {
  var self = this
  return this.node.empty()
    .success(function() {
      $(self._childrenContainer).empty()
      self.expand()
    })
}
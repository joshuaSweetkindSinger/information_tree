/*
This file defines the Node Marker class, which is a ui-element used to represent a "shortcut" to a node
in the information tree. By clicking on it, the user is taken to that node in the tree.
 */


// ========================================================================
//                   Node Marker
// ========================================================================
var NodeMarker = defCustomTag('node-marker', HTMLElement)

/*
 Create a new  node marker and initialize it from the specified UiSubtree object.
 */
NodeMarker.prototype.afterCreate = function (uiNode) {
  this.uiNode = uiNode

  var $this = $(this)
  $this.html(uiNode.snipContent())
  $this.on('click', this.onClick.bind(this))
}

/*
 Handle a click on a node marker: scroll the information tree so that the
 node represented by the mark is at the top of the viewport.
 */
NodeMarker.prototype.onClick = function (event) {
  App.controller.resetMenus()
  App.controller.visitNode(this.uiNode)
}

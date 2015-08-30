/*
This file defines class NodePathList, and associated helper classes. It is the primary dom element
container on the client side for displaying the node path of the currently selected node.

*/


// ========================================================================
//                   Node Path List
// ========================================================================
/*
 A NodePathList object consists of multiple objects of class NodePathMarker, which represent the
 nodes making up the path to the currently selected node.
 */

var NodePathList = defCustomTag('node-path-list', HTMLElement)

NodePathList.prototype.afterCreate = function() {
  return this
}

/*
Set the entries in this Node Path List object to be Node Path Marker elements
consisting of the path from Top to uiNode.
 */
NodePathList.prototype.setPath = function (uiNode) {
  var $this = $(this)
  $this.empty()

  var i = 100 // Don't show a path more than this deep
  while (uiNode && i >= 0) {
    $this.append(new NodeMarker(uiNode))
    uiNode = uiNode.parent(); i = i - 1
  }
}


/*
 Move node path list to float next to element--presumably a dropDown button that was just
 clicked on to invoke the node path list to pop up.
 */
NodePathList.prototype.popUp = function(element) {
  var $this = $(this)
  $this.show(); // I'm not sure why, but showing this before doing new offset avoids a bug. See documentation above.
  $('body').append(this) // Attach to body, not info tree, because we want it to remain fixed even if tree is scrolled.

  var $element = $(element)
  var offset   = $element.offset()
  offset.top   = offset.top + $(element).height()
  $this.offset(offset)
}



// ========================================================================
//                   Node Path List Dropdown
// ========================================================================
/*
 A NodePathListDropdown object is a clickable button that displays
 a visited node list menu.
 */

var NodePathListDropdown = defCustomTag('node-path-list-dropdown', HTMLElement)


/*
The init() method is called by the controller to initialize the statically placed drop-down
after pageload.

PROGRAMMER'S NOTE: init() is not part of the html5 class-extension scaffolding. It is
an additional, ad-hoc method added by this app.
 */
NodePathListDropdown.prototype.init = function() {
  this.nodePathList = new NodePathList

  $(this).on('click', this.onClick.bind(this))
  return this
}


NodePathListDropdown.prototype.onClick = function (event) {
  App.controller.hideAllMenus()
  this.nodePathList.popUp(this)
}
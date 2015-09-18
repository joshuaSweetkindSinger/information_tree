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

var NodePathList = defCustomTag('node-path-list', DropDownPopUp)


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
    uiNode = uiNode.parent()
    i = i - 1
  }
}


// ========================================================================
//                   Node Path List Dropdown
// ========================================================================
/*
 A NodePathListDropdown object is a clickable button that displays
 a visited node list menu.
 */

var NodePathListDropdown = defCustomTag('node-path-list-drop-down', DropDownMenu)

NodePathListDropdown.prototype.init = function() {
  return DropDownMenu.prototype.init.call(this, new NodePathList)
}

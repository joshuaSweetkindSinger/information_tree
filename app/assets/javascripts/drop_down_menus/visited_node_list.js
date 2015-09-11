//= require drop_down_menus/node_marker
//= require drop_down_menus/drop_down_menu_base
/*
This file defines class VisitedNodeList, and associated helper classes. It is the primary dom element
container on the client side for displaying the nodes that have been visited by the user.

*/



// ========================================================================
//                   Visited Node List
// ========================================================================
/*
 A VisitedNodeList object consists of multiple objects of class VisitedNodeMarker, which represent the
 nodes that have been visited.
 */

var VisitedNodeList = defCustomTag('visited-node-list', DropDownPopUp)


VisitedNodeList.prototype.addVisitedNode = function (uiNode) {
  var $this     = $(this)
  var $children = $this.children()

  if ($children.length > 0 && $children[0].uiNode === uiNode) return; // If uiNode is already on the top of the visited list, don't add it again.

  if ($children.length >= 10) $children.last().remove()
  $this.prepend(new NodeMarker(uiNode, this))
}




// ========================================================================
//                   Visited Node List Dropdown
// ========================================================================
/*
 A VisitedNodeListDropDown object is a clickable button that displays
 a visited node list menu.
 */

var VisitedNodeListDropDown = defCustomTag('visited-node-list-drop-down', DropDownMenu)

VisitedNodeListDropDown.prototype.init = function() {
  return DropDownMenu.prototype.init.call(this, new VisitedNodeList)
};
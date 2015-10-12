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

VisitedNodeList.prototype.afterCreate = function () {
  DropDownPopUp.prototype.afterCreate.call(this)
  this.hash = {}
}


VisitedNodeList.prototype.addVisitedNode = function (uiNode) {
  var $this     = $(this)
  var $children = $this.children()

  if (this.contains(uiNode)) return // Don't add the node twice.
  if (this.isFull()) this.removeLast()
  this._add(uiNode)
}

VisitedNodeList.prototype.MAX_SIZE = 100

VisitedNodeList.prototype.isFull = function () {
  return ($(this).children().length >= this.MAX_SIZE)
}

VisitedNodeList.prototype._add = function(uiNode) {
  $(this).prepend(new NodeMarker(uiNode, this))
  this.hash[uiNode.id] = uiNode
}

VisitedNodeList.prototype.removeLast = function() {
  var $last = $(this).children().last()
  $last.remove()
  this.hash[$last[0].uiNode.id] = undefined
}

VisitedNodeList.prototype.contains = function (uiNode) {
  return this.hash[uiNode.id]
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
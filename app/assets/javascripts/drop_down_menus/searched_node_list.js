//= require drop_down_menus/node_marker
//= require drop_down_menus/drop_down_menu_base
/*
This file defines class SearchedNodeList, and associated helper classes. It is the primary dom element
container on the client side for displaying the nodes that have been searched for by the user.

*/



// ========================================================================
//                   Searched Node List
// ========================================================================
/*
 A SearchedNodeList object consists of multiple objects of class SearchedNodeMarker, which represent the
 matching nodes that have been returned by a user-search.
 */

var SearchedNodeList = defCustomTag('searched-node-list', DropDownPopUp)

SearchedNodeList.prototype.afterCreate = function () {
  DropDownPopUp.prototype.afterCreate.call(this)
  this.hash = {}
}


SearchedNodeList.prototype.add = function (uiNode) {
  var $this     = $(this)
  var $children = $this.children()

  if (this.contains(uiNode)) return // Don't add the node twice.
  if (this.isFull()) this.removeLast()
  this._add(uiNode)
}

SearchedNodeList.prototype.MAX_SIZE = 100

SearchedNodeList.prototype.isFull = function () {
  return ($(this).children().length >= this.MAX_SIZE)
}

SearchedNodeList.prototype._add = function(uiNode) {
  $(this).prepend(new NodeMarker(uiNode, this))
  this.hash[uiNode.id] = uiNode
}

SearchedNodeList.prototype.removeLast = function() {
  var $last = $(this).children().last()
  $last.remove()
  this.hash[$last[0].uiNode.id] = undefined
}

SearchedNodeList.prototype.contains = function (uiNode) {
  return this.hash[uiNode.id]
}




// ========================================================================
//                   Searched Node List Dropdown
// ========================================================================
/*
 A SearchedNodeListDropDown object is a clickable button that displays
 a searched node list menu.
 */

var SearchedNodeListDropDown = defCustomTag('searched-node-list-drop-down', DropDownMenu)

SearchedNodeListDropDown.prototype.init = function() {
  return DropDownMenu.prototype.init.call(this, new SearchedNodeList)
};
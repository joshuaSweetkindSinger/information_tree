/*
This file defines class VisitedNodeList, and associated helper classes. It is the primary dom element
container on the client side for displaying the nodes that have been visited by the user.

*/

/*
A VisitedNodeList object consists of multiple objects of class VisitedNodeMarker, which represent the
nodes that have been visited.
 */
// ========================================================================
//                   Visited Node List
// ========================================================================
var VisitedNodeList = defCustomTag('visited-node-list', HTMLElement)

VisitedNodeList.prototype.afterCreate = function() {
  return this
};

VisitedNodeList.prototype.addVisitedNode = function (uiNode) {
  $(this).append(new VisitedNodeMarker(uiNode, this))
}


/*
 Move visited node list to float next to element--presumably a dropDown button that was just
 clicked on to invoke the visited node list to pop up.
 */
VisitedNodeList.prototype.popUp = function(element) {
  var $this = $(this)
  $this.show(); // I'm not sure why, but showing this before doing new offset avoids a bug. See documentation above.

  var $element = $(element)
  var offset   = $element.offset()
  offset.top   = offset.top + $(element).height()
  $this.offset(offset)
}

// ========================================================================
//                   Visited Node Marker
// ========================================================================
var VisitedNodeMarker = defCustomTag('visited-node-marker', HTMLElement)

/*
Create a new visited node marker and initialize it from the specified ViewNode object.
 */
VisitedNodeMarker.prototype.afterCreate = function (uiNode, visitedNodeList) {
  this.uiNode          = uiNode
  this.visitedNodeList = visitedNodeList // pointer back to parent list

  var $this = $(this)
  $this.html(uiNode.content)
  $this.on('click', this.onClick.bind(this))
}

/*
Handle a click on a visited node marker: scroll the information tree so that the
node represented by the mark is at the top of the viewport.

MATH NOTES:
To do this, we set the scroll parameters for the node's parent, which is the information-tree element
(it's the scroll parent because it has a position:relative style attribute), to be its current scrollTop plus
the element's position.top, which states how many pixels below the current scroll top the element lies.
 */
VisitedNodeMarker.prototype.onClick = function (event) {
  var $tree = $(App.informationTree)

  $tree.scrollTop($tree.scrollTop() + $(this.uiNode).position().top)
  App.controller.selectNode(this.uiNode)
  App.controller.hideAllMenus()
}

/*
A VisitedNodeListDropdown object is a clickable button that displays
a visited node list menu.
  */
// ========================================================================
//                   Visited Node List Dropdown
// ========================================================================
var VisitedNodeListDropdown = defCustomTag('visited-node-list-dropdown', HTMLElement)

/*
The init() method is called by the controller to initialize the statically placed drop-down
after pageload.

PROGRAMMER'S NOTE: init() is not part of the html5 class-extension scaffolding. It is
an additional, ad-hoc method added by this app.
 */
VisitedNodeListDropdown.prototype.init = function() {
  this.visitedNodeList = new VisitedNodeList

  $(this).on('click', this.onClick.bind(this))
  return this
};

VisitedNodeListDropdown.prototype.onClick = function (event) {
  this.visitedNodeList.popUp(this)
}
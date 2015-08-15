//= require node_marker
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

var VisitedNodeList = defCustomTag('visited-node-list', HTMLElement)

VisitedNodeList.prototype.afterCreate = function() {
  return this
};

VisitedNodeList.prototype.addVisitedNode = function (uiNode) {
  var $this = $(this)
  $this.prepend(new NodeMarker(uiNode, this))
  if ($this.children().length > 10) {
    $this.children().last().remove()
  }
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
//                   Visited Node List Dropdown
// ========================================================================
/*
 A VisitedNodeListDropdown object is a clickable button that displays
 a visited node list menu.
 */

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
  App.controller.hideAllMenus()
  this.visitedNodeList.popUp(this)
}
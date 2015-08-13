/*
This file defines class VisitedNodeList, which is the toplevel dom element container on the
client side for displaying the nodes that have been visited by the user.

A VisitedNodeList object consists of multiple objects of class VisitedNodeMarker, which represent the
nodes that have been visited.
 */
// ========================================================================
//                   Visited Node List
// ========================================================================
var VisitedNodeList = defCustomTag('visited-node-list', HTMLElement)

VisitedNodeList.prototype.init = function() {
  return this
};

VisitedNodeList.prototype.addVisitedNode = function (uiNode) {
  $(this).append(new VisitedNodeMarker(uiNode, this))
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

VisitedNodeMarker.prototype.onClick = function (event) {
  this.uiNode.scrollIntoView()
  App.controller.selectNode(this.uiNode)
}
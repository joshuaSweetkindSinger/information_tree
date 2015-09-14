// =========================================================================
//                   Node Header
// =========================================================================
/*
 ViewNodeHeader is a container for the node view's content and buttons.
 */
var ViewNodeHeader = defCustomTag('node-header', HTMLElement)
ViewNodeHeader.prototype.afterCreate = function(viewNode, options) {
  var $this = $(this)
  this.viewNode = viewNode
  this.id = 'ViewNodeHeader-' + viewNode.node.id;

  this.dragArea = new DragArea(viewNode)
  $this.append(this.dragArea)

  this.expandCollapseButton = new ExpandCollapse(viewNode)
  $(this).append(this.expandCollapseButton)

  this.contentArea = new ViewNodeContent(viewNode, options);
  $this.append(this.contentArea)

  $this.addClass('node-header')
}


// =========================================================================
//                   Drag Area Button
// =========================================================================
var DragArea = defCustomTag('drag-area', HTMLElement)

DragArea.prototype.afterCreate = function(viewNode) {
  this.viewNode = viewNode
  this.id = 'DragArea-' + viewNode.node.id;

  $(this).addClass('drag-area')
}



// =========================================================================
//                   Expand / Collapse Button
// =========================================================================
var ExpandCollapse = defCustomTag('expand-collapse', HTMLElement)

ExpandCollapse.prototype.afterCreate = function(viewNode) {
  this.viewNode = viewNode
  this.id = 'ExpandCollapse-' + viewNode.node.id;


  this.showCollapsedStatus();
}


ExpandCollapse.prototype.showExpandedStatus = function () {
  $(this).html('v');
}

ExpandCollapse.prototype.showCollapsedStatus = function () {
  $(this).html('>');
}




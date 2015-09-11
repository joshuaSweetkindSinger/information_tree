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

  this.expandCollapseButton = new ExpandCollapse(viewNode)
  $this.append(this.expandCollapseButton)

  this.contentArea = new ViewNodeContent(viewNode, options);
  $this.append(this.contentArea)
}




// =========================================================================
//                   Expand / Collapse Button
// =========================================================================
var ExpandCollapse = defCustomTag('expand-collapse', HTMLElement)

ExpandCollapse.prototype.afterCreate = function(viewNode) {
  this.viewNode = viewNode

  this.showCollapsedStatus();

  $(this).click(function(event) {this.onClick(event)})
}

ExpandCollapse.prototype.showExpandedStatus = function () {
  $(this).html('v');
}

ExpandCollapse.prototype.showCollapsedStatus = function () {
  $(this).html('>');
}


ExpandCollapse.prototype.onClick = function() {
  App.controller.toggleNodeExpandCollapse(this.viewNode);
}

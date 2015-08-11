// =========================================================================
//                   Node Header
// =========================================================================
/*
 ViewNodeHeader is a container for the node view's content and buttons.
 */
var ViewNodeHeader = defCustomTag('node-header', HTMLElement)
ViewNodeHeader.prototype.afterCreate = function(nodeView, options) {
  var $this = $(this)
  this.viewNode = nodeView
  this.id = 'ViewNodeHeader-' + nodeView.node.id;

  this.expandCollapseButton = new ExpandCollapse(nodeView)
  $this.append(this.expandCollapseButton)

  this.contentArea = new ViewNodeContent(nodeView, options);
  $this.append(this.content)
}




// =========================================================================
//                   Expand / Collapse Button
// =========================================================================
var ExpandCollapse = defCustomTag('expand-collapse', HTMLElement)

ExpandCollapse.prototype.afterCreate = function(nodeView) {
  this.viewNode = nodeView

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

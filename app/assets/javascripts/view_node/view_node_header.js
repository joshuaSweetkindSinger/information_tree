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

  this.content = new ViewNodeContent(nodeView, options);
  $this.append(this.content)
}

// =========================================================================
//                   Node Header
// =========================================================================
/*
 NodeHeaderView is a container for the node view's content and buttons.
 */
var NodeHeaderView = defCustomTag('node-header', HTMLElement)
NodeHeaderView.prototype.afterCreate = function(nodeView, options) {
  var $this = $(this)
  this.nodeView = nodeView
  this.id = 'NodeHeaderView-' + nodeView.node.id;

  this.expandCollapseButton = new ExpandCollapse(nodeView)
  $this.append(this.expandCollapseButton)

  this.content = new NodeContentView(nodeView, options);
  $this.append(this.content)
}

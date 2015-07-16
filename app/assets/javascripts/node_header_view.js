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

  this.expandCollapseButton = new ExpandCollapse(nodeView)
  $this.append(this.expandCollapseButton)

  this.content = new NodeContent(nodeView, options);
  $this.append(this.content)
}

NodeHeaderView.prototype.set_id = function(id) {
  this.id = 'NodeHeaderView-' + id;
  this.content.set_id(id);
}

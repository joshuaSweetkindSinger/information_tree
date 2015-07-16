// =========================================================================
//                   Node Children
// =========================================================================
// NodeChildrenView is a container for the node's child nodes.
var NodeChildrenView = defCustomTag('node-children', HTMLElement)
NodeChildrenView.prototype.afterCreate = function() {
}

NodeChildrenView.prototype.set_id = function(id) {
  this.id = 'NodeChildrenView-' + id;
}
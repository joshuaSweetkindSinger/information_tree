// =========================================================================
//                   Node Children
// =========================================================================
// NodeChildren is a container for the node's child nodes.
var NodeChildren = defCustomTag('node-children', HTMLElement)
NodeChildren.prototype.afterCreate = function() {
}

NodeChildren.prototype.set_id = function(id) {
  this.id = 'NodeChildren-' + id;
}
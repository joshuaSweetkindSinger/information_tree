// =========================================================================
//                   Node Children
// =========================================================================
// ViewNodeChildren is a container for the node's child nodes.
var ViewNodeChildren = defCustomTag('node-children', HTMLElement)
ViewNodeChildren.prototype.afterCreate = function() {
}

ViewNodeChildren.prototype.set_id = function(id) {
  this.id = 'ViewNodeChildren-' + id;
}
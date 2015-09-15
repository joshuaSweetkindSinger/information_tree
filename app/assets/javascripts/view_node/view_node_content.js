
// =========================================================================
//                   Node Content
// =========================================================================
// ViewNodeContent holds the text that represents the content of the node.

var ViewNodeContent = defCustomTag('node-content', HTMLTextAreaElement, 'textarea')

ViewNodeContent.prototype.afterCreate = function(viewNode, options) {
  this.viewNode    = viewNode;
  this.id          = 'ViewNodeContent-' + viewNode.node.id;
  this.placeholder = "New Node";
  this.title       = options.tooltip;

  $(this).addClass('node-content'); // Since we are extending a textarea element, we can't put css on the node-content tag--there isn't one in the dom!

}
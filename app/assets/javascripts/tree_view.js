
// ========================================================================
//                   Tree View
// ========================================================================
var TreeView = defCustomTag('information-tree', HTMLElement);

TreeView.prototype.init = function() {
  $(this).click(this.onClick);

  var self = this;
  this.initRequest = App.server.top()
    .success(function(top) {
      self.top = new NodeView(new Node(top))
      $(self).append(self.top);
    });

  return this;
};

TreeView.prototype.onClick = function (event) {
  App.controller.hideButtonPanel();
}


/*
 Return an array of all the nodes in the text tree that are currently visible.
 Return the nodes in order of descending y-value. This means that every visible node will
 be preceded by its older siblings, all their visible descendants, and by its parent.
 */
TreeView.prototype.visibleNodeViews = function() {
  return this.top.visibleNodeViews([]);
}


TreeView.prototype.findLowestNodeAbove = function(y) {
  var nodes = this.visibleNodeViews().reverse();
  for(var i = 0; i < nodes.length; i++) {
    var node = nodes[i];

    // Ignore any "phantom" node that does not have an id.
    if (!node.id) {
      continue;
    }

    if ($(node).position().top < y) {
      return node;
    }
  };
}


/*
 If it currently exists in the dom, return the text node with the specified id.
 */
TreeView.prototype.find = function(id) {
  if (!id) return;

  var $node = $('#' + id);
  if ($node.length > 0) {
    return $node[0];
  }
}

/*
 If it currently exists in the dom, return the NodeView whose id is node.id,
 after updating it with possibly new values from node;
 otherwise, assume that node is a complete representation for a new NodeView: instantiate it and
 return the new NodeView. Note that the newly created NodeView is unglommed; that is, it is
 unattached to the information tree.
 */
TreeView.prototype._findOrCreateNodeView = function(node) {
  var foundNodeView = this.find(node.id);
  return foundNodeView ? foundNodeView.update(node) : new NodeView(node);
}


/*
 If it currently exists in the dom, merely update the nodeView whose id is node.id
 with the other information contained in node, and return it.

 If it does not yet exist in the dom, assume that node is a complete spec for a new NodeView:
 instantiate it and return the new NodeView after glomming it to the information tree in its proper position.
 */
// TODO: TreeView should not be accepting node Reps and doing find or create. Maybe Tree should do this.
TreeView.prototype.addNodeView = function(node) {
  console.log("addNodeView:node:", node);
  var nodeView = this._findOrCreateNodeView(node);
  console.log("addNodeView:nodeView.node", nodeView.node);

  return nodeView._glom();
}


TreeView.prototype.addNodes = function(nodes) {
  return nodes.map(this.addNodeView.bind(this));
}

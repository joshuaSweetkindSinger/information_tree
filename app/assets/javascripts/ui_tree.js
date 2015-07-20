
// ========================================================================
//                   Tree View
// ========================================================================
var UiTree = defCustomTag('information-tree', HTMLElement);

UiTree.prototype.init = function() {
  $(this).click(this.onClick);

  var self = this;
  this.initRequest = App.server.top()
    .success(function(top) {
      self.top = new UiNode(new Node(top))
      $(self).append(self.top);
    });

  return this;
};

UiTree.prototype.onClick = function (event) {
  App.controller.hideButtonPanel();
}


/*
 Return an array of all the nodes in the text tree that are currently visible.
 Return the nodes in order of descending y-value. This means that every visible node will
 be preceded by its older siblings, all their visible descendants, and by its parent.
 */
UiTree.prototype.expandedViewNodes = function() {
  return this.top.expandedViewNodes([]);
}


UiTree.prototype.findLowestNodeAbove = function(y) {
  var nodes = this.expandedViewNodes().reverse();
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
UiTree.prototype.find = function(id) {
  if (!id) return;

  var $node = $('#' + id);
  if ($node.length > 0) {
    return $node[0];
  }
}

/*
 If it currently exists in the dom, return the ViewNode whose id is node.id,
 after updating it with possibly new values from node;
 otherwise, assume that node is a complete representation for a new ViewNode: instantiate it and
 return the new ViewNode. Note that the newly created ViewNode is unglommed; that is, it is
 unattached to the information tree.
 */
UiTree.prototype._findOrCreateUiNode = function(node) {
  var foundUiNode = this.find(node.id);
  return foundUiNode ? foundUiNode.update(node) : new UiNode(node);
}


/*
 If it currently exists in the dom, merely update the viewNode whose id is node.id
 with the other information contained in node, and return it.

 If it does not yet exist in the dom, assume that node is a complete spec for a new ViewNode:
 instantiate it and return the new ViewNode after glomming it to the information tree in its proper position.
 */
// TODO: UiTree should not be accepting node Reps and doing find or create. Maybe Tree should do this.
UiTree.prototype.addUiNode = function(node) {
  return this._findOrCreateUiNode(node)._glom();
}


UiTree.prototype.addUiNodes = function(nodes) {
  return nodes.map(this.addUiNode.bind(this));
}

// ========================================================================
//                   Tree View
// ========================================================================
var TreeView = defCustomTag('information-tree', HTMLElement);

TreeView.prototype.init = function() {
  var self = this;
  $(this).click(this.onClick);

  this.tree = (new Tree).then(function() {
    self.top = new NodeView(self.tree.top);
    $(self).append(self.top);
  })

  return this;
};

TreeView.prototype.onClick = function (event) {
  App.controller.hideButtonPanel();
}

TreeView.prototype.then = function (callback) {
  this.tree.then(callback);
  return this;
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
 If it currently exists in the dom, return the text node whose id is nodeRep.id,
 after updating it with possibly new values from nodeRep;
 otherwise, assume that nodeRep is a complete representation for a new node: instantiate it and
 return the new node. Note that the newly created note is unglommed; that is, it is
 unattached to the text tree.
 */
TreeView.prototype._findOrCreate = function(nodeRep) {
  var foundNode = this.find(nodeRep.id);
  return foundNode ? foundNode.update(nodeRep) : new NodeView(nodeRep);
}


/*
 If it currently exists in the dom, merely update the text node whose id is nodeRep.id
 with the other information contained in nodeRep, and return it.

 If it does not yet exist in the dom, assume that nodeRep is a complete spec for a new node:
 instantiate it and return the new node after glomming it to the text tree in its proper position.
 */
// TODO: TreeView should not be accepting node Reps and doing find or create. Maybe Tree should do this.
TreeView.prototype.addNode = function(nodeRep) {
  return this._findOrCreate(nodeRep)._glom();
}


TreeView.prototype.addNodes = function(fetchedNodeReps) {
  return fetchedNodeReps.map(this.addNode.bind(this));
}

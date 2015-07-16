
// ========================================================================
//                   Tree View
// ========================================================================
var TreeView = defCustomTag('information-tree', HTMLElement);
App.treeView = TreeView; // TODO: deprecated

TreeView.prototype.init = function() {
  var self = this;
  $(this).click(this.onClick); // TODO: These belong on an information-tree-view object.

  this.tree = (new Tree).then(function() {
    self.top = new NodeView(self.tree.top); // TODO: fix this. tree.top should not be a dom element.
    $(self).append(self.top);
    // $(document).tooltip(); // TODO: is there a way for this not to be here?
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
App.treeView.prototype.visibleNodes = function() {
  return this.top.visibleNodes([]);
}


App.treeView.prototype.findLowestNodeAbove = function(y) {
  var nodes = this.visibleNodes().reverse();
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
App.treeView.prototype.find = function(id) {
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
App.treeView.prototype._findOrCreate = function(nodeRep) {
  var foundNode = this.find(nodeRep.id);
  return foundNode ? foundNode.update(nodeRep) : new NodeView(nodeRep);
}


/*
 If it currently exists in the dom, merely update the text node whose id is nodeRep.id
 with the other information contained in nodeRep, and return it.

 If it does not yet exist in the dom, assume that nodeRep is a complete spec for a new node:
 instantiate it and return the new node after glomming it to the text tree in its proper position.
 */
App.treeView.prototype._addNodeOnClient = function(nodeRep) {
  return this._findOrCreate(nodeRep)._glom();
}


App.treeView.prototype._addNodesOnClient = function(fetchedNodeReps) {
  return fetchedNodeReps.map(this._addNodeOnClient.bind(this));
}

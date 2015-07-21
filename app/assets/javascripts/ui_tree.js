//= require ui_top_node

/*
This file defines class UiTree, which is the toplevel dom element container on the
client side for the information tree. It has no server-side counterpart.

It's main job is to intercept certain user events and pass them to the controller, and to provide
tree-level functionality, which means functionality that spans two or more individual nodes.
(All node-level functionality is handled by UiNode.) The most important such functionality is
that of attaching new nodes to the tree, or moving nodes from one place in the tree to another.

RELEVANT CLASSES
UiTree - toplevel Ui object on client side, a dom element.
UiNode - the children of the UiTree dom element are UiNode dom elements.
ViewNode - a superclass of UiNode, this implements all standard client-side functionality for
           a node that is represented by a dom element. No ui-specific functionality is defined here.
           That functionality is defined in the UiNode subclass.
Node    - a client side encapsulation of a server-side node representation. This is not a dom element.
          It just contains the information returned by the server about a node, along with relevant methods
          for operating on itself, such as updating itself with new information from the server.

NODE ATTACHMENT
In theory, certain kinds of node attachment could be handled by class UiNode. For example, when a UiNode
expands, it asks the server for its children. It could simply attach those children to itself. But that's not
the way we handle it. Instead, *all* new node attachment goes through UiTree.AddUiNode() or UiTree.AddUiNodes().

When a Node object comes back from the server, it contains all the information necessary to
specify where it should go in the tree. So, rather than assuming that it belongs to a particular node parent, just
because that parent asked for its children, we instead look at the node coming back from the server and
put the node where it says it belongs.

Since the node might, in principle, go anywhere in the tree, we let this functionality be handled by the UiTree,
rather than by any individual UiNode in the tree.

 */
// ========================================================================
//                   UiTree
// ========================================================================
var UiTree = defCustomTag('information-tree', HTMLElement);

UiTree.prototype.init = function() {
  $(this).click(this.onClick);

  var self = this;
  this.initRequest = App.server.top()
    .success(function(top) {
      self.top = new UiTopNode(new Node(top))
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
 If it currently exists in the dom, return the UiNode with the specified id.
 */
UiTree.prototype.find = function(id) {
  if (!id) return;

  var $uiNode = $('#' + id);
  if ($uiNode.length > 0) {
    return $uiNode[0];
  }
}

/*
 If it currently exists in the dom, merely update the UiNode whose id is node.id
 with the other information contained in node, and return it.

 If no such UiNode yet exists in the dom, create one based on node, which is an instance
 of class Node, and return the new UiNode after glomming it to the information tree in its proper position.

 Note that the newly created UiNode is unglommed; that is, it is
 unattached to the information tree.
 */
UiTree.prototype._findOrCreateUiNode = function(node) {
  var foundUiNode = this.find(node.id);
  return foundUiNode ? foundUiNode.update(node) : new UiNode(node);
}


/*
 If it currently exists in the dom, merely update the UiNode whose id is node.id
 with the other information contained in node, and return it.

 If no such UiNode yet exists in the dom, create one based on node, which is an instance
 of class Node, and return the new UiNode after glomming it to the information tree in its proper position.
 */
// TODO: UiTree should not be accepting node Reps and doing find or create. Maybe Tree should do this.
UiTree.prototype.addUiNode = function(node) {
  return this._findOrCreateUiNode(node)._glom();
}


UiTree.prototype.addUiNodes = function(nodes) {
  return nodes.map(this.addUiNode.bind(this));
}

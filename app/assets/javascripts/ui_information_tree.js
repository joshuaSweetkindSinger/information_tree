//= require ui_top_node
//= require ui_trash_node

/*
This file defines class InformationTree, which is the toplevel dom element container on the
client side for the information tree. It has no server-side counterpart.

It's main job is to intercept certain user events and pass them to the controller, and to provide
tree-level functionality, which means functionality that spans two or more individual nodes.
(All node-level functionality is handled by UiNode.) The most important such functionality is
that of attaching new nodes to the tree, or moving nodes from one place in the tree to another.

RELEVANT CLASSES
InformationTree - toplevel Ui object on client side, a dom element.
UiNode - the children of the InformationTree dom element are UiNode dom elements.
ViewNode - a superclass of UiNode, this implements all standard client-side functionality for
           a node that is represented by a dom element. No ui-specific functionality is defined here.
           That functionality is defined in the UiNode subclass.
Node    - a client side encapsulation of a server-side node representation. This is not a dom element.
          It just contains the information returned by the server about a node, along with relevant methods
          for operating on itself, such as updating itself with new information from the server.

NODE ATTACHMENT
In theory, certain kinds of node attachment could be handled by class UiNode. For example, when a UiNode
expands, it asks the server for its children. It could simply attach those children to itself. But that's not
the way we handle it. Instead, *all* new node attachment goes through InformationTree.AddUiNode() or InformationTree.AddUiNodes().

When a Node object comes back from the server, it contains all the information necessary to
specify where it should go in the tree. So, rather than assuming that it belongs to a particular node parent, just
because that parent asked for its children, we instead look at the node coming back from the server and
put the node where it says it belongs.

Since the node might, in principle, go anywhere in the tree, we let this functionality be handled by the InformationTree,
rather than by any individual UiNode in the tree.

MORE ABOUT NODE ATTACHMENT
There are is only one way that a node comes into being on the client-side: via expansion. When the node's
client-side parent requests its children from the server, a representation of the node is sent to the client,
along with representations of all the parent's children. The client side then creates the node for the first time.

Once a node exists on the client side, it can be moved around via the insert() operations: insertChild(),
insertPredecessor(), insertSuccessor(). Each of these passes the request down the hierarchy: from controller
to UiNode to ViewNode to Node to Server, which sends the request from client side to server. The server
performs the necessary insert operation on the server side, updates the node's parent and sibling links,
and then sends a node rep back to the client, from whence it trickles back up the hierarchy, from node to ViewNode.

There is only one way that a node changes its relationship to the tree on the client side: via attachToTree().
Regardless of the originating operation, after the node has been updated by the server and a node rep has
been sent back to the client, the node is replaced in the client-side tree by the method ViewNode._attachToTree().

WHY THIS FILE CANNOT BE NAMED information_tree.js: probably because this is also the name of the toplevel folder
for the app. In any case, we get a circular dependency error when we try to name this file to information_tree.js.
 */
// ========================================================================
//                   InformationTree
// ========================================================================
var InformationTree = defCustomTag('information-tree', HTMLElement);

InformationTree.prototype.init = function() {
  $(this).click(this.onClick);

  /*
  Initialize the information tree by asking the server to give us its "Top"
  and "Trash" nodes.
   */
  var self = this;
  this.initRequest = App.server.getTop()
    .success(function(top) {
      self.top = new UiTopNode(new Node(top))
      $(self).append(self.top);

      App.server.getTrash()
        .success(function(trash) {
          self.trash = new UiTrashNode(new Node(trash))
          $(self).append(self.trash)
        })
    });

  return this;
};

InformationTree.prototype.onClick = function (event) {
  App.controller.hideAllMenus();
}


/*
 Return an array of all the nodes in the text tree that are currently visible.
 Return the nodes in order of descending y-value. This means that every visible node will
 be preceded by its older siblings, all their visible descendants, and by its parent.
 */
InformationTree.prototype.expandedViewNodes = function() {
  return this.top.expandedViewNodes([]);
}

/*
Find the lowest node in the information tree above y-position y, expressed in "scrolled"
tree coords.

PROGRAMMER NOTES
The information tree div is scrollable. In the "scrolled" coordinate system, the upper left visible
corner of the tree is always 0,0. Nodes that scrolled offscreen above this have negative top values.
 */
InformationTree.prototype.findLowestNodeAbove = function(y) {
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
 If it does not exist, behavior depends on options. Default is to throw an error
 unless options.noError is true.
 */
InformationTree.prototype.find = function(id, options) {
  options = options || {noError: false}

  var $uiNode = $('#' + id);
  if ($uiNode.length > 0) {
    return $uiNode[0];
  } else if (!options.noError) {
    throw "Could not find node on client-side with id of " + id
  }
}

/*
 If it currently exists in the dom, merely update the UiNode whose id is node.id
 with the other information contained in node, and return it.

 If no such UiNode yet exists in the dom, create one based on node, which is an instance
 of class Node, and return the new UiNode. Note if a new UiNode is created, it will be returned
 unattached to the information tree.
 */
InformationTree.prototype._findOrCreateUiNode = function(node) {
  var foundUiNode = this.find(node.id, {noError:true});
  return foundUiNode ? foundUiNode.update(node) : new UiNode(node);
}


/*
 If it currently exists in the dom, merely update the UiNode whose id is node.id
 with the other information contained in node, and return it.

 If no such UiNode yet exists in the dom, create one based on node, which is an instance
 of class Node, and return the new UiNode after attaching it to the information tree in its proper position.

 Input: node is a Node object.
 */
// TODO: InformationTree should not be accepting node Reps and doing find or create. Maybe Tree should do this.
InformationTree.prototype.addUiNode = function(node) {
  return this._findOrCreateUiNode(node)._attachToTree();
}


InformationTree.prototype.addUiNodes = function(nodes) {
  return nodes.map(this.addUiNode.bind(this));
}

/*
Set the information tree's scroll parameters such that uiNode is at the top of the tree's div.

 MATH NOTES:
 To do this, we set the scroll parameters for the node's parent, which is the information-tree element
 (it's the scroll parent because it has a position:relative style attribute), to be its current scrollTop plus
 the element's position.top, which states how many pixels below the current scroll top the element lies.
 */
InformationTree.prototype.scrollTo = function (uiNode) {
  var $this = $(this)
  $this.scrollTop($this.scrollTop() + $(uiNode).position().top)
}
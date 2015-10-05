//= require basket_node
//= require ui_top_node
//= require ui_basket_node

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
There are only two ways that a node comes into being on the client-side: via expansion of a parent node, or
via creation of a new node. Regarding expansion, when the node's
client-side parent requests its children from the server, a representation of the node is sent to the client,
along with representations of all the parent's children. The client side then creates the node for the first time.

Once a node exists on the client side, it can be moved around via the insert() operations: insertChild(),
insertPredecessor(), insertSuccessor(). Each of these passes the request down the hierarchy: from controller
to UiNode to ViewNode to Node to Server, which sends the request from client side to server. The server
performs the necessary insert operation on the server side, updates the node's parent and sibling links,
and then sends a node rep back to the client, from whence it trickles back up the hierarchy, from node to ViewNode.

There is only one way that a node changes its relationship to the tree on the client side: via attachToTree().
Regardless of the originating operation, after the node has been updated by the server and a node rep has
been sent back to the client, the node is replaced in the client-side tree by the method ViewNode.attachToTree().

THE BASKET
The information tree has a special system node that is always present called the "basket". The basket can be used
as a temporary holding place for moving nodes around. Nodes that stay in the basket longer a certain period of time,
say 30 days, are deleted from the tree.

WHY THIS FILE CANNOT BE NAMED information_tree.js: probably because this is also the name of the toplevel folder
for the app. In any case, we get a circular dependency error when we try to name this file to information_tree.js.
 */
// ========================================================================
//                   InformationTree
// ========================================================================
var InformationTree = defCustomTag('information-tree', HTMLElement);

/* Initialize an empty information tree.
   To add root nodes to the tree, see setLocalRootsFromRefs()

   Note that the information tree object is a dom element with child dom elements, but
   that this initialization method does *not* attach it to the dom.
   That is done by the ITA object, whose job is to hold pointers to all top-level app modules
   and to initialize the initial page. See ITA.init().
*/
InformationTree.prototype.afterCreate = function() {
  this.localRoots = [] // See documentation on the Local Root Methods section below.
  $(this).click(this.onClick)
};

// TODO: This is not DRY. Should ask the server to tell us this.
InformationTree.prototype.TOP_NODE_TYPE_ID    = -1
InformationTree.prototype.BASKET_NODE_TYPE_ID = -2


// ========================================================================
//                   Local Root Methods
// ========================================================================
/*
The Information Tree employs the concept of a "local root". This is a uiNode that is shown
on the client-side as a root node (no parents), whether or not it actually has parents on the server side.
This feature allows the user to browser sub-trees of the full tree by asking the ui to display any node at all
as though it were a local root.

Below are methods dealing with the adding and removal of local roots. There can be an arbitrary number of local roots
in principle, but in practice the ui allows for exactly 2 at a time: a designated local root, and the system "basket" node,
which must always be displayed.
*/

/*
 Return true if and only if uiNode is functioning as a local root.
 */
InformationTree.prototype.isLocalRoot = function (uiNode) {
  return this.localRoots.some(function(n) {return n === uiNode})
}

/*
 Return an array of the local root nodes, listed in order of increasing y-position.
 */
InformationTree.prototype.getLocalRoots = function () {
  return this.localRoots
}


/*
 Initialize the information tree from the node references passed in as rootRefs.
 These will function locally as root nodes of the tree as observed by the user on the client,
 whether or not the nodes are actually root nodes of the complete information tree on the server.

 Note that the client side can establish a tree rooted on nodes that are not true roots, i.e.,
 they can have parents in the information tree proper. This ability to establish a non-true-root as
 a root on the client side allows the user to peruse sub-trees.

 NOTE: The caller should ensure that rootRefs includes the basket node, which is a special system node.
 */
InformationTree.prototype.setLocalRootsFromRefs = function (rootRefs) {
  this.clearLocalRoots() // Note: can't just clear the tree as a dom element, because it contains hidden menus that we want to keep.

  rootRefs.forEach(function (node) {
    // We found the basket node--save it but don't append to body just yet.
    if (node.type_id == this.BASKET_NODE_TYPE_ID) {
      this.basket = new UiBasketNode(new BasketNode(node))

    // We found a root node--make it be a UiRootNode
    } else {
      var uiNode    = new UiRootNode(new Node(node))
      this.addLocalRoot(uiNode)
      $(this).append(uiNode)
    }
  }, this)

  $(this).append(this.basket)
  this.addLocalRoot(this.basket) // Add this last so that it will be the last root node searched for insert operations.
}


/*
 Establish new root-level nodes for the information tree. The list passed in is a set of
 uiNodes that already exist in the dom.
 */
InformationTree.prototype.setLocalRoots = function (localRoots) {
  // Make sure no root is a descendant of basket. (If it were, then we'd be showing
  // both the basket and one of its descendants as roots, which would be bad.)
  localRoots.forEach(function (root) {
    var path = root.path()
    if ( (path[0] === this.basket) && (path.length > 1)) {
      throw "Cannot set a descendant of the basket as a local root"
    }
  }, this)

  // Make sure basket is present in set of new roots.
  if (!(localRoots.some(function(n) {return n === this.basket}))) {
    localRoots.push(this.basket)
  }

  this.clearLocalRoots()
  localRoots.forEach(function (root) {
    this.addLocalRoot(root)
  }, this)
}


// Remove all root nodes from the tree. This leaves ui elements like menus intact, but
// empties the tree of all logical content.
InformationTree.prototype.clearLocalRoots = function () {
  this.getLocalRoots().forEach(function (uiNode) {
    $(uiNode).detach() // Note: We use detach() rather than remove because we might be re-appending the node later. Apparently append() does not re-attach the event handlers that get stripped when remove() is called.
  })
  this.localRoots = []
}

/*
Make uiNode be treated as a local (client-side) root of the information tree.
A local root is displayed as having no parent on the client-side tree, even though it may have a parent on the
server-side tree.
*/
InformationTree.prototype.addLocalRoot = function (uiNode, prepend) {
  if (this.isLocalRoot(uiNode)) return; // Do nothing if we're already a root

  if (prepend) {
    this.localRoots.unshift(uiNode)
    $(this).prepend(uiNode)
  } else {
    this.localRoots.push(uiNode)
    $(this).append(uiNode)
  }
}

/*
 Remove uiNode as a client-side root of the information tree.
This removes it from the list of local roots and detaches it from the dom.
 */
InformationTree.prototype.removeLocalRoot = function (uiNode) {
  var roots = this.localRoots
  for(var i = 0; i < roots.length; i++) {
    if (roots[i] === uiNode) {
      roots.splice(i, 1)
      $(uiNode).detach()
      return
    }
  }
}

/*
localRoot should be a local root. Replace it with ancestor as the new local root.
 */
InformationTree.prototype.replaceLocalRootWithAncestor = function (localRoot, ancestor) {
  if (!this.isLocalRoot(localRoot)) throw "Could not find local root with id " + localRoot.id

  this.removeLocalRoot(localRoot)
  this.addLocalRoot(ancestor, true)
  localRoot.attachToTree()
}


/*
Return the uiNode that is the last common ancestor of nodes uiNode1 and uiNode2, or null
if there is no common ancestor.
 */
InformationTree.prototype.lastCommonAncestor = function(uiNode1, uiNode2) {
  var path1  = uiNode1.path()
  var path2  = uiNode2.path()
  var lca    = null
  var minLength    = Math.min(path1.length, path2.length)

  for(var i = 0; i < minLength; i++) {
    if (path1[i] === path2[i]) {
      lca = path1[i]
    } else {
      break
    }
  }

  return lca
}

/*
 This method is called by Controller.visitNode(). uiNode is a node that has been downloaded from the server
 and instantiated on the client side, but which may not be in the information tree at the moment, because
 the information tree may be showing a sub-tree that does not include uiNode.

 If uiNode is not in the present sub-tree, then we need to augment the present sub-tree by replacing its
 current local root with the last-common-ancestor of uiNode and the current local root.

 Note that it is possible for a tree to have multiple root nodes, but only when showing the top-level root nodes of the entire tree. When showing
 a sub-tree, there will only be a single root node (other than the basket node), which will be the root of the sub-tree.

 Corner case: uiNode may have no last-common-ancestor with the current root, because there are at least two top-level
 roots: Top, and Basket. If, for example, we are showing just the basket as a sub-tree and we ask to see a descendant of Top, then
 the basket and the descendant of Top will have no lca. In that case, we simply add the requested node to the tree
 as an additional root.
 */
InformationTree.prototype.maybeAugmentTree = function (uiNode) {
  if (this.find(uiNode.id, true)) return; // Our node is already in the tree, so do nothing.

  var currentRoot = this.getLocalRoots()[0]
  var lca         = this.lastCommonAncestor(uiNode, currentRoot)

  // There is a common ancestor
  if (lca) {
    this.replaceLocalRootWithAncestor(currentRoot, lca)

  // There is no common ancestor: just add uiNode as a local root.
  // TODO: This might be buggy. We can't guarantee that the root added should be prepended at the top of the root node list.
  // But, given the current UI, where sub-trees always consist of a single root + basket, it seems robust.
  } else {
    this.addLocalRoot(uiNode, true)
  }
}


InformationTree.prototype.onClick = function (event) {
  ITA.controller.resetMenus();
}


/*
 Return an array of all the nodes in the text tree that are currently visible.
 Return the nodes in order of descending y-value. This means that every visible node will
 be preceded by its older siblings, all their visible descendants, and by its parent.
 */
InformationTree.prototype.expandedViewNodes = function() {
  var result = []
  this.getLocalRoots().forEach(function(uiNode) {
    result = uiNode.expandedViewNodes(result);
  })
  return result
}

/*
Find the lowest node in the information tree above y-position y, expressed in document coords.
The upper left of the document is always 0,0. But the information tree div is scrollable.
If an object is scrolled above the top of the document, it will have a negative y coord.
 */
InformationTree.prototype.findLowestNodeAbove = function(y) {
  var uiNodes = this.expandedViewNodes().reverse();
  for(var i = 0; i < uiNodes.length; i++) {
    var uiNode = uiNodes[i];

    // Ignore any "phantom" node that does not have an id.
    if (!uiNode.id) {
      continue;
    }

    if ($(uiNode).offset().top < y) {
      return uiNode;
    }
  };
}


/*
 If it currently exists in the dom, return the UiNode with the specified id.
 If it does not exist, behavior depends on noError. Default is to throw an error
 unless noError is true.
 */
InformationTree.prototype.find = function(id, noError) {
  var $uiNode = $('#' + id);
  if ($uiNode.length > 0) {
    return $uiNode[0];
  } else if (!noError) {
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
  var foundUiNode = this.find(node.id, true);
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
  return this._findOrCreateUiNode(node).attachToTree();
}


InformationTree.prototype.addUiNodes = function(nodes) {
  return nodes.map(this.addUiNode.bind(this));
}

/*
Set the information tree's scroll parameters such that uiNode is at the top of the tree's div.

 MATH NOTES:
 To do this, we set the scroll parameters of the information-tree element
 to be its current scrollTop plus the element's top in view coords, which scrolls the element up that many pixels.
 Then, to correct for the fact that the info tree is beneath a header div element, we subtract the position of the
 tree top itself.
 */
InformationTree.prototype.scrollTo = function (uiNode) {

  var self = this

  // Make sure this node is revealed in the dom; otherwise, we can't scroll to it.
  // We wait until all expansions are completed before calculating the proper scroll position.
  uiNode.reveal(function() {
    var scrollTarget = self.scrollTop + uiNode.getBoundingClientRect().top - self.getBoundingClientRect().top
    $(self).animate({scrollTop:scrollTarget})
  })
}
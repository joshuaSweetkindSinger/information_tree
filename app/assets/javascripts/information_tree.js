/*
This file defines client-side functionality for the information-tree sub-app.
TODO: Obsolete documentation. Update this.
This defines dom tag classes for the node hierarchy of an information tree.
The structure is as follows:
TextTree: a single node of this type is put in a static html file, which initiates the dynamic
          creation of a text tree when the html file is loaded into the browser, via its custom tag constructor.
          A text tree is made up of TextNodes.
TextNode: has two child elements, called NodeHeader and NodeChildren.
NodeHeader: represents content for the node.
NodeChildren: represents a container for sub-nodes. Its only children are of type TextNode.

Text Nodes are stored in the db in the nodes table. When the client-side expands a node, it asks the db for its children,
which get sent as json, and then the client builds the nodes on the browser.

New nodes are created by sending an async request to the server to create the new node.

Some terminology, and discussion of the relationship between server and client:
The server is the place where nodes get created. The client requests that the server create a node
by sending it a nodeSpec to the proper endpoint. The server responds with a nodeRep. Both of these
are identical-looking json objects. The name nodeSpec indicates a request to create an object with
certain properties. The name nodeRep indicates that a representation of the now-existing object
has been sent back to the client.

TOPLEVEL OBJECTS:
Controller: Controls all UI interactions.
TreeView:   Client-side representation of the information tree.
Server:     Mediate all api calls to the server.
*/

/*
 TODO: Make New Node get deleted on blur if nothing changed.
 TODO: Think about nodespec, noderep, and node. All of these should be nodespecs and anything
 that takes a nodespec should take the others. Does addNode always add a new node, or sometimes an existing one?
 If the latter, how did the new node get created? What are the right primitives? Does it always go through the server first?
 Is there a way to do some things on client side first? What are right primitives for creation and movement of nodes?
 Primitives: server side: Node.new() creates a new node on server side. Node.insert(node, insertionPoint) inserts a node at the right place.
 server side: Node.getTop(), Node.getTrash(), Node.get(:id) return specific nodesReps.
 server side: addNodeOnServer(nodeSpec, insertionPoint) creates a new node on server at insertion point.
 server side: getNodeFromServer(ref) returns a nodeRep for the referenced node.
 client side: addNodeOnClient(nodeRep) attaches a rep from the server to the client side tree.
 Server side node primitives: create, read, update, delete, trash, move, children.
 Client side node primitives: create, update, trash, move, expand.
 TODO: fix rank calculation. Do we need predecessor and successor in db?
 TODO: Make the trash node visible in hierarchy: Top has children named User and System. But Trash and Basket under System.
 TODO: There's an ambiguity between node.content and node.header.content. The former returns the text of node.header.content.
 The latter returns the content dom object, which is a textarea element.
 TODO: look for refs to stopPropagation() and preventDefault() and make sure they're necessary.
 TODO: all the various UI dom components should simply defer to the ui controller for their functionality.
 They should bind event handlers, but then pass the event to the ui controller for actual processing.
 They are like sockets, with functionality to be plugged in by the ui controller.
 TODO: hitting return on an empty node should delete the node.
 TODO: Consider having hit return on a node put you in edit mode for the node, equal to clicking on it.
 This presupposes we're not always in edit mode.
 TODO: implement cut/copy/paste, and put cut nodes in "the basket".
 TODO: Refactor for layers:
 Top layer is the UI. It orchestrates all user-initiated action. It handles all events. It introduces
 ui concepts like cut/paste, the clipboard, the trash, etc. Any data-entry or modification of the
 tree must be mediated by the ui. The ui consists of a controller and dom elements. The dom elements
 represent the tree and ui-related decorations such as pop up menus. The tree and its nodes
 are represented by dom elements, but these dom elements are wrappers on underlying client-side
 object that are *not* dom elements. These client-side objects represent the fundamental objects
 that are the nodes of the tree, their relationships to each other, and the tree object itself.
 These objects, in turn, are backed by server-side cognates.

 The UI gets its job done as follows. User actions are intercepted by event handlers on dom
 elements. These dom elements are formally part of the ui layer. Each dom element will most
 likely handle the event by passing it to the ui controller, which will coordinate all actions,
 but some events might be handled directly by the dom element. The majority of
 user-actions entail modification of a node. This achieved by sending a message to the associated
 client-side node object, which is NOT part of the UI. This is the middle layer, which is the client
 side model. These client-side objects, in turn, get their job done by making api calls to the server
 to effect changes on the server side. They also handle responses from the server to update their
 state, which they forward to their ui representations, so that the ui can render the state
 change appropriately.
 UI <--> client-side model <--> server-side api

 Main Components:
 Controller: handles all client-side UI interactions
 Server: client side object that mediates interactions with the server.
 Tree: represents the entire tree.
 Node: Represents a single node in the tree.
 */

//(function () { // Wrap everything in an anonymous function call to hide some globals.

// ========================================================================
//                   Application Object
// =========================================================================
window.InformationTreeApp = {}; //

var App = window.InformationTreeApp; // nickname for our namespace
var IT  = App; // TODO: Get rid of references to this. This is deprecated.

App.initPage = function() {
  this.server     = new Server;
  this.treeView   = $('information-tree')[0].init();
  this.tree       = this.treeView; // TODO: deprecated

  this.controller = new Controller;
  this.ui         = this.controller; // TODO: deprecated
}



// ========================================================================
//                   Server API
// ========================================================================
var Server = function () {

}

Server.prototype.top = function(callback) {
  return new JsonRequest("GET", this.topNodePath(), callback)
}


Server.prototype.topNodePath = function() {
  return '/nodes/top.json'
}



// ========================================================================
//                   User Interface
// ========================================================================
/*
Although everything on the client side is in some sense user-interface, here we are specifically
designating a Ui object whose methods are those that respond directly to browser events and
whose member variables are those that keep track of Ui state, such as selected objects, etc.

The Ui gets its job done by calling lower-level client-side methods, which manipulate
client-side objects. These lower-level methods
do not belong to the ui and are distinguished by being callable in different ui contexts.

Rather than making the Ui functionality be distributed across various classes, according to which dom
object is receiving the click, we instead coalesce the full set of ui functionality in one place, which
makes these methods more "functional" in the approach, because each ui function will need to be told an object-of-interest
to act on. Under normal circumstances, it would be more natural to just associate the functionality as a method on the
object of interest.
*/
Controller = function () {
  var self = this;

  this.selectedNode = null // The Ui maintains a "selected node", to which actions are performed.
  this.buttonPanel  = new ButtonPanel;

  App.treeView.then(function() {
    $(App.treeView).append(self.buttonPanel);
    $(self.buttonPanel).hide();
    self.selectNode(App.treeView.top);
  });


  // Trash the selected node.
  self.trash = function (node) {
    node = node || self.selectedNode
    node.trash();
    if (node === self.selectedNode) {
      self.selectedNode = null;   // We just deleted the selected node, so now there is none.
      $(self.buttonPanel).hide(); // we just deleted the selected node, so hide the button panel.
    }
  };

  // Respond to a left-click on a node. Select the node and toggle the expanded-collapsed state of that node.
  self.clickLeftOnNode = function (node) {
    self.selectNode(node);
  }

  // Respond to a right-click on a node. Select the node and pop up the command menu.
  self.clickRightOnNode = function (node, event) {
    self.selectNode(node);
    self.buttonPanel.popTo(node);
    event.preventDefault();
  }


  /*
   Select the specified node.
   */
  self.selectNode = function (node) {
    self.selectedNode = node;
  }


  // Toggle the expanded-collapsed state of node.
  self.toggleNodeExpandCollapse = function (node) {
    (node || self.selectedNode).toggle(false);
  }


  /*
   Child can be null, in which case a new node will be created.
   If a new node will be created, then we pass a callback to move focus to the new node
   after it is added.
   */
  self.addChild = function (parent, child) {
    (parent || self.selectedNode).addChild(child, child ? null : self._addNodeUiCallback);
  }

  // Callback to the Ui after the server has given us a new node.
  self._addNodeUiCallback = function (newNode) {
    newNode.header.content.placeholder = "New Node";

    // Hack! For some reason, sometimes, a sequence of blur events occurs that undoes
    // the focus() below, because the blurs occur after the focus.
    setTimeout(function() {
      $(newNode.header.content).focus()
    },
    100);
  }

  // Add successor as the successor of predecessor. If successor is null, create a new node
  // and set the focus to it.
  self.addSuccessor = function (predecessor, successor) {
    (predecessor || self.selectedNode).addSuccessor(successor, successor ? null : self._addNodeUiCallback);
  }

  // Add predecessor as the predecessor of successor. If predecessor is null, create a new node
  // and set the focus to it.
  self.addPredecessor = function (successor, predecessor) {
    (successor || self.selectedNode).addPredecessor(predecessor, predecessor ? null : self._addNodeUiCallback);
  }


  self.hideButtonPanel = function () {
    $(self.buttonPanel).hide()
  }

  self.followLink = function (node) {
    (node || self.selectedNode).followLink()
  }

  self.autoSize = function (node) {
    (node || self.selectedNode).autoSize()
  }

  // Copy node into the copiedNode holding area.
  self.copyNode = function (node) {
    self.copiedNode = (node || self.selectedNode);
  }

  // Cut node == copy + delete
  self.cutNode = function (node) {
    node = (node || self.selectedNode);
    self.copyNode(node);
    self.trash(node);
  }

  // Paste the copiedNode onto node.
  self.pasteNode = function (node) {
    (node || self.selectedNode).paste(self.copiedNode)
  }



  self.toggleExpandCollapseAll = function (node) {
    (node || self.selectedNode).toggle(true)
  }


  // TODO: the trash functionality needs to record information about the former parentage
  // and sibling relationships somewhere so that a trashed node can be restored later.
  self.restoreLastDeletedNode = function() {
    alert("Untrash has not yet been implemented");
  }

  self.setAttributes = function (node, attributes) {
    (node || self.selectedNode).setAttributes(attributes)
  }

  self.save = function (node) {
    node = node || self.selectedNode;
    var attributes = {
      content: node.content,
      width:   node.width,
      height:  node.height
    }
    self.setAttributes(node, attributes)
  }

  // This does nothing. Use it for testing.
  self.nop = function() {
  }
};

IT.Ui = Controller; // TODO: deprecated


// ========================================================================
//                   Tree View
// ========================================================================
var TreeView = defCustomTag('information-tree', HTMLElement);
IT.Tree = TreeView; // TODO: deprecated

TreeView.prototype.init = function() {
  var self = this;
  $(this).click(this.onClick); // TODO: These belong on an information-tree-view object.

  this.tree = (new Tree).then(function() {
    self.top = self.tree.top; // TODO: fix this. tree.top should not be a dom element.
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
IT.Tree.prototype.visibleNodes = function() {
  return this.top.visibleNodes([]);
}


IT.Tree.prototype.findLowestNodeAbove = function(y) {
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
IT.Tree.prototype.find = function(id) {
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
IT.Tree.prototype._findOrCreate = function(nodeRep) {
  var foundNode = this.find(nodeRep.id);
  return foundNode ? foundNode.update(nodeRep) : new NodeView(nodeRep);
}


/*
If it currently exists in the dom, merely update the text node whose id is nodeRep.id
with the other information contained in nodeRep, and return it.

If it does not yet exist in the dom, assume that nodeRep is a complete spec for a new node:
instantiate it and return the new node after glomming it to the text tree in its proper position.
*/
IT.Tree.prototype._addNodeOnClient = function(nodeRep) {
  return this._findOrCreate(nodeRep)._glom();
}


IT.Tree.prototype._addNodesOnClient = function(fetchedNodeReps) {
  return fetchedNodeReps.map(this._addNodeOnClient.bind(this));
}

// ========================================================================
//                   Tree
// ========================================================================
var Tree = function() {
  var self = this;

  // Tell the server to get the top node. When we get it, create a client-side NodeView and assign it to
  // member variable 'top'. In the meantime, store the request object on _topRequest.
  this._delayed = App.server.top().then(function(top) {self.top = new NodeView(top)});
}

/*
Execute callback when the tree instance is fully initialized.
 */
Tree.prototype.then = function (callback) {
  this._delayed.then(callback);
  return this;
}

// =========================================================================
//                   Node View
// =========================================================================
var NodeView = defCustomTag('node-view', HTMLElement);

 // Default json spec for a new node
NodeView.defaultSpec = {
  content:'',
  width:500,
  height:100
  }

// ======= Construction and Initialization
/*
Create a client-side representation of nodeRepOrDelayed, which exists on the server.
The object nodeRepOrDelayed is either a node representation, or a Delayed object
capturing an asynchronous call to the server, which will ultimately resolve to a nodeRep.

NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
need to pass args, which can only be passed via afterCreate().
 */
NodeView.prototype.afterCreate = function(nodeRep) {
  var $this = $(this)

  // Create dom-substructures
  // NOTE: These must be created before the properties below are assigned,
  // because some of them get passed into the substructures.
  this.header = new NodeHeader(this, {tooltip:"Created on " + nodeRep.created_at}); // TODO: this is inelegant. should use this.createdAt, but it hasn't been assigned yet, and can't be assigned before header node is created.
  // TODO: how do you handle re-initializing existing memory, as opposed to genning new memory, for instances?

  $this.append(this.header)

  this.childrenContainer = new NodeChildren;
  $this.append(this.childrenContainer)

  this.update(nodeRep) // Assign properties from node

  // Record client-side state info
  this.childrenFetched = false // True when we have received child node information from the server. See fetch_and_expand()
  this.collapse();             // Note: need to call this method, not just set state, so that child dom element will be hidden.

  $this.draggable({
    revert: true,
    helper: "clone",
    start: this.dragStart,
    stop: this.dragStop
  })
}


/*
A drag event just started. Erase the last drop target.
This function is called whenever a new drag event is initiated.
*/

NodeView.prototype.dragStart = function() {
  IT.tree.dropTarget = null;
}


/*
A drag event just ended. Determine whether we were dropped on top of another node,
or let go beneath a node, and do either an addChild() or an addSuccessor() accordingly.
*/
NodeView.prototype.dragStop = function(event, helper) {
  // There's a drop target: add a child
  if (IT.tree.dropTarget) {
    IT.ui.addChild(IT.tree.dropTarget, {id: this.id});
    return;
  }

  // There's a node above the release position: add a successor
  var node = IT.tree.findLowestNodeAbove(helper.position.top);
  if (node) {
    IT.ui.addSuccessor(node, {id: this.id});
  }
};


// Clean up the width and height after we are attached.
// The problem here is that width and height are set at create time, which is the only time
// during which we can pass in args, such as width an height. But, because the node is not yet
// attached to the DOM, the computed width and height are wrong somehow (not sure of details).
// So, we cache the width and height at create time and then clean it up by resetting at attach time.
NodeView.prototype.onAttach = function() {
  // The conditional is a kludge: For dragging, the nodeView gets shallow-copied and won't have a header.
  // In that case, we want to ignore it anyway.
  if (this.header) {
    this.width = this._width
    this.height = this._height
  }
}


// TODO: Rethink all this, especially width/height. Is this what we want?
Object.defineProperties(NodeView.prototype, {
    content: {
      get: function() {
        return $(this.header.content).val()
      },
      set: function(content) {
        $(this.header.content).val(content)
      }
    },

    width: {
      get: function() {
        return $(this.header.content).width()
      },
      set: function(v) {
        this._width = v // Cache requested width. This is a kludge to fix incorrect width at create time. See onAttach() above.
        $(this.header.content).width(v)
      }
    },

    height: {
      get: function() {
        return $(this.header.content).height()
      },
      set: function(v) {
        this._height = v // Cache requested height. This is a kludge to fix incorrect width at create time. See onAttach() above.
        $(this.header.content).height(v)
      }
    }
  }
);


/*
Update ourselves with new information from the server-side rep <node>.
In principle, this update could involve any of the fields of a node object.
As of this writing, we are really only interested in updating hierarchy links.

TODO: in future, make this clear and efficient. Probably want to take the node returned
by the server and just hook it up to a prototype and call it a day, and also find any existing
dom objects associated with the node and hook those up too. This may require some cleanup though
for the dom objects.
*/
NodeView.prototype.update = function(node) {
  this.set_id(node.id);

  this.type_id        = node.type_id
  this.parent_id      = node.parent_id;
  this.predecessor_id = node.predecessor_id;
  this.successor_id   = node.successor_id;
  this.rank           = node.rank;
  this.content        = node.content
  this.width          = node.width
  this.height         = node.height
  this.createdAt      = node.created_at;
  this.updatedAt      = node.updated_at;

  return this;
}

NodeView.prototype.set_id = function(id) {
  this.id = id;
  this.header.set_id(id);
  this.childrenContainer.set_id(id);
}

NodeView.prototype.visibleNodes = function(result) {
  result.push(this);
  if (this.state == 'expanded') {
    this.kids().forEach(function(node) {
      node.visibleNodes(result);
    });
  }
  return result;
}

// =========================================================================
//                    Text Node
// Tree Hierarchy Accessors And Manipulation Methods
// =========================================================================

/*
Attach ourselves to the Text tree. This is done just after a new
NodeView is created from a rep sent by the server to the client.

We figure out where to attach ourselves by examining our predecessor, successor,
and parent links. If we have one of the first two links, we know exactly where to attach
ourselves. If we have neither, then we must be the only child of our parent.

In all cases, make sure that our new parent has had its children downloaded from the server
before we glom ourselves to it; otherwise, we create an indeterminate state in which only some
of the parent's children are represented on the client side.
*/
NodeView.prototype._glom = function() {
  var relative;
  if (relative = this.predecessor()) {
    relative._attachSuccessor(this);
    return this;
  }

  if (relative = this.successor()) {
    relative._attachPredecessor(this);
    return this;
  }

  if (relative = this.parent()) {
    relative._attachChild(this);
    return this;
  }

  console.log("could not glom:", this);
};


NodeView.prototype._attachSuccessor = function(successor) {
  $(this).after(successor);
  return this;
};


NodeView.prototype._attachPredecessor = function(predecessor) {
  $(this).before(predecessor);
  return this;
};


/*
NOTE: This method will only be called by glom() if the parent has no children yet.
*/
NodeView.prototype._attachChild = function(child) {
  $(this.childrenContainer).append(child);
  return this;
};


/*
Search the dom for a NodeView whose id matches the predecessor id of this
and return it if found.
*/
NodeView.prototype.predecessor = function() {
  return IT.tree.find(this.predecessor_id);
};


/*
Search the dom for a NodeView whose id matches the predecessor id of this
and return it if found.
*/
NodeView.prototype.successor = function() {
  return IT.tree.find(this.successor_id);
};


/*
Search the dom for a NodeView whose id matches the parent id of this
and return it if found.
*/
NodeView.prototype.parent = function() {
  return IT.tree.find(this.parent_id);
}

NodeView.prototype.kids = function() {
  return $(this.childrenContainer).children().get();
}

// =========================== Add Node
/*
Ask the server to add a child or sibling node, specified by <nodeSpec>,
to the node represented by <this> text node. After the server
responds with a success code, effect the same changes on the client-side.

If nodeSpec is null, create a new default node.

If nodeSpec is non-null and fully spec'd,
but without an id, create a new node as specified.

If nodeSpec is non-null, but just contains an id, use the existing node
with that id for the add operation and move it to the new location (child or sibling)
relative to <this>.

mode determines how node is moved relative to <this>, as either a child, successor, or predecessor
of the node represented by <this>. mode should be a string, one of: 'child', 'successor', 'predecessor'

callback is a function that gets executed after the node has been returned from the server, and only if the
request was successful.

NOTES: nodeSpec is a hash that specifies a new node, or names an existing one, but it is *not* a node object.
       nodeRep is a hash that represents a node on the server side. It contains complete info, but it is not
          a client-side node object.
       node is a client-side node object.
*/
NodeView.prototype._addNode = function(nodeSpec, mode, callback) {
  if (!nodeSpec) {
    nodeSpec = NodeView.defaultSpec;
  }

  var me = this;
  this._addNodeOnServer(nodeSpec, mode,
    function(nodeRep) {
      if (nodeRep.error) {
        me._reportAddNodeOnServerError(nodeRep, mode);
        return;
      };

      var node = IT.tree._addNodeOnClient(nodeRep);
      if (callback) callback(node);
    });
};

NodeView.prototype._reportAddNodeOnServerError = function(node, mode) {
  console.log("Got an error attempting to add this node on the server:", node);
  window.debug = node;
  return;
}


/*
Create a new node on the server, or insert an existing one at a new location.
Attach it to the text node tree at a position relative to the node named by <this>
as indicated by mode, which must be one of 'add_child', 'add_successor', 'add_predeessor'.
Then execute the function next() when done.
Inputs:
  node: if creating a new node, this should be an object that specs out the desired new node.
        If adding an existing node, then this should just be an object with an id whose
        value is the id of the existing node.
  mode: one of 'add_child', 'add_successor', 'add_predecessor'.
  next: This is a continuation function that says what to do after the node is created or inserted.
*/
NodeView.prototype._addNodeOnServer = function(node, mode, next) {
  getJsonFromServer(
    "POST",
    this._addNodePath(),
    next,
    {node: node, mode:mode}
  );
};


NodeView.prototype._addNodePath = function() {
  return '/nodes/' + this.id + '/add_node.json'
}

/*
Create a new node on the server or insert an existing one, in either case making the
node represented by this node be its parent. Then effect the same transformation
on the client side.
*/
NodeView.prototype.addChild = function(node, callback) {
  // null node means we're creating a new node as opposed to moving an existing one.
  // Make sure we are expanded so that the new child node can be seen.
  if (!node) this.expand();

  this._addNode(node, 'add_child', callback);
}


/*
Create a new node on the server or insert an existing one, in either case making the
node represented by this node be its predecessor. Then effect the same transformation
on the client side.
*/
NodeView.prototype.addSuccessor = function(node, callback) {
  this.parent().expand(); // Make sure that our parent is expanded so that the new node can be seen.
  this._addNode(node, 'add_successor', callback);
}


/*
Create a new node on the server or insert an existing one, in either case making the
node represented by this node be its successor. Then effect the same transformation
on the client side.
*/
NodeView.prototype.addPredecessor = function(node, callback) {
  this.parent().expand(); // Make sure that our parent is expanded so that the new node can be seen.
  this._addNode(node, 'add_predecessor', callback);
}


// ========================== Paste
// Paste node onto ourselves. This means adding it as a child.
NodeView.prototype.paste = function(node) {
  this.addChild({id: node.id});
};

// =========================== Trash
// Ask the server to trash this node from the hierarchy.
// When the server replies, trash the node from the browser.
NodeView.prototype.trash = function() {
  var me = this
  sendServer(
    "DELETE",
    this._trashPath(this.id),
    function(request) {
      if (HTTP.is_success_code(request.status)) {
        me._trashOnClient();
      }
    })
}

NodeView.prototype._trashPath = function(id) {
  return '/nodes/' + id + '/trash.json'
}


/*
Get rid of <this> from the text tree.
*/
NodeView.prototype._trashOnClient = function() {
  $(this).remove()
}


// =================== Expand / Collapse
/*
Expand this node. Expansion means:
  - fetch all children from server if they have not yet been fetched.
  - attach them to this node as children on the client side.
  - make sure they are displayed and not hidden.
  - if doRecursive is true, then recursively invoke expand() on each of the child nodes.
PROGRAMMER's NOTE: As written, the recursive expansion won't reveal smoothly in the dom,
because it launches several server-side threads asynchronously and updates the dom as they finish.
To do this correctly, we would need to launch all the asynchronous threads but have a manager in charge
that noticed when the last one finished, only then invoking the show() that would expand the toplevel
node. Another approach would be to have the server calls block until they are finished.
*/
NodeView.prototype.expand = function(doRecursive) {
  var me = this;
  this._fetchAndAddChildrenOnClient(
    function() {
      me._expand();
      if (doRecursive) {
        me.kids().forEach(function(node) {node.expand(true)});
      }
    });
}


/*
Fetch our child nodes from the server, if necessary; attach each newly fetched
child node to the tree on the client-side;
Finally call continuation with the array of newly created text nodes from the
representations that were fetched, or call continuation with [] if none were fetched.
*/
NodeView.prototype._fetchAndAddChildrenOnClient = function(callback) {
  this._fetchChildren(
    function(fetchedNodes) {
      if (fetchedNodes) {
        callback(IT.tree._addNodesOnClient(fetchedNodes));
      } else {
        callback([]);
      }
    });
}


/*
Get our child nodes from the server, in json format, and pass this json structure
to continuation for further processing. This method does *not* attach the fetched nodes
to the tree on the client side. It *does* record that the children have been fetched.
So it leaves the state of the client-side in a precarious way if things should be aborted here.
It should only be called by expand(), who knows what it's doing.
*/
NodeView.prototype._fetchChildren = function(callback) {
  if (this.childrenFetched) {
    callback(false); // Pass false to the continuation to indicate that no children were fetched.
  } else {
    var me = this;
    getJsonFromServer("GET", this._childrenPath(this.id),
      function(fetchedNodes) {
        me.childrenFetched = true;
        callback(fetchedNodes);
      });
  }
}


NodeView.prototype._childrenPath = function(id) {
  return '/nodes/' + id + '/children.json'
}


/*
Do the client-side stuff necessary to xxpand this node,
which means revealing its children and showing its button panel.
This is a helper method called by expand(). The parent method takes care
of ensuring that this node already has its children fetched from the server.
*/
NodeView.prototype._expand = function() {
  if (this.state == 'expanded') return; // Already expanded, so do nothing.

  this.state = 'expanded'
  $(this).children('node-children').show('slow')
}


// Collapse this node, which means hiding its children and hiding its button panel.
NodeView.prototype.collapse = function(doRecursive) {
  this.state = 'collapsed'
  var nodeChildren = $(this).children('node-children')
  nodeChildren.hide('slow')

  if (doRecursive) {
    nodeChildren.children().each(function(index) {
      this.collapse(doRecursive)
    })
  }
}

  NodeView.prototype.toggle = function(doRecursive) {
  if (this.state == 'expanded') {
    this.collapse(doRecursive)
  } else {
    this.expand(doRecursive)
  }
}


// =================== Auto-Size
// Calculate a pleasing size for the content textarea associated with this text node.
NodeView.prototype.autoSize = function() {
  this.setAttributes(this.calcAutoSize())
}

// Calculate a pleasing width and height for a textarea input box that contains n chars.
// Return the calculated values as a hash.
// TODO: Get rid of magic numbers, and make calculation take font size into account.
// TODO: height is not set correctly for large amounts of text. Fix it.
NodeView.prototype.calcAutoSize = function() {
  var n = this.content.length
  var maxWidth = 1000.0
  var charWidth  = 8.0
  var charHeight = 15.0
  var margin     = 10.0
  var width = 0
  var height = 0
  if (n < 60) {
    width  = n * charWidth
    height = 1 * charHeight + margin
  } else {
    var squareSideChars = Math.sqrt(n) // The number of chars on a side, assuming a square region with charWidth = charHeight
    var distortedWidthChars = 1.5 * squareSideChars * charHeight / charWidth // square it up in char units by taking width/height pixels into account, and make width 1.5 longer for good measure.
    width = Math.min(maxWidth, distortedWidthChars * charWidth) // Want the width to be 1.5 the height in pixels for smaller bits of text.
    var widthInChars = width / charWidth
    var heightInChars = n / widthInChars
    height = heightInChars * charHeight + margin
  }

  return {width:width, height:height}
}

// =========================== Follow Link
// Open up in a new tab (or window) the URL represented by our node's content.
NodeView.prototype.followLink = function() {
  var url = this.content
  if (url.slice(0,4) == 'http') open(url)
}

// ======================== Set Attributes

// Set attributes for this node. The attributes to change, and their values,
// are in options, which is a hash. The hash is sent to the server, to change the values
// on the server first, and then the server replies with a json that represents the changed node.
// Note: This does not allow you to set attributes affecting topology, e.g.: parent_id, rank.
// Attributes which can be set are: content, width, height.
NodeView.prototype.setAttributes = function(options) {
  var me = this
  getJsonFromServer(
    "PUT",
    this.setAttributesPath(this.id),
    function(jsonNode) {
      // We got an error back from the server--punt
      if (jsonNode.error) {
        console.log("***** Set Attributes: server responded with this error:", jsonNode.error)
        return
      }

      me.setAttributesOnClient(jsonNode)
    },
    {node: options}
  )
}

NodeView.prototype.setAttributesPath = function(id) {
  return '/nodes/' + id + '/set_attributes.json'
}


NodeView.prototype.setAttributesOnClient = function(jsonNode) {
  if (jsonNode.id != this.id) {
    throw("Mismatching ids: id from server (" + options.id + ") does not match id on client (" + this.id + ").")
  }

  var $this = $(this)
  if (jsonNode.content) this.content = jsonNode.content
  if (jsonNode.width) this.width     = jsonNode.width
  if (jsonNode.height)this.height    = jsonNode.height
}



// =========================================================================
//                   Node Header
// =========================================================================
/*
NodeHeader is a container for the node's content and buttons.
*/
var NodeHeader = defCustomTag('node-header', HTMLElement)
NodeHeader.prototype.afterCreate = function(nodeView, options) {
  var $this = $(this)
  this.nodeView = nodeView

  this.expandCollapseButton = new ExpandCollapse(nodeView)
  $this.append(this.expandCollapseButton)

  this.content = new NodeContent(nodeView, options);
  $this.append(this.content)
}

NodeHeader.prototype.set_id = function(id) {
  this.id = 'NodeHeader-' + id;
  this.content.set_id(id);
}


// =========================================================================
//                   Button Panel
// =========================================================================
/*
ButtonPanel is a container for the node's buttons.
*/
var ButtonPanel = defCustomTag('button-panel', HTMLElement)
ButtonPanel.prototype.afterCreate = function() {
  var $this = $(this)

  // this.nop = new Nop
  // $this.append(this.nop)

  this.expandCollapseRecursiveButton = new ExpandCollapseRecursive
  $this.append(this.expandCollapseRecursiveButton)

  this.saveButton = new Save
  $this.append(this.saveButton)

  this.addChildButton = new AddChild
  $this.append(this.addChildButton)

  this.addSuccessorButton = new AddSuccessor
  $this.append(this.addSuccessorButton)

  this.addPredecessorButton = new AddPredecessor
  $this.append(this.addPredecessorButton)

  this.copyButton = new CopyNode
  $this.append(this.copyButton)

  this.pasteButton = new PasteNode
  $this.append(this.pasteButton)

  this.followLinkButton = new FollowLink
  $this.append(this.followLinkButton)

  this.trashNodeButton = new TrashNode
  $this.append(this.trashNodeButton)

  this.untrashNodeButton = new UntrashNode
  $this.append(this.untrashNodeButton)

  // Hide button panel after it is clicked on.
  $this.click(this.onClick)
}

/*
Move button panel to float above node.
Programmer's Note: In the case in which the selected node is deleted, we hide the button panel.
If we then select a new node and change the button panel's offset before showing it, it shows up
in the wrong place in the dom. Not sure why. But if you show the panel before setting the offset,
then everything works okay.
*/
ButtonPanel.prototype.popTo = function(node) {
  $(this).show(); // I'm not sure why, but showing this before doing new offset avoids a bug. See documentation above.
  var offset = $(node).offset();
  var left   = offset.left,
      top    = offset.top;
  $(this).offset({left:left-102, top:top}); // TODO: Remove hardcoded constant.
}

  ButtonPanel.prototype.onClick = function() {
    $(this).hide()
  }


// =========================================================================
//                   Node Content
// =========================================================================
// NodeContent holds the text that represents the content of the node.

var NodeContent = defCustomTag('node-content', HTMLTextAreaElement, 'textarea')

NodeContent.prototype.afterCreate = function(nodeView, options) {
  var $this = $(this);
  var self  = this;

  this.nodeView = nodeView;

  $this.addClass('node-content'); // Since we are extending a text-area element, we can't put css on the node-content tag--there isn't one in the dom!
  $this.on("click", this.onClick);
  $this.on("blur", this.onBlur)
  $this.on("contextmenu", this.onContextMenu);
  $this.on("keypress", this.onKeypress)

  this.title = options.tooltip;

  $this.droppable({
    tolerance: "pointer",
    hoverClass: "drop-hover",
    greedy: true,
    drop: this.handleDrop
  })
}


// Handle a left click in the text area.
NodeContent.prototype.onClick = function (event) {
  return IT.ui.clickLeftOnNode(this.nodeView);
}


/*
This somewhat awkward intermediary is necessary because, at create time, we don't have
a pointer to the Node parent from the NodeContent object. So we create a delegator
that will work at click-time.
*/
NodeContent.prototype.onContextMenu = function(event) {
  return IT.ui.clickRightOnNode(this.nodeView, event);
}

NodeContent.prototype.onKeypress = function(event) {
  // carriage return -- create new successor node
  if (event.charCode == 13 && !event.altKey && !event.shiftKey && !event.ctrlKey) {
    event.preventDefault();
    IT.ui.addSuccessor(this.nodeView);

  // shift-return -- create new child node
  } else if (event.charCode == 13 && !event.altKey && event.shiftKey && !event.ctrlKey) {
    event.preventDefault();
    IT.ui.addChild(this.nodeView);

  // control-c -- copy this node
  } else if (event.charCode == 'c'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    App.controller.copyNode(this.nodeView);

  // control-v -- paste the copied node onto this node.
  } else if (event.charCode == 'v'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    App.controller.pasteNode(this.nodeView);

  // control-x -- cut this node
  } else if (event.charCode == 'x'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    App.controller.cutNode(this.nodeView);
  }
}


/*
Handle a drop event. We were just dropped on top of a node.
Record the drop target so that we can be added as a child when the drag event finishes.
Note: It seems that a single mouse-release can generate two drop events, one of them a phantom.
Not sure why. But the "true" drop event is recognizable because the associated drop node will have an id.
We only record this node as the drop target, not the phantom. I believe the phantom has to do with
the cloned helper node that is created as part of the drag.
*/
NodeContent.prototype.handleDrop = function(event, ui) {
  var nodeView = this.nodeView;
  if (nodeView.id) {
    IT.tree.dropTarget = nodeView;
  }
};


NodeContent.prototype.set_id = function(id) {
  this.id = 'NodeContent-' + id;
}


// This event-handler is bound to the object's blur event.
// It causes the content of the node to change on the server.
NodeContent.prototype.onBlur = function(e) {
  var autosize = this.nodeView.calcAutoSize();
  IT.ui.setAttributes(this.nodeView,
    {content: this.nodeView.content,
       width: autosize.width,
      height: autosize.height})
}

// This event-handler is bound to the object's blur event.
// It causes the width and height of the node's text area to change on the server.
NodeContent.prototype.onResize = function(e) {
}


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

// =========================================================================
//                   Expand / Collapse Button
// =========================================================================
var ExpandCollapse = defCustomTag('expand-collapse', HTMLElement)

ExpandCollapse.prototype.afterCreate = function(nodeView) {
  this.nodeView = nodeView

  $(this).html('>');

  $(this).click(function(event) {this.toggle(event)})
}


ExpandCollapse.prototype.toggle = function() {
  $(this).html(this.nodeView.state === 'expanded' ? '>' : 'v')
  IT.ui.toggleNodeExpandCollapse(this.nodeView);
}

// =========================================================================
//                   Button Panel Button
// =========================================================================
// Base class for button panel  buttons.
var ButtonPanelButton = defCustomTag('button-panel-button', HTMLElement)

ButtonPanelButton.prototype.afterCreate = function() {
  $(this).addClass('button-panel-button')
}

// =========================================================================
//                   Nop Button
// =========================================================================
// Pressing this button does nothing but trigger a no-op control flow.
var Nop = defCustomTag('nop-nop', ButtonPanelButton)

Nop.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Nop')
  $this.click(this.onClick)
}

Nop.prototype.onClick = function(event) {
  IT.ui.nop()
}


// =========================================================================
//                   FollowLink Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var FollowLink = defCustomTag('follow-link', ButtonPanelButton)

FollowLink.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Follow Link')
  $this.click(function(event) {IT.ui.followLink()})
}


// =========================================================================
//                   Save Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var Save = defCustomTag('save-node', ButtonPanelButton)

Save.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Save')
  $this.click(this.onClick)
}

Save.prototype.onClick = function(event) {
  IT.ui.save()
}


// =========================================================================
//                   Copy Button
// =========================================================================
// Pressing this button copies the selected node to the copy buffer for later pasting.
var CopyNode = defCustomTag('copy-node', ButtonPanelButton)

CopyNode.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Copy')
  $this.click(this.onClick)
}

CopyNode.prototype.onClick = function (event) {
  App.controller.copyNode();
}

// =========================================================================
//                   Paste Button
// =========================================================================
// Pressing this button pastes the node in the copy buffer into the selected node, making
// it a child of the selected node.
var PasteNode = defCustomTag('paste-node', ButtonPanelButton)

PasteNode.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Paste')
  $this.click(this.onClick)
}

PasteNode.prototype.onClick = function (event) {
  App.controller.paste();
}
// TODO: I think all these buttons could just be instances of a MyButton class.
// Don't need separate classes for all of them.

// =========================================================================
//                   Expand / Collapse Recursive Button
// =========================================================================
var ExpandCollapseRecursive = defCustomTag('expand-collapse-recursive', ButtonPanelButton)

ExpandCollapseRecursive.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)
  $(this).html('Open/Close All');
  $(this).click(function(event) {IT.ui.toggleExpandCollapseAll()})
}


// =========================================================================
//                   Add Child Button
// =========================================================================
var AddChild = defCustomTag('add-child', ButtonPanelButton)

AddChild.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('+Child')

  // Click function adds a new child NodeView to the NodeView associated with this button. This means
  // adding the new node to the NodeView's NodeChildren element.
  $this.click(function() {IT.ui.addChild()})
}

// =========================================================================
//                   Add Successor Button
// =========================================================================
var AddSuccessor = defCustomTag('add-successor', ButtonPanelButton)
AddSuccessor.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('+Successor')

  // Click function adds a new NodeView after the NodeView associated with this button.
  $this.click(function() {IT.ui.addSuccessor()})
}

// =========================================================================
//                   Add Predecessor Button
// =========================================================================
var AddPredecessor = defCustomTag('add-predecessor', ButtonPanelButton)
AddPredecessor.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('+Predecessor')

  // Click function adds a new NodeView after the NodeView associated with this button.
  $this.click(function() {IT.ui.addPredecessor()})
}

// =========================================================================
//                   Trash Node Button
// =========================================================================
var TrashNode = defCustomTag('trash-node', ButtonPanelButton)
TrashNode.prototype.onCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Delete!')

  $this.click(this.onClick);
}

TrashNode.prototype.onClick = function (event) {
  App.controller.trash();
}

// =========================================================================
//                   Untrash Node Button
// =========================================================================
// Pressing this button undoes the last delete operation, restoring the last trashed node to the hierarchy
// by re-inserting it with the predecessor it had before. This is guaranteed to work if it is performed just
// after the delete operation was performed. However, if performed later on, the predecessor itself may have been
// moved or may have been trashed, in which case unexpected results may occur.
var UntrashNode = defCustomTag('untrash-node', ButtonPanelButton)

UntrashNode.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Untrash')
  $this.click(function(event) {IT.ui.restoreLastDeletedNode()})
}

$(document).ready(function(){
  App.initPage();
})
//})() // We wrapped everything in an anonymous function call to hide some globals.
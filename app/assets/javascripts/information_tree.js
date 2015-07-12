/*
This file defines client-side functionality for the information-tree sub-app.

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
*/


(function () { // Wrap everything in an anonymous function call to hide some globals.

// ========================================================================
//                   Global Access Point
// =========================================================================
window.informationTree = {}

// ========================================================================
//                   User Interface
// =========================================================================
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
var Ui = function () {
  var self = this;

  self.selectedNode = null // The Ui maintains a "selected node", to which actions are performed.
  self.buttonPanel  = null // The buttonPanel is a pop-up menu that allows the user to take action on the selected node. It gets initialized later on.

  // This is called by the information tree object just after it has gotten the "top" node
  // back from the server. It gives the ui a chance to do further initialization, now that the top
  // node has been added to the dom.
  self.initTop = function() {
    self.buttonPanel = new ButtonPanel;
    $(informationTree.tree).append(self.buttonPanel);
    self.selectNode(informationTree.tree.top);
    $(self.buttonPanel).hide();
  }

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
  self.clickRightOnNode = function (node) {
    self.selectNode(node);
    self.buttonPanel.popTo(node);
    return false;
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

  self.addSuccessor = function (node) {
    (node || self.selectedNode).addSuccessor();
  }

  self.addPredecessor = function (node) {
    (node || self.selectedNode).addPredecessor();
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

  self.copy = function (node) {
    (node || self.selectedNode).copy()
  }

  self.paste = function (node) {
    (node || self.selectedNode).paste()
  }

  self.toggleExpandCollapseAll = function (node) {
    (node || self.selectedNode).toggle(true)
  }

  self.addChild = function (node) {
    (node || self.selectedNode).addChild();
  }

  // TODO: the trash functionality needs to record information about the former parentage
  // and sibling relationships somewhere so that a trashed node can be restored later.
  self.restoreLastDeletedNode = function() {
    alert("Untrash has not yet been implemented");
  }

  self.setAttributes = function (node, attributes) {
    (node || self.selectedNode).setAttributes(attributes)
  }
};

Ui.init = function () {
  informationTree.ui  = new Ui; // Create and register a new Ui object.

}


// ========================================================================
//                   Information Tree
// =========================================================================
var InformationTree = defCustomTag('information-tree', HTMLElement);

/*
We do some things onCreate that are independent of the existence of dom objects,
but which the dom manipulations onAttach will depend on.
*/
InformationTree.prototype.onCreate = function() {
  informationTree.tree  = this;   // Register ourselves so that we are globally accessible.
  Ui.init()                       // Tell the UI class to initialize a ui component.
}


InformationTree.prototype.onAttach = function() {
  this.initTop();
}


// Find the top node of the tree and add it to the dom.
// Initialize the ui.
InformationTree.prototype.initTop = function() {
  var me = this;
  this.getTopNodeFromServer(function(node) {
    if (node) {
      $(document).tooltip(); // TODO: is there a way for this not to be here?

      me.top = new TextNode(node);
      $(me).append(me.top);
      $(me).click(function() {informationTree.ui.hideButtonPanel()});
      informationTree.ui.initTop();
    }})
}


InformationTree.prototype.topNodePath = function() {
  return '/nodes/top.json'
}

InformationTree.prototype.getTopNodeFromServer = function(continuation) {
  getJsonFromServer("GET", this.topNodePath(), continuation)
}


/*
Return an array of all the nodes in the text tree that are currently visible.
Return the nodes in order of descending y-value. This means that every visible node will
be preceded by its older siblings, all their visible descendants, and by its parent.
*/
InformationTree.prototype.visibleNodes = function() {
  return this.top.visibleNodes([]);
}


InformationTree.prototype.findLowestNodeAbove = function(y) {
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
InformationTree.prototype.find = function(id) {
  if (!id) return;

  var $node = $('#' + id);
  if ($node.length > 0) {
    return $node[0];
  }
}

/*
If it currently exists in the dom, return the text node whose id is node.id,
after updating it with possibly new values from node;
otherwise, assume that node is a complete spec for a new node: instantiate it and
return the new node. Note that the newly created note is unglommed; that is, it is
unattached to the text tree.
*/
InformationTree.prototype._findOrCreate = function(node) {
  var foundNode = this.find(node.id);
  return foundNode ? foundNode.update(node) : new TextNode(node);
}

/*
If it currently exists in the dom, merely update the text node whose id is node.id
with the other information contained in node, and return it.

If it does not yet exist in the dom, assume that node is a complete spec for a new node:
instantiate it and return the new node after glomming it to the text tree in its proper position.
*/
InformationTree.prototype._addNodeOnClient = function(node) {
  return this._findOrCreate(node)._glom();
}


InformationTree.prototype._addNodesOnClient = function(fetchedNodes) {
  return fetchedNodes.map(this._addNodeOnClient.bind(this));
}


// =========================================================================
//                   Text Node
// =========================================================================
var TextNode = defCustomTag('text-node', HTMLElement);

 // Default json spec for a new node
TextNode.defaultSpec = {
  content:'New Node',
  width:100,
  height:25
  }

// ======= Construction and Initialization
/*
Create a client-side representation of node, which exists on the server.

NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
need to pass args, which can only be passed via afterCreate().
 */
TextNode.prototype.afterCreate = function(node) {
  var $this = $(this)

  // Create dom-substructures
  // NOTE: These must be created before the properties below are assigned,
  // because some of them get passed into the substructures.
  this.header = new NodeHeader(this, {tooltip:"Created on " + node.created_at}); // TODO: this is inelegant. should use this.createdAt, but it hasn't been assigned yet, and can't be assigned before header node is created.
  // TODO: how do you handle re-initializing existing memory, as opposed to genning new memory, for instances?

  $this.append(this.header)

  this.childrenContainer = new NodeChildren;
  $this.append(this.childrenContainer)

  this.update(node) // Assign properties from node

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

TextNode.prototype.dragStart = function() {
  informationTree.tree.dropTarget = null;
}


/*
A drag event just ended. Determine whether we were dropped on top of another node,
or let go beneath a node, and do either an addChild() or an addSuccessor() accordingly.
*/
TextNode.prototype.dragStop = function(event, helper) {
  // There's a drop target: add a child
  if (informationTree.tree.dropTarget) {
    informationTree.tree.dropTarget.addChild({id: this.id});
    return;
  }

  // There's a node above the release position: add a successor
  var node = informationTree.tree.findLowestNodeAbove(helper.position.top);
  if (node) {
    node.addSuccessor({id: this.id});
  }
};


// Clean up the width and height after we are attached.
// The problem here is that width and height are set at create time, which is the only time
// during which we can pass in args, such as width an height. But, because the node is not yet
// attached to the DOM, the computed width and height are wrong somehow (not sure of details).
// So, we cache the width and height at create time and then clean it up by resetting at attach time.
TextNode.prototype.onAttach = function() {
  // The conditional is a kludge: For dragging, the textnode gets shallow-copied and won't have a header.
  // In that case, we want to ignore it anyway.
  if (this.header) {
    this.width = this._width
    this.height = this._height
  }
}


// TODO: Rethink all this, especially width/height. Is this what we want?
Object.defineProperties(TextNode.prototype, {
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
TextNode.prototype.update = function(node) {
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

TextNode.prototype.set_id = function(id) {
  this.id = id;
  this.header.set_id(id);
  this.childrenContainer.set_id(id);
}

TextNode.prototype.visibleNodes = function(result) {
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
TextNode is created from a rep sent by the server to the client.

We figure out where to attach ourselves by examining our predecessor, successor,
and parent links. If we have one of the first two links, we know exactly where to attach
ourselves. If we have neither, then we must be the only child of our parent.

In all cases, make sure that our new parent has had its children downloaded from the server
before we glom ourselves to it; otherwise, we create an indeterminate state in which only some
of the parent's children are represented on the client side.
*/
TextNode.prototype._glom = function() {
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


TextNode.prototype._attachSuccessor = function(successor) {
  $(this).after(successor);
  return this;
};


TextNode.prototype._attachPredecessor = function(predecessor) {
  $(this).before(predecessor);
  return this;
};


/*
NOTE: This method will only be called by glom() if the parent has no children yet.
*/
TextNode.prototype._attachChild = function(child) {
  $(this.childrenContainer).append(child);
  return this;
};


/*
Search the dom for a TextNode whose id matches the predecessor id of this
and return it if found.
*/
TextNode.prototype.predecessor = function() {
  return informationTree.tree.find(this.predecessor_id);
};


/*
Search the dom for a TextNode whose id matches the predecessor id of this
and return it if found.
*/
TextNode.prototype.successor = function() {
  return informationTree.tree.find(this.successor_id);
};


/*
Search the dom for a TextNode whose id matches the parent id of this
and return it if found.
*/
TextNode.prototype.parent = function() {
  return informationTree.tree.find(this.parent_id);
}

TextNode.prototype.kids = function() {
  return $(this.childrenContainer).children().get();
}

// =========================== Add Node
/*
Ask the server to add a child or sibling node, specified by <node>,
to the node represented by <this> text node. After the server
responds with a success code, effect the same changes on the client-side.

If node is null, create a new default node.

If node is non-null and fully spec'd,
but without an id, create a new node as specified.

If node is non-null, but just contains an id, use the existing node
with that id for the add operation and move it to the new location (child or sibling)
relative to <this>.

mode determines how node is moved relative to <this>, as either a child, successor, or predecessor
of the node represented by <this>. mode should be a string, one of: 'child', 'successor', 'predecessor'
*/
TextNode.prototype._addNode = function(node, mode) {
  if (!node) {
    node = TextNode.defaultSpec;
  }

  var me = this;
  this._addNodeOnServer(node, mode,
    function(node) {
      if (node.error) {
        me._reportAddNodeOnServerError(node, mode);
        return;
      };

      informationTree.tree._addNodeOnClient(node);
    });
};

TextNode.prototype._reportAddNodeOnServerError = function(node, mode) {
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
TextNode.prototype._addNodeOnServer = function(node, mode, next) {
  getJsonFromServer(
    "POST",
    this._addNodePath(),
    next,
    {node: node, mode:mode}
  );
};


TextNode.prototype._addNodePath = function() {
  return '/nodes/' + this.id + '/add_node.json'
}

/*
Create a new node on the server or insert an existing one, in either case making the
node represented by this node be its parent. Then effect the same transformation
on the client side.
*/
TextNode.prototype.addChild = function(node) {
  // null node means we're creating a new node as opposed to moving an existing one.
  // Make sure we are expanded so that the new child node can be seen.
  if (!node) this.expand();

  this._addNode(node, 'add_child');
}


/*
Create a new node on the server or insert an existing one, in either case making the
node represented by this node be its predecessor. Then effect the same transformation
on the client side.
*/
TextNode.prototype.addSuccessor = function(node) {
  this.parent().expand(); // Make sure that our parent is expanded so that the new node can be seen.
  this._addNode(node, 'add_successor');
}


/*
Create a new node on the server or insert an existing one, in either case making the
node represented by this node be its successor. Then effect the same transformation
on the client side.
*/
TextNode.prototype.addPredecessor = function(node) {
  this.parent().expand(); // Make sure that our parent is expanded so that the new node can be seen.
  this._addNode(node, 'add_predecessor');
}

// =========================== Copy
TextNode.prototype.copy = function() {
  informationTree.tree.copiedNode = this;
};

// ========================== Paste
TextNode.prototype.paste = function() {
  this.addChild({id: informationTree.tree.copiedNode.id});
};

// =========================== Trash
// Ask the server to trash this node from the hierarchy.
// When the server replies, trash the node from the browser.
TextNode.prototype.trash = function() {
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

TextNode.prototype._trashPath = function(id) {
  return '/nodes/' + id + '/trash.json'
}


/*
Get rid of <this> from the text tree.
*/
TextNode.prototype._trashOnClient = function() {
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
TextNode.prototype.expand = function(doRecursive) {
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
TextNode.prototype._fetchAndAddChildrenOnClient = function(continuation) {
  this._fetchChildren(
    function(fetchedNodes) {
      if (fetchedNodes) {
        continuation(informationTree.tree._addNodesOnClient(fetchedNodes));
      } else {
        continuation([]);
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
TextNode.prototype._fetchChildren = function(continuation) {
  if (this.childrenFetched) {
    continuation(false); // Pass false to the continuation to indicate that no children were fetched.
  } else {
    var me = this;
    getJsonFromServer("GET", this._childrenPath(this.id),
      function(fetchedNodes) {
        me.childrenFetched = true;
        continuation(fetchedNodes);
      });
  }
}


TextNode.prototype._childrenPath = function(id) {
  return '/nodes/' + id + '/children.json'
}


/*
Do the client-side stuff necessary to xxpand this node,
which means revealing its children and showing its button panel.
This is a helper method called by expand(). The parent method takes care
of ensuring that this node already has its children fetched from the server.
*/
TextNode.prototype._expand = function() {
  if (this.state == 'expanded') return; // Already expanded, so do nothing.

  this.state = 'expanded'
  $(this).children('node-children').show('slow')
}


// Collapse this node, which means hiding its children and hiding its button panel.
TextNode.prototype.collapse = function(doRecursive) {
  this.state = 'collapsed'
  var nodeChildren = $(this).children('node-children')
  nodeChildren.hide('slow')

  if (doRecursive) {
    nodeChildren.children().each(function(index) {
      this.collapse(doRecursive)
    })
  }
}

  TextNode.prototype.toggle = function(doRecursive) {
  if (this.state == 'expanded') {
    this.collapse(doRecursive)
  } else {
    this.expand(doRecursive)
  }
}


// =================== Auto-Size
// Calculate a pleasing size for the content textarea associated with this text node.
TextNode.prototype.autoSize = function() {
  this.setAttributes(this.calcAutoSize())
}

// Calculate a pleasing width and height for a textarea input box that contains n chars.
// Return the calculated values as a hash.
// TODO: Get rid of magic numbers, and make calculation take font size into account.
// TODO: height is not set correctly for large amounts of text. Fix it.
TextNode.prototype.calcAutoSize = function() {
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
TextNode.prototype.followLink = function() {
  var url = this.content
  if (url.slice(0,4) == 'http') open(url)
}

// ======================== Set Attributes

// Set attributes for this node. The attributes to change, and their values,
// are in options, which is a hash. The hash is sent to the server, to change the values
// on the server first, and then the server replies with a json that represents the changed node.
// Note: This does not allow you to set attributes affecting topology, e.g.: parent_id, rank.
// Attributes which can be set are: content, width, height.
TextNode.prototype.setAttributes = function(options) {
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

TextNode.prototype.setAttributesPath = function(id) {
  return '/nodes/' + id + '/set_attributes.json'
}


TextNode.prototype.setAttributesOnClient = function(jsonNode) {
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
NodeHeader.prototype.afterCreate = function(textNode, options) {
  var $this = $(this)
  this.textNode = textNode

  this.expandCollapseButton = new ExpandCollapse(textNode)
  $this.append(this.expandCollapseButton)

  this.content = new NodeContent(textNode, options);
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

  this.expandCollapseRecursiveButton = new ExpandCollapseRecursive
  $this.append(this.expandCollapseRecursiveButton)

  this.autoSizeButton = new AutoSize
  $this.append(this.autoSizeButton)

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
  $this.click(function() {$this.hide()})
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


// =========================================================================
//                   Node Content
// =========================================================================
// NodeContent holds the text that represents the content of the node.

var NodeContent = defCustomTag('node-content', HTMLTextAreaElement, 'textarea')

NodeContent.prototype.afterCreate = function(textNode, options) {
  var $this = $(this);
  var self  = this;

  this.textNode = textNode;

  $this.addClass('node-content'); // Since we are extending a text-area element, we can't put css on the node-content tag--there isn't one in the dom!
  $this.on("click", this.onClick);
  $this.on("blur", this.onBlur)
  $this.on("contextmenu", this.onContextMenu);

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
  return informationTree.ui.clickLeftOnNode(this.textNode);
}


/*
This somewhat awkward intermediary is necessary because, at create time, we don't have
a pointer to the Node parent from the NodeContent object. So we create a delegator
that will work at click-time.
*/
NodeContent.prototype.onContextMenu = function(event) {
  return informationTree.ui.clickRightOnNode(this.textNode);
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
  var textNode = this.textNode;
  if (textNode.id) {
    informationTree.tree.dropTarget = textNode;
  }
};


NodeContent.prototype.set_id = function(id) {
  this.id = 'NodeContent-' + id;
}


// This event-handler is bound to the object's blur event.
// It causes the content of the node to change on the server.
NodeContent.prototype.onBlur = function(e) {
  informationTree.ui.setAttributes(this.textNode,
    {content: this.textNode.content,
       width: this.textNode.width,
      height: this.textNode.height})
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

ExpandCollapse.prototype.afterCreate = function(textNode) {
  this.textNode = textNode

  $(this).html('>');

  $(this).click(function(event) {this.toggle(event)})
}


ExpandCollapse.prototype.toggle = function() {
  $(this).html(this.textNode.state === 'expanded' ? '>' : 'v')
  informationTree.ui.toggleNodeExpandCollapse(this.textNode);
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
//                   FollowLink Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var FollowLink = defCustomTag('follow-link', ButtonPanelButton)

FollowLink.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Follow Link')
  $this.click(function(event) {informationTree.ui.followLink()})
}


// =========================================================================
//                   AutoSize Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var AutoSize = defCustomTag('auto-size', ButtonPanelButton)

AutoSize.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Autosize')
  $this.click(function(event) {informationTree.ui.autoSize()})
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
  $this.click(function(event) {informationTree.ui.copy()})
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
  $this.click(function(event) {informationTree.ui.paste()})
}

// =========================================================================
//                   Expand / Collapse Recursive Button
// =========================================================================
var ExpandCollapseRecursive = defCustomTag('expand-collapse-recursive', ButtonPanelButton)

ExpandCollapseRecursive.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)
  $(this).html('Open/Close All');
  $(this).click(function(event) {informationTree.ui.toggleExpandCollapseAll()})
}


// =========================================================================
//                   Add Child Button
// =========================================================================
var AddChild = defCustomTag('add-child', ButtonPanelButton)

AddChild.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('+Child')

  // Click function adds a new child TextNode to the TextNode associated with this button. This means
  // adding the new node to the TextNode's NodeChildren element.
  $this.click(function() {informationTree.ui.addChild()})
}

// =========================================================================
//                   Add Successor Button
// =========================================================================
var AddSuccessor = defCustomTag('add-successor', ButtonPanelButton)
AddSuccessor.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('+Successor')

  // Click function adds a new TextNode after the TextNode associated with this button.
  $this.click(function() {informationTree.ui.addSuccessor()})
}

// =========================================================================
//                   Add Predecessor Button
// =========================================================================
var AddPredecessor = defCustomTag('add-predecessor', ButtonPanelButton)
AddPredecessor.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('+Predecessor')

  // Click function adds a new TextNode after the TextNode associated with this button.
  $this.click(function() {informationTree.ui.addPredecessor()})
}

// =========================================================================
//                   Trash Node Button
// =========================================================================
var TrashNode = defCustomTag('trash-node', ButtonPanelButton)
TrashNode.prototype.onCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Delete!')

  $this.click(function() {informationTree.ui.trash()});
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
  $this.click(function(event) {informationTree.ui.restoreLastDeletedNode()})
}

})() // We wrapped everything in an anonymous function call to hide some globals.
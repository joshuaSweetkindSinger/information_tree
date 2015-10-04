//= require view_node/view_node_header
//= require view_node/view_node_content
//= require view_node/view_node_children
//= require node
//= require utils

/*
This file defines the ViewNode class.

A ViewNode is a client-side dom element that represents a single node in the information tree.

This class cannot be directly instantiated, because it doesn't know anything about the UI. Instead,
it knows about all operations that can be performed on nodes and how to execute those operations on the client side.
But it doesn't know which mouse clicks or keyboard clicks invoke those actions.

To add knowledge about the ui, this class has a subclass called UiNode.

Structure:
 A ViewNode has two child elements, called ViewNodeHeader and ViewNodeChildren.
 ViewNodeHeader: represents content for the node.
 ViewNodeChildren: represents a container for sub-nodes. The container only contains dom elements instantiated
                   from class UiNode.

*/
// =========================================================================
//                   View Node
// =========================================================================
var ViewNode = defCustomTag('view-node', HTMLElement);

/*
 Note that this is a class method, not an instance method.

 Create a new server-side node with attributes as specified in nodeSpec, or
 with default attributes if nodeSpec is not supplied.  Valid attributes to set are
 'content', 'type_id', 'width', 'height'.

 The new node will have no parents (it is in "limbo" until it is added to the tree).
 This method returns a request object for asynchronous continuation to process the node representation
 returned by the server (a hash object).

 NOTE: ViewNode is not an instantiable class. However, node creation is part of what this class
 knows about. So what it instantiates is this.uiClass, whose value must be set by the instantiable subclass
 of ViewNode at page load time. For example: ViewNode.uiClass = UiNode; This very line is in ui_node.js.

 NOTE: We create new nodes in expanded status, because we know, by definition, that they have no children yet.
 */
ViewNode.createNode = function (nodeSpec) {
  var self = this;
  return Node.createNode(nodeSpec).success(function(node) {return new self.uiClass(node, 'expanded')})
}


// ======= Construction and Initialization
/*
 Create a ViewNode object from a Node object. The ViewNode object is a wrapper for the Node
 object and endows the Node object with UI-related functionality. The Node object is not a dom element,
 but the ViewNode object is.

 NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
 We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
 need to pass args, which can only be passed via afterCreate().

 NOTE: we create all notes by default in 'collapsed' state, because their children have not been fetched.
 However, nodes that are created brand new don't have children, and can be created in expanded state.
 The UI takes care of handling this case. See createNode() above.
 Also, a node can't be properly expanded or collapsed until
 it has been attached to the dom. That is handled in onAttach(). Here we just set the desired state;
 it is the onAttach() method that actually effects it.
 */
ViewNode.prototype.afterCreate = function(node, state) {
  this.node = node    // This must precede everything, since many initializations depend on the values in this.node.
  this.id   = node.id // Although not DRY, we need the id on the dom element for jquery. Note also that this.id is a string while node.id is an integer.
                      // The conversion happens internally, since "id" is a special field of a dom element.

  var $this = $(this)
  $this.append(this._header = new ViewNodeHeader(this, {tooltip:"id = " + node.id + "; Created on " + node.createdAt}))
  $this.append(this._childrenContainer = new ViewNodeChildren);

  this.update(node)                    // This needs to follow the _header and container appends above; it invokes setters that depend upon them.
  this.state = state || 'collapsed'    // See notes above.
  this.afterAttach = new FunctionQueue // A queue of callbacks to process after we are attached to the dom.
                                       // This is for .then(), .success(), .failure() callbacks.
  ITA.nodeCache.add(this)
}

// Clean up the width and height after we are attached.
// The problem here is that width and height are set at create time, which is the only time
// during which we can pass in args, such as width and height. But, because the node is not yet
// attached to the DOM, the computed width and height are wrong somehow (not sure of details).
ViewNode.prototype.onAttach = function() {
  // For dragging, the viewNode gets cloned but won't have any member variables of the original,
  // such as node, id, _header, _childrenContainer.
  // In that case, we want to ignore it anyway.
  if (!this._header) return

  this.width  = this.node.width
  this.height = this.node.height

  if (this.state === 'expanded') {
    this._expand()
  } else {
    this.collapse();
  }
  this.afterAttach.done(true, this) // Tell the function queue we are done attaching so it can process callbacks.
}


/*
Update ourselves to reflect the info in node. If node is not specified,
use existing this.node. If it is specified, replace this.node with the new node.
*/
ViewNode.prototype.update = function (node) {
  if (node) this.node = node;

  if (this.node.id != this.id) throw ("Attempt to update from node with different id: Our id is " + this.id + " but node's is " + node.id);

  this.width   = this.node.width
  this.height  = this.node.height
  this.content = this.node.content

  return this;
}


// TODO: Change format to jquery style setter/getter wrapped in a single function for each setter/getter.
Object.defineProperties(ViewNode.prototype, {
    node: {
      get: function() {
        return this._node;
      },
      set: function(node) {
        this._node = node;
        node.view(this);
      }
    },

    content: {
      get: function() {
        return $(this._header.contentArea).val()
      },
      set: function(content) {
        $(this._header.contentArea).val(content)
      }
    },

    width: {
      get: function() {
        return $(this._header.contentArea).width()
      },
      set: function(v) {
        $(this._header.contentArea).width(v)
      }
    },

    height: {
      get: function() {
        return $(this._header.contentArea).height()
      },
      set: function(v) {
        $(this._header.contentArea).height(v)
      }
    }
  }
);



/*
 Return a list consisting of ourselves and of the expanded ViewNodes beneath us in the hierarchy, in descending vertical order.
 In other words, we are returned first, and then the node beneath us, then the node beneath it,
 and so on. Only expanded nodes are in the list, i.e., those that are rendered somewhere
 in the display area.
 */
ViewNode.prototype.expandedViewNodes = function(result) {
  result = result || []

  result.push(this);
  if (this.isExpanded()) {
    this.kids().forEach(function(uiNode) {
      uiNode.expandedViewNodes(result);
    });
  }
  return result;
}

ViewNode.prototype.DEFAULT_MAX_CONTENT_SNIPPET_LENGTH = 25  // The maximum length to show of a node's content

/*
Return a new, possibly clipped content string, limited to max_length chars. If the original
content has been clipped, then the last three chars of the returned string will be '...'
*/

ViewNode.prototype.snipContent = function (max_length) {
  max_length = max_length || this.DEFAULT_MAX_CONTENT_SNIPPET_LENGTH
  var result = this.content.slice(0, max_length)
  if (this.content.length > max_length) {
    result = result.slice(0, -3) + '...'
  }
  return result
}


// =========================================================================
//        Tree Hierarchy Accessors And Manipulation Methods
// =========================================================================
/*
 Attach ourselves to the information tree. This is done just after a new
 ViewNode is created from a node rep sent by the server to the client, or just after
 an existing client-side node has been repositioned to have a new parent or siblings,
 or just after a sub-tree root has been re-joined to its parent.

 NOTE: Although this is labeled as an api-level method, in most cases, it would be wrong to call
 this directly. Call it only if the ViewNode in question is already correct in its info, has a corresponding
 server-side node, and all that remains is for it to be attached to the dom in the correct position.

 We figure out where to attach ourselves by examining our predecessor, successor,
 and parent links. If we have one of the first two links, we know exactly where to attach
 ourselves. If we have neither, then we must be the only child of our parent.

 NOTE: we may be attaching as the child of an unexpanded node parent, in which case the client-side will only show
 some of the children of that node. An easy fix would seem to be to simply expand the parent before attaching, but
 that expansion does a reload of *all* children from the server, and one of them on the client side may be in the
 middle of a blur event, which means it is dirty. Re-expanding from the server would erase the client-side changes.
 In order to handle this elegantly, more thought, and code, is required. For now, if a node's expand/collapse icon
 indicates that the node is collapsed, but the node nonetheless seems to have children, then the user needs
 to be smart enough to realize that this is just a partial list of the node's children.
 */
ViewNode.prototype.attachToTree = function() {
  var predecessor = this.predecessor();

  // Node has no predecessor--it's the first child of its parent
  if (!predecessor) {
    this.parent().attachChild(this)
  } else {
    predecessor._attachSuccessor(this);
  }

  return this;
}


// Attach nodeToAttach to the tree as our successor.
ViewNode.prototype._attachSuccessor = function(nodeToAttach) {
  $(this).after(nodeToAttach);
  return this;
};

// Attach nodeToAttach to the tree as our predecessor.
ViewNode.prototype._attachPredecessor = function(nodeToAttach) {
  $(this).before(nodeToAttach);
  return this;
};


/*
Attach nodeToAttach to the tree as our first child.

 NOTE: This method will be called by attachToTree() if the parent has no children yet, or if
 the user has created a new node on the fly to be the new first child of its parent.
 */
ViewNode.prototype.attachChild = function(nodeToAttach) {
  $(this._childrenContainer).prepend(nodeToAttach);
  return this;
};


/*
 Search the dom for a ViewNode whose id matches the predecessor id of this.node
 and return it if found.
 */
ViewNode.prototype.predecessor = function() {
  if (this.node.predecessor_id) {
    return ITA.informationTree.find(this.node.predecessor_id);
  }
}


/*
 Search the dom for a ViewNode whose id matches the predecessor id of this.node
 and return it if found.
 */
ViewNode.prototype.successor = function() {
  if (this.node.successor_id) {
    return ITA.informationTree.find(this.node.successor_id);
  }
}


/*
 Search the dom for a ViewNode whose id matches the parent id of this.node
 and return it if found. This is the "logical" parent of the view node, which is
 another view node. By contrast, the actual dom parent of the view node is going to be
 a children-container element.
 */
ViewNode.prototype.parent = function() {
  if (this.node.parent_id) {
    return ITA.nodeCache.get(this.node.parent_id);
  }
}

ViewNode.prototype.kids = function() {
  return $(this._childrenContainer).children().get();
}

// =========================== Insert Node

/*
 Ask the server to alter the existing tree by inserting a child or sibling node, specified by nodeToInsert,
 relative to the reference node represented by <this> ViewNode. After the server
 responds with a success code, effect the same changes on the client-side.


 mode determines how node is moved relative to <this>, as either a child, successor, or predecessor
 of the node represented by <this>. mode should be a string
 that names one of this.node's add methods: 'insertChild', 'insertSuccessor', 'insertPredecessor'

 The return value is a request object that captures the asynchronous computation.
*/

ViewNode.prototype._insert = function(nodeToInsert, mode) {
  var isInvalidRequest = this._isInvalidAddRequest(nodeToInsert, mode);
  if (isInvalidRequest) return isInvalidRequest;

  return this.node[mode](nodeToInsert.node)
    .success(function(node) {
      nodeToInsert.attachToTree();
      return nodeToInsert
    })
};

/*
Return true if the requested add operation is invalid.

The operation is invalid if nodeSpec is a reference to <this>, in which
case we would be adding ourselves to ourselves.
 */
ViewNode.prototype._isInvalidAddRequest = function (viewNode, mode) {
  if (viewNode.id == this.id) {
    return new PseudoRequest({error:'self-loop request'}, false); // Return a failed request if we are requesting to add ourselves to ourselves.
  }
}


/*
 Insert the existing node viewNode into the information tree as the first child of <this>.
 Do this first on server side, then on client side.
 */
ViewNode.prototype.insertChild = function(viewNode) {
  return this._insert(viewNode, 'insertChild');
}


/*
 Insert the existing node viewNode into the information tree as the successor of <this>.
 Do this first on server side, then on client side.
 */
ViewNode.prototype.insertSuccessor = function(viewNode) {
  return this._insert(viewNode, 'insertSuccessor');
}


/*
 Insert the existing node viewNode into the information tree as the predecessor of <this>.
 Do this first on server side, then on client side.
 */
ViewNode.prototype.insertPredecessor = function(viewNode) {
  return this._insert(viewNode, 'insertPredecessor');
}


/*
 Create a new node on the server to be the successor/predecessor/child of the node represented by <this>,
 as indicated by mode, one of: 'insertChild', 'insertSuccessor', 'insertPredecessor',
 with attributes as specified in nodeSpec.  Use default attributes if nodeSpec is not supplied.
 Then effect the same transformation on the client side.

 PROGRAMMER NOTES: Don't try expanding the parent node, because this will re-read the node children
 from the server, and some of them might have unsaved changes if this method is being
 triggered in conjunction with a blur() event.
 */
ViewNode.prototype._createAndInsertNode = function (nodeSpec, mode) {
  var self = this;
  return ViewNode.createNode(nodeSpec)
    .success(function (uiNode) {
      self[mode](uiNode);
    })
}


ViewNode.prototype.createChild = function(nodeSpec) {
  return this._createAndInsertNode(nodeSpec, 'insertChild')
}

ViewNode.prototype.createSuccessor = function(nodeSpec) {
  return this._createAndInsertNode(nodeSpec, 'insertSuccessor')
}

ViewNode.prototype.createPredecessor = function(nodeSpec) {
  return this._createAndInsertNode(nodeSpec, 'insertPredecessor')
}


/*
 Create a new node on the server to be the predecessor of the node represented by <this>,
 with attributes as specified in nodeSpec.  Use default attributes if nodeSpec is not supplied.
 Then effect the same transformation on the client side.

 PROGRAMMER NOTES: Don't try expanding the parent node, because this will re-read the node children
 from the server, and some of them might have unsaved changes to their content if this method is being
 triggered in conjunction with a blur() event.
 */
ViewNode.prototype.createPredecessor = function(nodeSpec) {
  var self = this;
  return ViewNode.createNode(nodeSpec)
    .success(function (uiNode) {
      self.insertPredecessor(uiNode);
    })
}
// ========================== Paste
// Paste node onto ourselves. This means adding it as a child.
ViewNode.prototype.paste = function(viewNode) {
  return this.insertChild(viewNode);
};

// =========================== Trash

/*
 Tell the server to basket the node represented by <this>, then basket it on the client side as well.
  */
ViewNode.prototype.basket = function() {
 return ITA.informationTree.basket.insertChild(this);
}


// =================== Expand / Collapse
/*
 Expand this node. Expansion means:
 - fetch all children from server if they have not yet been fetched.
 - attach them to this node as children on the client side.
 - make sure they are displayed and not hidden.
 - if doRecursive is true, then recursively invoke expand() on each of the child nodes.
 - When expansion animation is done on client side, call callback, if specified.
 */
ViewNode.prototype.expand = function(doRecursive, callback) {
  var self = this;
  this.node.fetchChildren()
    .success(function(children) {
      ITA.informationTree.addUiNodes(children)
      self._expand(function() {
        if (doRecursive) {
          self.kids().forEach(function(nodeView) {nodeView.expand(true)});
        }
        if (callback) callback()
      })
    })
}


/*
 Do the client-side stuff necessary to expand this node,
 which means revealing its children and showing its button panel.
 This is a helper method called by expand(). The parent method takes care
 of ensuring that this node already has its children fetched from the server.
 */
ViewNode.prototype._expand = function(callback) {
  this.state = 'expanded'
  $(this._childrenContainer).show('slow', callback)
  this._header.expandCollapseButton.showExpandedStatus();
  return this;
}


// Collapse this node, which means hiding its children and hiding its button panel.
// When done, call callback, if specified.
ViewNode.prototype.collapse = function(doRecursive, callback) {
  this.state = 'collapsed'
  var $childrenContainer = $(this._childrenContainer)
  $childrenContainer.hide('slow', function() {
    if (doRecursive) {
      $childrenContainer.children().each(function(index) {
        this.collapse(doRecursive)
      })
    }
    if (callback) callback()
  })
  this._header.expandCollapseButton.showCollapsedStatus();
}

ViewNode.prototype.toggleExpandCollapse = function(doRecursive) {
  if (this.isExpanded()) {
    this.collapse(doRecursive)
  } else {
    this.expand(doRecursive)
  }
}

// Return true if this node is expanded, else false.
ViewNode.prototype.isExpanded = function () {
  return this.state === 'expanded'
}


// Cause this node to be revealed, by expanding its parent(s) if necessary.
// Then call callback when done, if specified.
ViewNode.prototype.reveal = function (callback) {
  if (!this.parent()) {
    if (callback) callback()
    return;
  } // We are a top-level node, so we are revealed.

  var self = this
  this.parent().expand(false, function() {
    self.parent().reveal(callback)
  })
}


// =================== Auto-Size
// Calculate a pleasing size for the content textarea associated with this text node.
ViewNode.prototype.autoSize = function() {
  var autoSize = this.calcAutoSize()
  this.width = autoSize.width
  this.height = autoSize.height
}

/*
Make changes to self that are spec'd in the data object nodeUpdate.
nodeUpdate need not be a complete nodeSpec. It may simply contain a few key/values
to be changed within this.node, the rest remaining the same.
 */
ViewNode.prototype.setAttributes = function (nodeUpdate) {
  var self = this;
  this.node.setAttributes(nodeUpdate)
    .success(function() {
      self.update()})
}

// Calculate a pleasing width and height for a textarea input box that contains n chars.
// Return the calculated values as a hash.
// TODO: Get rid of magic numbers, and make calculation take font size into account.
// TODO: height is not set correctly for large amounts of text. Fix it.
ViewNode.prototype.calcAutoSize = function() {
  var n = this.content.length
  var maxWidth = 1000.0
  var charWidth  = 6.5
  var charHeight = 20.0
  var scrollBarWidth = 10;
  var scrollBarHeight = 6; // This isn't really the height of the scrollbar. It's the extra height we need to add to make the scroll bar not appear!
  var width = 0.0
  var height = 0.0
  var widthInChars = 0.0;
  var heightInChars= 0.0;
  if (n < 60) {
    widthInChars  = Math.max(n, 4); // for n <=3, the calc yields a box that is too small, so do all small calcs based on n = 4.
    heightInChars = 1;
  } else {
    widthInChars  = Math.min(maxWidth, Math.sqrt(3 * n  * charHeight / charWidth))
    heightInChars = n / widthInChars;
  }
  width  = widthInChars * charWidth + scrollBarWidth;
  height = heightInChars * charHeight + scrollBarHeight;

  return {width:width, height:height}
}



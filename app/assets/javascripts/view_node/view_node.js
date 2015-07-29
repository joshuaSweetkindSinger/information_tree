//= require view_node/view_node_header
//= require view_node/view_node_content
//= require view_node/view_node_children
//= require node

/*
This file defines the NodeView class.

A NodeView is a client-side dom element that represents a single node in the information tree.

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
var ViewNode = defCustomTag('node-view', HTMLElement);

/*
 Create a new server-side node with attributes as specified in nodeSpec, or
 with default attributes if nodeSpec is not supplied. The new node will have
 no parents (it is in "limbo" until it is added to the tree).
 This method returns a request object for asynchronous continuation to process the node representation
 returned by the server (a hash object).

 NOTE: ViewNode is not an instantiable class. However, node creation is part of what this class
 knows about. So what it instantiates is this.uiClass, whose value must be set by the instantiable subclass
 of ViewNode at page load time.

 NOTE: We create new nodes in expanded status, because we know, by definition, that they have no children yet.
 */
ViewNode.createNode = function (nodeSpec) {
  var self = this;
  return Node.createNode(nodeSpec).success(function(node) {return new self.uiClass(node)._expand()})
}


// ======= Construction and Initialization
/*
 Create a ViewNode object from a Node object. The ViewNode object is a wrapper for the Node
 object and endows the Node object with UI-related functionality. The Node object is not a dom element,
 but the ViewNode object is.

 NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
 We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
 need to pass args, which can only be passed via afterCreate().
 */
ViewNode.prototype.afterCreate = function(node) {
  this.node = node; // This must precede everything, since many initializes depend on the values in this.node.
  this.id   = node.id

  var $this  = $(this)
  $this.append(this._header = new ViewNodeHeader(this, {tooltip:"id = " + node.id + "; Created on " + node.createdAt}))
  $this.append(this._childrenContainer = new ViewNodeChildren);

  this.update(node) // This needs to follow the _header and container appends above; it invokes setters that depend upon them.

  this.collapse();   // Note: need to call this method, not just to set state, but so that child dom element will be hidden.
}

// Clean up the width and height after we are attached.
// The problem here is that width and height are set at create time, which is the only time
// during which we can pass in args, such as width and height. But, because the node is not yet
// attached to the DOM, the computed width and height are wrong somehow (not sure of details).
ViewNode.prototype.onAttach = function() {
  // The conditional is a kludge: For dragging, the viewNode gets shallow-copied and won't have a _header.
  // In that case, we want to ignore it anyway.
  if (this._header) {
    this.width   = this.node.width
    this.height  = this.node.height
  }
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
        return $(this._header.content).val()
      },
      set: function(content) {
        $(this._header.content).val(content)
      }
    },

    width: {
      get: function() {
        return $(this._header.content).width()
      },
      set: function(v) {
        $(this._header.content).width(v)
      }
    },

    height: {
      get: function() {
        return $(this._header.content).height()
      },
      set: function(v) {
        $(this._header.content).height(v)
      }
    }
  }
);



/*
Return the list of expanded ViewNodes, in descending vertical order.
In other words, the Top node is returned first, and then then node beneath it,
and so on. Only expanded nodes are in the list, i.e., those that are rendered somewhere
in the display area.
 */
ViewNode.prototype.expandedViewNodes = function(result) {
  result.push(this);
  if (this.state == 'expanded') {
    this.kids().forEach(function(node) {
      node.expandedViewNodes(result);
    });
  }
  return result;
}

// =========================================================================
//        Tree Hierarchy Accessors And Manipulation Methods
// =========================================================================
/*
 Attach ourselves to the information tree view. This is done just after a new
 ViewNode is created from a rep sent by the server to the client.

 We figure out where to attach ourselves by examining our predecessor, successor,
 and parent links. If we have one of the first two links, we know exactly where to attach
 ourselves. If we have neither, then we must be the only child of our parent.

 In all cases, make sure that our new parent has had its children downloaded from the server
 before we glom ourselves to it; otherwise, we create an indeterminate state in which only some
 of the parent's children are represented on the client side.
 */
ViewNode.prototype._glom = function() {
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


ViewNode.prototype._attachSuccessor = function(viewSuccessor) {
  $(this).after(viewSuccessor);
  return this;
};


ViewNode.prototype._attachPredecessor = function(viewPredecessor) {
  $(this).before(viewPredecessor);
  return this;
};


/*
 NOTE: This method will only be called by glom() if the parent has no children yet.
 */
ViewNode.prototype._attachChild = function(viewChild) {
  $(this._childrenContainer).append(viewChild);
  return this;
};


/*
 Search the dom for a ViewNode whose id matches the predecessor id of this.node
 and return it if found.
 */
ViewNode.prototype.predecessor = function() {
  return App.uiTree.find(this.node.predecessor_id);
};


/*
 Search the dom for a ViewNode whose id matches the predecessor id of this.node
 and return it if found.
 */
ViewNode.prototype.successor = function() {
  return App.uiTree.find(this.node.successor_id);
};


/*
 Search the dom for a ViewNode whose id matches the parent id of this.node
 and return it if found.
 */
ViewNode.prototype.parent = function() {
  return App.uiTree.find(this.node.parent_id);
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

ViewNode.prototype._insert = function(viewNode, mode) {
  var isInvalidRequest = this._isInvalidAddRequest(viewNode, mode);
  if (isInvalidRequest) return isInvalidRequest;

  return this.node[mode](viewNode.node)
    .success(function(node) {
      return viewNode._glom();
    })
};

/*
Return true if the requested add operation is invalid.

The operation is invalid if nodeSpec is a reference to <this>, in which
case we would be adding ourselves to ourselves.
 */
ViewNode.prototype._isInvalidAddRequest = function (viewNode, mode) {
  if (viewNode.node.id == this.node.id) {
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
 Create a new node on the server to be the successor/predecess/child of the node represented by <this>,
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
 Tell the server to trash the node represented by <this>, then trash it on the client side as well.
  */
ViewNode.prototype.trash = function() {
 App.uiTree.trash.insertChild(this);
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
ViewNode.prototype.expand = function(doRecursive) {
  var self = this;
  this.node.fetchChildren()
    .success(function(children) {
      App.uiTree.addUiNodes(children)
      self._expand()
      if (doRecursive) {
        self.kids().forEach(function(nodeView) {nodeView.expand(true)});
      }
    })
}


/*
 Do the client-side stuff necessary to xxpand this node,
 which means revealing its children and showing its button panel.
 This is a helper method called by expand(). The parent method takes care
 of ensuring that this node already has its children fetched from the server.
 */
ViewNode.prototype._expand = function() {
  if (this.state == 'expanded') return; // Already expanded, so do nothing.

  this.state = 'expanded'
  $(this).children('node-children').show('slow')
  this._header.expandCollapseButton.showExpandedStatus();
  return this;
}


// Collapse this node, which means hiding its children and hiding its button panel.
ViewNode.prototype.collapse = function(doRecursive) {
  this.state = 'collapsed'
  var nodeChildren = $(this).children('node-children')
  nodeChildren.hide('slow')
  this._header.expandCollapseButton.showCollapsedStatus();

  if (doRecursive) {
    nodeChildren.children().each(function(index) {
      this.collapse(doRecursive)
    })
  }
}

ViewNode.prototype.toggleExpandCollapse = function(doRecursive) {
  if (this.state == 'expanded') {
    this.collapse(doRecursive)
  } else {
    this.expand(doRecursive)
  }
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



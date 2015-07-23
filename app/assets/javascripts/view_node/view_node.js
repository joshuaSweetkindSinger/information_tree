//= require view_node/view_node_header
//= require view_node/view_node_content
//= require view_node/view_node_children
//= require node

/*
This file defines the NodeView class.

A NodeView is a client-side dom element that represents a single node in the information tree.
*/

// =========================================================================
//                   View Node
// =========================================================================
var ViewNode = defCustomTag('node-view', HTMLElement);


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
  $this.append(this._header = new ViewNodeHeader(this, {tooltip:"Created on " + node.createdAt}))
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


ViewNode.prototype._attachSuccessor = function(successorView) {
  $(this).after(successorView);
  return this;
};


ViewNode.prototype._attachPredecessor = function(predecessorView) {
  $(this).before(predecessorView);
  return this;
};


/*
 NOTE: This method will only be called by glom() if the parent has no children yet.
 */
ViewNode.prototype._attachChild = function(childView) {
  $(this._childrenContainer).append(childView);
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

// =========================== Add Node
// TODO: Rethink all the taxonomy operations. Probably they should trickle like so:
// UI initiates based on browser event: asks model to change its taxonomy status, and, when
// done, asks view to update itself. We have to make an architectural decision about whether
// view wraps model, or vice versa, or neither. Is the view responsible and delegates parts to the model?
// That's the easiest to implement, based on prior architecture. Or is the model responsible, receiving
// requests directly from the controller, and it then updates the view? Or do the model and view just handle
// their own parts, and we leave it to the controller to be the glue that keeps them in correspondence? This
// latter is more in keeping with standard mvc.
/*
 Ask the server to alter the existing tree by moving a child or sibling node, specified by <nodeSpec>,
 to the node represented by <this> ViewNode, creating the new node if necessary. After the server
 responds with a success code, effect the same changes on the client-side.

 If nodeSpec is null, create a new default node.

 If nodeSpec is non-null and fully spec'd,
 but without an id, create a new node as specified.

 If nodeSpec is non-null, but just contains an id, use the existing node
 with that id for the add operation and move it to the new location (child or sibling)
 relative to <this>.

 mode determines how node is moved relative to <this>, as either a child, successor, or predecessor
 of the node represented by <this>. mode should be a string, one of: 'child', 'successor', 'predecessor'

 The return value is a request object that captures the asynchronous computation.

 NOTES: nodeSpec is a hash that specifies a new node, or names an existing one, but it is *not* a node object.
 node is a client-side node object.

 NOTE: this method does NOT directly create a new ViewNode. It can't, because ViewNode is not a toplevel class.
 We need to create a wrapper class, of which this class has no knowledge. So, instead, it contacts the uiTree
 object, which is a UI-level object, and asks the uiTree to create a ui-level node of the proper class.
 */

ViewNode.prototype._add = function(nodeSpec, mode) {
  if (this._isInvalidAddRequest(nodeSpec, mode)) {
    return new PseudoRequest({error:'self-loop request'}, false); // Return a failed request if we are requesting to add ourselves to ourselves.
  }

  return this.node
    .add(nodeSpec, mode)
    .success(function(node) {
        return App.uiTree.addUiNode(node);
    })
};

/*
Return true if the requested add operation is invalid.

The operation is invalid if nodeSpec is a reference to <this>, in which
case we would be adding ourselves to ourselves.
 */
ViewNode.prototype._isInvalidAddRequest = function (nodeSpec, mode) {
  return nodeSpec && (nodeSpec.id == this.node.id);
}


/*
 Create a new node on the server or insert an existing one, in either case making the
 node represented by this node be its parent. Then effect the same transformation
 on the client side.
 */
ViewNode.prototype.addChild = function(nodeSpec) {
  // null node means we're creating a new node as opposed to moving an existing one.
  // Make sure we are expanded so that the new child node can be seen.
  if (!nodeSpec) this.expand();

  return this._add(nodeSpec, 'add_child');
}


/*
 Create a new node on the server or insert an existing one, in either case making the
 node represented by this node be its predecessor. Then effect the same transformation
 on the client side.
 */
ViewNode.prototype.addSuccessor = function(nodeSpec) {
  this.parent().expand(); // Make sure that our parent is expanded so that the new node can be seen.
  return this._add(nodeSpec, 'add_successor');
}


/*
 Create a new node on the server or insert an existing one, in either case making the
 node represented by this node be its successor. Then effect the same transformation
 on the client side.
 */
ViewNode.prototype.addPredecessor = function(nodeSpec) {
  this.parent().expand(); // Make sure that our parent is expanded so that the new node can be seen.
  return this._add(nodeSpec, 'add_predecessor');
}


// ========================== Paste
// Paste node onto ourselves. This means adding it as a child.
ViewNode.prototype.paste = function(node) {
  return this.addChild({id: node.id});
};

// =========================== Trash

/*
 Get rid of <this> from the information tree.
 */
ViewNode.prototype.trash = function() {
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
}


// Collapse this node, which means hiding its children and hiding its button panel.
ViewNode.prototype.collapse = function(doRecursive) {
  this.state = 'collapsed'
  var nodeChildren = $(this).children('node-children')
  nodeChildren.hide('slow')

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
  var scrollBarWidth = 20;
  var width = 0.0
  var height = 0.0
  var widthInChars = 0.0;
  var heightInChars= 0.0;
  if (n < 60) {
    widthInChars  = n;
    heightInChars = 1;
  } else {
    widthInChars  = Math.min(maxWidth, Math.sqrt(3 * n  * charHeight / charWidth))
    heightInChars = n / widthInChars;
  }
  width  = widthInChars * charWidth + scrollBarWidth;
  height = heightInChars * charHeight;

  return {width:width, height:height}
}



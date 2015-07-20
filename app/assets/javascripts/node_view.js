/*
This file defines the NodeView class.

A NodeView is a client-side dom element that represents a single node in the information tree.
*/

// =========================================================================
//                   Node View
// =========================================================================
var NodeView = defCustomTag('node-view', HTMLElement);


// ======= Construction and Initialization
/*
 Create a NodeView object from a Node object. The NodeView object is a wrapper for the Node
 object and endows the Node object with UI-related functionality. The Node object is not a dom element,
 but the NodeView object is.

 NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
 We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
 need to pass args, which can only be passed via afterCreate().
 */
NodeView.prototype.afterCreate = function(node) {
  this.node = node; // This must precede everything, since many initializes depend on the values in this.node.
  this.id   = node.id

  var $this  = $(this)
  $this.append(this.header = new NodeHeaderView(this, {tooltip:"Created on " + node.createdAt}))
  $this.append(this.childrenContainer = new NodeChildrenView);

  this.update(node) // This needs to follow the header and container appends above; it invokes setters that depend upon them.

  this.collapse();   // Note: need to call this method, not just to set state, but so that child dom element will be hidden.

  $this.draggable({
    revert: true,
    helper: "clone",
    start: this.dragStart,
    stop: this.dragStop
  })
}

// Clean up the width and height after we are attached.
// The problem here is that width and height are set at create time, which is the only time
// during which we can pass in args, such as width and height. But, because the node is not yet
// attached to the DOM, the computed width and height are wrong somehow (not sure of details).
NodeView.prototype.onAttach = function() {
  // The conditional is a kludge: For dragging, the nodeView gets shallow-copied and won't have a header.
  // In that case, we want to ignore it anyway.
  if (this.header) {
    this.width   = this.node.width
    this.height  = this.node.height
  }
}

/*
Update ourselves to reflect the info in node. If node is not specified,
use existing this.node. If it is specified, replace this.node with the new node.
*/
NodeView.prototype.update = function (node) {
  if (node) this.node = node;

  if (this.node.id != this.id) throw ("Attempt to update from node with different id: Our id is " + this.id + " but node's is " + node.id);

  this.width   = this.node.width
  this.height  = this.node.height
  this.content = this.node.content

  return this;
}


// TODO: Change format to jquery style setter/getter wrapped in a single function for each setter/getter.
Object.defineProperties(NodeView.prototype, {
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
        $(this.header.content).width(v)
      }
    },

    height: {
      get: function() {
        return $(this.header.content).height()
      },
      set: function(v) {
        $(this.header.content).height(v)
      }
    }
  }
);


/*
 A drag event just started. Erase the last drop target.
 This function is called whenever a new drag event is initiated.
 */

NodeView.prototype.dragStart = function() {
  App.treeView.dropTarget = null;
}


/*
 A drag event just ended. Determine whether we were dropped on top of another node,
 or let go beneath a node, and do either an addChild() or an addSuccessor() accordingly.
 */
NodeView.prototype.dragStop = function(event, helper) {
  // There's a drop target: add a child
  if (App.treeView.dropTarget) {
    App.controller.addChild(App.treeView.dropTarget, {id: this.node.id});
    return;
  }

  // There's a node above the release position: add a successor
  var node = App.treeView.findLowestNodeAbove(helper.position.top);
  if (node) {
    App.controller.addSuccessor(node, {id: this.node.id});
  }
};


NodeView.prototype.visibleNodeViews = function(result) {
  result.push(this);
  if (this.state == 'expanded') {
    this.kids().forEach(function(node) {
      node.visibleNodeViews(result);
    });
  }
  return result;
}

// =========================================================================
//        Tree Hierarchy Accessors And Manipulation Methods
// =========================================================================
// TODO: Probably this should be done in the model instead of the view, no?
// But we need to attach the dom elements to the dom hierarchy. So we must use
// the views out some point. When?

/*
 Attach ourselves to the information tree view. This is done just after a new
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


NodeView.prototype._attachSuccessor = function(successorView) {
  $(this).after(successorView);
  return this;
};


NodeView.prototype._attachPredecessor = function(predecessorView) {
  $(this).before(predecessorView);
  return this;
};


/*
 NOTE: This method will only be called by glom() if the parent has no children yet.
 */
NodeView.prototype._attachChild = function(childView) {
  $(this.childrenContainer).append(childView);
  return this;
};


/*
 Search the dom for a NodeView whose id matches the predecessor id of this.node
 and return it if found.
 */
NodeView.prototype.predecessor = function() {
  return App.treeView.find(this.node.predecessor_id);
};


/*
 Search the dom for a NodeView whose id matches the predecessor id of this.node
 and return it if found.
 */
NodeView.prototype.successor = function() {
  return App.treeView.find(this.node.successor_id);
};


/*
 Search the dom for a NodeView whose id matches the parent id of this.node
 and return it if found.
 */
NodeView.prototype.parent = function() {
  return App.treeView.find(this.node.parent_id);
}

NodeView.prototype.kids = function() {
  return $(this.childrenContainer).children().get();
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
 to the node represented by <this> NodeView, creating the new node if necessary. After the server
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
 */

NodeView.prototype._add = function(nodeSpec, mode) {
  return this.node
    .add(nodeSpec, mode)
    .success(function(node) {
        return App.treeView.addNodeView(node);
    })
};


/*
 Create a new node on the server or insert an existing one, in either case making the
 node represented by this node be its parent. Then effect the same transformation
 on the client side.
 */
NodeView.prototype.addChild = function(nodeSpec) {
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
NodeView.prototype.addSuccessor = function(nodeSpec) {
  this.parent().expand(); // Make sure that our parent is expanded so that the new node can be seen.
  return this._add(nodeSpec, 'add_successor');
}


/*
 Create a new node on the server or insert an existing one, in either case making the
 node represented by this node be its successor. Then effect the same transformation
 on the client side.
 */
NodeView.prototype.addPredecessor = function(nodeSpec) {
  this.parent().expand(); // Make sure that our parent is expanded so that the new node can be seen.
  return this._add(nodeSpec, 'add_predecessor');
}


// ========================== Paste
// Paste node onto ourselves. This means adding it as a child.
NodeView.prototype.paste = function(node) {
  return this.addChild({id: node.id});
};

// =========================== Trash

/*
 Get rid of <this> from the information tree.
 */
NodeView.prototype.trash = function() {
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
  var self = this;
  this.node.fetchChildren()
    .success(function(children) {
      App.treeView.addNodes(children)
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

NodeView.prototype.toggleExpandCollapse = function(doRecursive) {
  if (this.state == 'expanded') {
    this.collapse(doRecursive)
  } else {
    this.expand(doRecursive)
  }
}


// =================== Auto-Size
// Calculate a pleasing size for the content textarea associated with this text node.
NodeView.prototype.autoSize = function() {
  var autoSize = this.calcAutoSize()
  this.width = autoSize.width
  this.height = autoSize.height
}

/*
Make changes to self that are spec'd in the data object nodeUpdate.
nodeUpdate need not be a complete nodeSpec. It may simply contain a few key/values
to be changed within this.node, the rest remaining the same.
 */
NodeView.prototype.setAttributes = function (nodeUpdate) {
  var self = this;
  this.node.setAttributes(nodeUpdate)
    .success(function() {
      self.update()})
}

// Calculate a pleasing width and height for a textarea input box that contains n chars.
// Return the calculated values as a hash.
// TODO: Get rid of magic numbers, and make calculation take font size into account.
// TODO: height is not set correctly for large amounts of text. Fix it.
NodeView.prototype.calcAutoSize = function() {
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



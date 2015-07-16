/*
This file defines the NodeView class.

A NodeView is a client-side dom element that represents a single node in the information tree.
*/

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
  this.header = new NodeHeaderView(this, {tooltip:"Created on " + nodeRep.created_at}); // TODO: this is inelegant. should use this.createdAt, but it hasn't been assigned yet, and can't be assigned before header node is created.
  // TODO: how do you handle re-initializing existing memory, as opposed to genning new memory, for instances?

  $this.append(this.header)

  this.childrenContainer = new NodeChildrenView;
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
  App.treeView.dropTarget = null;
}


/*
 A drag event just ended. Determine whether we were dropped on top of another node,
 or let go beneath a node, and do either an addChild() or an addSuccessor() accordingly.
 */
NodeView.prototype.dragStop = function(event, helper) {
  // There's a drop target: add a child
  if (App.treeView.dropTarget) {
    App.controller.addChild(App.treeView.dropTarget, {id: this.id});
    return;
  }

  // There's a node above the release position: add a successor
  var node = App.treeView.findLowestNodeAbove(helper.position.top);
  if (node) {
    App.controller.addSuccessor(node, {id: this.id});
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
  return App.treeView.find(this.predecessor_id);
};


/*
 Search the dom for a NodeView whose id matches the predecessor id of this
 and return it if found.
 */
NodeView.prototype.successor = function() {
  return App.treeView.find(this.successor_id);
};


/*
 Search the dom for a NodeView whose id matches the parent id of this
 and return it if found.
 */
NodeView.prototype.parent = function() {
  return App.treeView.find(this.parent_id);
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

      var node = App.treeView._addNodeOnClient(nodeRep);
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
        callback(App.treeView._addNodesOnClient(fetchedNodes));
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


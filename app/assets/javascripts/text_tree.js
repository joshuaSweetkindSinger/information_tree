/*
This defines classes for the node hierarchy of an outline document.
The structure is as follows:
TextTree: a single node of this type is put in a static html file, which initiates the dynamic
          creation of a text tree when the html file is loaded into the browser, via its custom tag constructor.
          A text tree is made up of TextNodes.
TextNode: has two child elements, called NodeHeader and NodeChildren.
NodeHeader: represents content for the node, as well as clickable buttons to take action on the node. It
            contains an element NodeContent, as well as button elements like ExpandCollapse, AddChild, AddSibling.
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

// ========================================================================
//                   Text Tree
// =========================================================================
var TextTree = defCustomTag('text-tree', HTMLElement);

// Find the top node of the tree and add it to the dom.
TextTree.prototype.onCreate = function() {
  window.textTree  = this;
}

TextTree.prototype.onAttach = function() {
  this.initTop();
}

TextTree.prototype.initTop = function() {
  var me = this;
  this.getTopNodeFromServer(function(node) {
    if (node) {
      me.top = new TextNode(node);
      me.buttonPanel = new ButtonPanel;
      $(me).append(me.buttonPanel);
      $(me).append(me.top)
      me.top.select();
    }})
}

TextTree.prototype.topNodePath = function() {
  return '/nodes/top.json'
}

TextTree.prototype.getTopNodeFromServer = function(continuation) {
  getJsonFromServer("GET", this.topNodePath(), continuation)
}


/*
Return an array of all the nodes in the text tree that are currently visible.
Return the nodes in order of descending y-value. This means that every visible node will
be preceded by its older siblings, all their visible descendants, and by its parent.
*/
TextTree.prototype.visibleNodes = function() {
  return this.top.visibleNodes([]);
}


TextTree.prototype.findLowestNodeAbove = function(y) {
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
TextTree.prototype.find = function(id) {
  if (!id) return;

  var $node = $('#' + id);
  if ($node.length > 0) {
    return $node[0];
  }
}

TextTree.prototype.findOrCreate = function(node) {
  return this.find(node.id) || (new TextNode(node));
}

// =========================================================================
//                   Text Node
// =========================================================================
var TextNode = defCustomTag('text-node', HTMLElement)
TextNode.defaultSpec = {content:'New Node', width:100, height:50} // Default json spec for a new node

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
  this.header = new NodeHeader({toolTip:"Created on " + node.created_at}); // TODO: this is inelegant. should use this.createdAt, but it hasn't been assigned yet, and can't be assigned before header node is created.
  // TODO: how do you handle re-initializing existing memory, as opposed to genning new memory, for instances?

  $this.append(this.header)
  this.childrenContainer = new NodeChildren;
  $this.append(this.childrenContainer)

  this.update(node) // Assign properties from node

  // Record client-side state info
  this.childrenFetched = false // True when we have received child node information from the server. See fetch_and_expand()
  this.collapse();

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
  window.textTree.dropTarget = null;
}


/*
A drag event just ended. Determine whether we were dropped on top of another node,
or let go beneath a node, and do either an addChild() or an addSuccessor() accordingly.
*/
TextNode.prototype.dragStop = function(event, helper) {
  // There's a drop target: add a child
  if (window.textTree.dropTarget) {
    window.textTree.dropTarget.addChild({id: this.id});
    return;
  }

  // There's a node above the release position: add a successor
  var node = window.textTree.findLowestNodeAbove(helper.position.top);
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
  this.width = this._width
  this.height = this._height
}


Object.defineProperties(TextNode.prototype, {
    content: {
      get: function() {
        return $(this).children('node-header').children('textarea').val()
      },
      set: function(content) {
        $(this).children('node-header').children('textarea').val(content)
      }
    },

    width: {
      get: function() {
        return $(this).children('node-header').children('textarea').width()
      },
      set: function(v) {
        this._width = v // Cache requested width. This is a kludge to fix incorrect width at create time. See onAttach() above.
        $(this).children('node-header').children('textarea').width(v)
      }
    },

    height: {
      get: function() {
        return $(this).children('node-header').children('textarea').height()
      },
      set: function(v) {
        this._height = v // Cache requested height. This is a kludge to fix incorrect width at create time. See onAttach() above.
        $(this).children('node-header').children('textarea').height(v)
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
    this.kids().each(function(index){
      this.visibleNodes(result);
    });
  }
  return result;
}


// ============================ Glom and relative accessors
/*
Attach ourselves to the Text tree. This is done just after a new
TextNode is created from a rep sent by the server to the client.

We figure out where to attach ourselves by examining our predecessor, successor,
and parent links. If we have one of the first two links, we know exactly where to attach
ourselves. If we have neither, then we must be the only child of our parent.
*/
TextNode.prototype.glom = function() {
  var relative;
  if (relative = this.predecessor()) {
    relative.attachSuccessor(this);
    return this;
  }

  if (relative = this.successor()) {
    relative.attachPredecessor(this);
    return this;
  }

  if (relative = this.parent()) {
    relative.attachChild(this);
    return this;
  }

  console.log("could not glom:", this);
};


TextNode.prototype.attachSuccessor = function(successor) {
  $(this).after(successor);
  return this;
};


TextNode.prototype.attachPredecessor = function(predecessor) {
  $(this).before(predecessor);
  return this;
};


TextNode.prototype.attachChild = function(child) {
  $(this.childrenContainer).append(child);
  return this;
};


/*
Search the dom for a TextNode whose id matches the predecessor id of this
and return it if found.
*/
TextNode.prototype.predecessor = function() {
  return window.textTree.find(this.predecessor_id);
};


/*
Search the dom for a TextNode whose id matches the predecessor id of this
and return it if found.
*/
TextNode.prototype.successor = function() {
  return window.textTree.find(this.successor_id);
};


/*
Search the dom for a TextNode whose id matches the parent id of this
and return it if found.
*/
TextNode.prototype.parent = function() {
  return window.textTree.find(this.parent_id);
}

TextNode.prototype.kids = function() {
  return $(this.childrenContainer).children();
}


// =================== Auto-Size
// Calculate a pleasing size for the content textarea associated with this text node.
TextNode.prototype.autoSize = function() {
  this.setAttributes(this.calcAutoSize(this.content.length))
}

// Calculate a pleasing width and height for a textarea input box that contains n chars.
// Return the calculated values as a hash.
// TODO: Get rid of magic numbers, and make calculation take font size into account.
// TODO: height is not set correctly for large amounts of text. Fix it.
TextNode.prototype.calcAutoSize = function(n) {
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
// =================== Expand / Collapse
// Expand this node, first fetching its children from the server if necessary.
TextNode.prototype.expand = function(doRecursive) {
  // Children are already fetched--just expand on browser side.
  if (this.childrenFetched) {
    if (doRecursive) {
      this.kids().each(function(index) {
        this.expand(doRecursive)
      })
    }
    this.expandInternal()
    return
  }

  // Fetch and Expand
  var me = this;
  this.getChildrenFromServer(function(childrenReps) {
    if (!childrenReps) return

    childrenReps.forEach(function(nodeRep) {
      var node = (new TextNode(nodeRep)).glom() // TODO: Figure out how to not incur browser redraw cost for each added child.
      if (doRecursive) node.expand(doRecursive)
    })
    me.childrenFetched = true;
    me.expandInternal()
  })
}


// Get our child nodes from the server, in json format, and pass this json structure
// to continuation for further processing.
TextNode.prototype.getChildrenFromServer = function(continuation) {
  getJsonFromServer("GET", this.childrenPath(this.id), continuation)
}

TextNode.prototype.childrenPath = function(id) {
  return '/nodes/' + id + '/children.json'
}


// Expand this node, which means revealing its children and showing its button panel.
TextNode.prototype.expandInternal = function() {
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


// =========================== Add Node

/*
Ask the server to add a text node, specified by <node>,
to the node represented by this text node. After the server
responds with a success code, effect the same changes on the client-side.

If node is null, create a new default node.

If node is non-null and fully spec'd,
but without an id, create a new node as specified.

If node is non-null, but just contains an id, use the existing node
with that id for the add operation and move it to the new location
relative to <this>.

mode determines how node is moved relative to <this>, as either a child, successor, or predecessor
of the node represented by <this>. mode should be a string, one of: 'child', 'successor', 'predecessor'
*/
TextNode.prototype.addNode = function(node, mode) {
  if (!node) {
    node = TextNode.defaultSpec;
  }

  this.addNodeOnServer(node, mode,
    function(node) {
      if (node.error) {
        console.log("Got an error attempting to add this node on the server:", node);
        window.debug = node;
        return;
      };

      window.textTree.findOrCreate(node)
      .update(node)
      .glom();
    });
};


/*
Create a new node, or insert an existing one, on the server.
Attach it to the text node tree at a position relative to this node
as indicated by mode, which must be one of 'add_child', 'add_successor', 'add_predeessor'.
Then execute the function next() when done.
Inputs:
  node: if creating a new node, this should be an object that specs out the desired new node.
        If adding an existing node, then this should just be an object with an id whose
        value is the id of the existing node.
  mode: one of 'add_child', 'add_successor', 'add_predecessor'.
  next: This is a continuation function that says what to do after the node is created or inserted.
*/
TextNode.prototype.addNodeOnServer = function(node, mode, next) {
  getJsonFromServer(
    "POST",
    this.addNodePath(),
    next,
    {node: node, mode:mode}
  );
};


TextNode.prototype.addNodePath = function() {
  return '/nodes/' + this.id + '/add_node.json'
}

/*
Create a new node, or insert an existing one, on the server, with the
node represented by this node as its parent. Then effect the same transformation
on the client side.
*/
TextNode.prototype.addChild = function(node) {
  this.addNode(node, 'add_child');
}


/*
Create a new node, or insert an existing one, on the server, with the
node represented by this node as its predecessor. Then effect the same transformation
on the client side.
*/
TextNode.prototype.addSuccessor = function(node) {
  this.addNode(node, 'add_successor');
}



/*
Create a new node, or insert an existing one, on the server, with the
node represented by this node as its successor. Then effect the same transformation
on the client side.
*/
TextNode.prototype.addPredecessor = function(node) {
  this.addNode(node, 'add_predecessor');
}


// =========================== trash
// Ask the server to trash this node from the hierarchy.
// When the server replies, trash the node from the browser.
TextNode.prototype.trash = function() {
  var me = this
  sendServer(
    "DELETE",
    this.trashPath(this.id),
    function(request) {
      if (HTTP.is_success_code(request.status)) {
        me.trashOnClient();
      }
    })
}

TextNode.prototype.trashPath = function(id) {
  return '/nodes/' + id + '/trash.json'
}


// Create a new sibling node on the client side, with data specified in the nodeRep hash.
// See TextNode.afterCreate() for relevant keys in nodeRep
TextNode.prototype.trashOnClient = function() {
  $(this).remove()
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

/*
Make this node be the selected node. Attach pop up menu to it.
*/
TextNode.prototype.select = function() {
  window.textTree.selectedNode = this;
  window.textTree.buttonPanel.popTo(this);
}

// =========================================================================
//                   Node Header
// =========================================================================
/*
NodeHeader is a container for the node's content and buttons.
*/
var NodeHeader = defCustomTag('node-header', HTMLElement)
NodeHeader.prototype.afterCreate = function(options) {
  var $this = $(this)

  this.content = new NodeContent(options);
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

  this.followLinkButton = new FollowLink
  $this.append(this.followLinkButton)

  this.autoSizeButton = new AutoSize
  $this.append(this.autoSizeButton)

  this.addChildButton = new AddChild
  $this.append(this.addChildButton)

  this.addSiblingButton = new AddSibling
  $this.append(this.addSiblingButton)

  this.trashNodeButton = new TrashNode
  $this.append(this.trashNodeButton)

  this.expandCollapseButton = new ExpandCollapse
  $this.append(this.expandCollapseButton)

  this.expandCollapseRecursiveButton = new ExpandCollapseRecursive
  $this.append(this.expandCollapseRecursiveButton)
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
  $(this).offset({left:left-42, top:top});
}


// =========================================================================
//                   Node Content
// =========================================================================
// NodeContent holds the text that represents the content of the node.

var NodeContent = defCustomTag('node-content', HTMLTextAreaElement, 'textarea')

NodeContent.prototype.afterCreate = function(options) {
  var $this = $(this);
  $this.addClass('node-content');
  $this.on("blur", this.onBlur)
  $this.on("blur", this.onResize)
  $this.on("click", this.onClick)
  $this.tooltip({content:options.toolTip});

  $this.droppable({
    tolerance: "pointer",
    hoverClass: "drop-hover",
    greedy: true,
    drop: this.handleDrop
  })
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
  var textNode = this.getTextNode();
  if (textNode.id) {
    window.textTree.dropTarget = textNode;
  }
};


NodeContent.prototype.set_id = function(id) {
  this.id = 'NodeContent-' + id;
}


NodeContent.prototype.onClick = function() {
  this.getTextNode().select();
}

// This event-handler is bound to the object's blur event.
// It causes the content of the node to change on the server.
NodeContent.prototype.onBlur = function(e) {
  var $this = $(this)
  var node = $this.parent().parent()[0]
  node.setAttributes({
    content: node.content})
}

// This event-handler is bound to the object's blur event.
// It causes the width and height of the node's text area to change on the server.
NodeContent.prototype.onResize = function(e) {
  var $this = $(this)
  var node = $this.parent().parent()[0]
  node.setAttributes({
    width: $this.width(),
    height: $this.height()})
}

NodeContent.prototype.getTextNode = function() {
  return $(this).parent().parent()[0]
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
//                   Node Button
// =========================================================================
// Base class for text node buttons.
var NodeButton = defCustomTag('node-button', HTMLElement)

NodeButton.prototype.afterCreate = function() {
  $(this).addClass('node-button')
}


// =========================================================================
//                   FollowLink Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var FollowLink = defCustomTag('follow-link', NodeButton)

FollowLink.prototype.afterCreate = function() {
  NodeButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('->')
  $this.click(function(event) {
    window.textTree.selectedNode.followLink();
  })
}



// =========================================================================
//                   AutoSize Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var AutoSize = defCustomTag('auto-size', NodeButton)

AutoSize.prototype.afterCreate = function() {
  NodeButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('s')
  $this.click(function(event) {window.textTree.selectedNode.autoSize()})
}

// =========================================================================
//                   Expand / Collapse Button
// =========================================================================
var ExpandCollapse = defCustomTag('expand-collapse', NodeButton)

ExpandCollapse.prototype.afterCreate = function() {
  NodeButton.prototype.afterCreate.call(this)
  $(this).html('c');

  $(this).click(function(event) {
    this.toggle()
    })
}


ExpandCollapse.prototype.toggle = function() {
  window.textTree.selectedNode.toggle(false)
}


// =========================================================================
//                   Expand / Collapse Recursive Button
// =========================================================================
var ExpandCollapseRecursive = defCustomTag('expand-collapse-recursive', NodeButton)

ExpandCollapseRecursive.prototype.afterCreate = function() {
  NodeButton.prototype.afterCreate.call(this)
  $(this).html('C');
  $(this).click(function(event) {
    this.toggle()})
}


ExpandCollapseRecursive.prototype.toggle = function() {
  window.textTree.selectedNode.toggle(true)
}


// =========================================================================
//                   Add Child Button
// =========================================================================
var AddChild = defCustomTag('add-child', NodeButton)

AddChild.prototype.afterCreate = function() {
  NodeButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('(+)')

  // Click function adds a new child TextNode to the TextNode associated with this button. This means
  // adding the new node to the TextNode's NodeChildren element.
  $this.click(function() {
      window.textTree.selectedNode.addChild();
    })
}

// =========================================================================
//                   Add Sibling Button
// =========================================================================
var AddSibling = defCustomTag('add-sibling', NodeButton)
AddSibling.prototype.afterCreate = function() {
  NodeButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('...+')

  // Click function adds a new TextNode after the TextNode associated with this button.
  $this.click(function() {
    window.textTree.selectedNode.addSuccessor();
  })
}

// =========================================================================
//                   Trash Node Button
// =========================================================================
var TrashNode = defCustomTag('trash-node', NodeButton)
TrashNode.prototype.afterCreate = function() {
  NodeButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('x')

  // Click function trashs the TextNode associated with this button.
  $this.click(function() {
    window.textTree.selectedNode.trash();
    window.textTree.selectedNode = null;   // We just deleted the selected node, so now there is none.
    $(window.textTree.buttonPanel).hide(); // we just deleted the selected node, so hide the button panel.
  })
}

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
  window.textTree = this;
  this.addTop();
}

TextTree.prototype.addTop = function() {
  var me = this;
  this.getTopNodeFromServer(function(node) {
    if (node) {
      me.top = new TextNode(node);
      $(me).append(me.top)
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

// =========================================================================
//                   Text Node
// =========================================================================
var TextNode = defCustomTag('text-node', HTMLElement)
TextNode.defaultSpec = {content:'New Node', width:100, height:50} // Default json spec for a new node

// ======= Construction and Initialization
/*
Create a client-side representation of nodeRef, which exists on the server.

NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
need to pass args, which can only be passed via afterCreate().
 */
TextNode.prototype.afterCreate = function(nodeRef) {
  var $this = $(this)

  // Create dom-substructures
  // NOTE: These must be created before the properties below are assigned,
  // because some of them get passed into the substructures.
  this.header = new NodeHeader
  $this.append(this.header)
  this.childrenContainer = new NodeChildren;
  $this.append(this.childrenContainer)

  // Assign properties from ref
  this.update(nodeRef)

  // Record client-side state info
  this.childrenFetched = false // True when we have received child node information from the server. See fetch_and_expand()
  this.collapse()

  var me = this;
  $this.draggable({
    revert: true,
    helper: "clone",
    start: function(a, b, c) {
      window.dragDrop = {drag:{}, drop:{}};
    },
    stop: function(event, helper) {
      window.dragDrop.drag.event  = event;
      window.dragDrop.drag.helper = helper;
      window.dragDrop.drag.Obj    = me;
      /*
      if (textNode.children.length > 0) { // kludge to prevent acting on phantom drop. TODO: debug this someday.
        textNode.addChild({id:ui.draggable[0].id});
      }
      */
    }
  })
}

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
    myId: {
      get: function() {
        return this.id
      },

      set: function(id) {
        this.id = id
        this.header.myId = id
        this.childrenContainer.myId = id
      }
    },

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
)

TextNode.prototype.visibleNodes = function(result) {
  result.push(this);
  if (this.state == 'expanded') {
    this.kids().each(function(index){
      this.visibleNodes(result);
    });
  }
  return result;
}

// ====================================== Class Methods
// TODO: Maybe make all of these instance methods of TextTree.

/*
If it currently exists in the dom, return the text node with the specified id.
*/
TextNode.find = function(id) {
  if (!id) return;

  var $node = $('#' + id);
  if ($node.length > 0) {
    return $node[0];
  }
}

TextNode.findOrCreate = function(node) {
  return TextNode.find(node.id) || (new TextNode(node));
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
  return TextNode.find(this.predecessor_id);
};


/*
Search the dom for a TextNode whose id matches the predecessor id of this
and return it if found.
*/
TextNode.prototype.successor = function() {
  return TextNode.find(this.successor_id);
};


/*
Search the dom for a TextNode whose id matches the parent id of this
and return it if found.
*/
TextNode.prototype.parent = function() {
  return TextNode.find(this.parent_id);
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
  this.expandCollapseButton().expand()
  this.expandCollapseRecursiveButton().expand()
  $(this.header.buttonPanel).show('slow')
}


// Collapse this node, which means hiding its children and hiding its button panel.
TextNode.prototype.collapse = function(doRecursive) {
  this.state = 'collapsed'
  var nodeChildren = $(this).children('node-children')
  nodeChildren.hide('slow')
  this.expandCollapseButton().collapse()
  this.expandCollapseRecursiveButton().collapse()
  $(this.header.buttonPanel).hide('slow')
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

TextNode.prototype.expandCollapseButton = function() {
  return this.header.buttonPanel.expandCollapseButton
}
TextNode.prototype.expandCollapseRecursiveButton = function() {
  return this.header.buttonPanel.expandCollapseRecursiveButton
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
      if (node.error) return;
      TextNode.findOrCreate(node)
      .update(node)
      .glom();
    });
};


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
  this.myId           = node.id
  this.type_id        = node.type_id
  this.parent_id      = node.parent_id;
  this.predecessor_id = node.predecessor_id;
  this.successor_id   = node.successor_id;
  this.rank           = node.rank;
  this.content        = node.content
  this.width          = node.width
  this.height         = node.height

  return this;
}

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
      me.trashOnClient()
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

// =========================================================================
//                   Node Header
// =========================================================================
/*
NodeHeader is a container for the node's content and buttons.
*/
var NodeHeader = defCustomTag('node-header', HTMLElement)
NodeHeader.prototype.onCreate = function() {
  var $this = $(this)

  this.content = new NodeContent
  $this.append(this.content)

  this.buttonPanel = new ButtonPanel
  $this.append(this.buttonPanel)
  $(this.buttonPanel).hide()
}

Object.defineProperties(NodeHeader.prototype, {
    myId: {
      get: function() {
        return this.id
      },

      set: function(id) {
        this.id = id
        this.content.id = id
        this.buttonPanel.id = id
      }
    }
  })

// =========================================================================
//                   Button Panel
// =========================================================================
/*
ButtonPanel is a container for the node's buttons.
*/
var ButtonPanel = defCustomTag('button-panel', HTMLElement)
ButtonPanel.prototype.onCreate = function() {
  var $this = $(this)

  this.debugButton = new NodeDebug
  $this.append(this.debugButton)

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

Object.defineProperties(ButtonPanel.prototype, {
  myId: {
    get: function() {
      return this.id
    },

    // TODO: Are these necessary? Who uses them?
    set: function(id) {
      this.id                      = id
      this.expandCollapseButton.id = id
      this.addChildButton.id       = id
      this.addSiblingButton.id     = id
      this.trashNodeButton.id      = id
    }
  }
})

// =========================================================================
//                   Node Content
// =========================================================================
// NodeContent holds the text that represents the content of the node.

var NodeContent = defCustomTag('node-content', HTMLTextAreaElement, 'textarea')

NodeContent.prototype.afterCreate = function() {
  var $this = $(this);
  $this.addClass('node-content')
  $this.on("blur", this.onBlur)
  $this.on("blur", this.onResize)
  $this.on("click", this.onClick)

  $this.droppable({
    tolerance: "pointer",
    hoverClass: "drop-hover",
    greedy: true,
    drop: function(event, ui) {
      window.dragDrop.drop.target = this.getTextNode();;
      window.dragDrop.drop.source = ui.draggable[0];
    }
  })
}


NodeContent.prototype.onClick = function() {
  var panel = $(this).parent()[0].buttonPanel
  $(panel).show()

  this.getTextNode().toggle()
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
NodeChildren.prototype.onCreate = function() {
}


// =========================================================================
//                   Node Button
// =========================================================================
// Base class for text node buttons. It provides functionality to activate or deactivate
// a button.
var NodeButton = defCustomTag('node-button', HTMLElement)

NodeButton.prototype.onCreate = function() {
  var $this = $(this)
  $this.addClass('node-button')
  this.activate()
}

NodeButton.prototype.is_active = function() {
  return $(this).hasClass('node-button-active')
}

// Render the button inactive, which means that it displays a grayed-out state
// and clicking on it doesn't do anything. The button is rendered inactivate when
// its associated node is collapsed, to prevent creation of children that would immediately
// be hidden from view.
NodeButton.prototype.deactivate = function() {
  var $this = $(this)
  $this.removeClass('node-button-active')
  $this.addClass('node-button-inactive')
}

// Render the button active, which means that
// clicking on it does something. The button is rendered active when
// its associated node is expanded, to allow creation of child nodes.
// TODO: This should be a method on a base class from which AddChild inherits.
NodeButton.prototype.activate = function() {
  var $this = $(this)
  $this.removeClass('node-button-inactive')
  $this.addClass('node-button-active')
}

NodeButton.prototype.getTextNode = function() {
  return $(this).parents('text-node')[0]
}


// =========================================================================
//                   FollowLink Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var FollowLink = defCustomTag('follow-link', NodeButton)

FollowLink.prototype.onCreate = function() {
  NodeButton.prototype.onCreate.call(this)

  var $this = $(this)
  $this.html('->')
  $this.click(function(event) {
    this.getTextNode().followLink()
  })
}
// =========================================================================
//                   NodeDebug Button
// =========================================================================
// Pressing this button prints the associated node out to the console for debugging.
var NodeDebug = defCustomTag('node-debug', NodeButton)

NodeDebug.prototype.onCreate = function() {
  NodeButton.prototype.onCreate.call(this)

  var $this = $(this)
  $this.html('D')
  $this.click(function(event) {
    console.log("Assigning this node to the global window.debug: ", this.getTextNode())
    window.debug = this.getTextNode();
  })
}

// =========================================================================
//                   AutoSize Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var AutoSize = defCustomTag('auto-size', NodeButton)

AutoSize.prototype.onCreate = function() {
  NodeButton.prototype.onCreate.call(this)

  var $this = $(this)
  $this.html('s')
  $this.click(function(event) {this.getTextNode().autoSize()})
}

// =========================================================================
//                   Expand / Collapse Button
// =========================================================================
var ExpandCollapse = defCustomTag('expand-collapse', NodeButton)

ExpandCollapse.prototype.onCreate = function() {
  NodeButton.prototype.onCreate.call(this)

  $(this).click(function(event) {this.toggle()})
}


ExpandCollapse.prototype.toggle = function() {
  this.getTextNode().toggle(false)
}

ExpandCollapse.prototype.collapse = function() {
  var $this = $(this)
  $this.html("o")
  // $this.siblings('add-child')[0].deactivate() // commented this out--can always add a child, it will auto-expand the node.
}

ExpandCollapse.prototype.expand = function() {
  var $this = $(this)
  $this.html("c")
  // $this.siblings('add-child')[0].activate()  // commented this out--can always add a child, it will auto-expand the node.
}

// =========================================================================
//                   Expand / Collapse Recursive Button
// =========================================================================
var ExpandCollapseRecursive = defCustomTag('expand-collapse-recursive', NodeButton)

ExpandCollapseRecursive.prototype.onCreate = function() {
  NodeButton.prototype.onCreate.call(this)
  $(this).click(function(event) {
    this.toggle()})
}


ExpandCollapseRecursive.prototype.toggle = function() {
  this.getTextNode().toggle(true)
}

ExpandCollapseRecursive.prototype.collapse = function() {
  var $this = $(this)
  $this.html("O")
  // $this.siblings('add-child')[0].deactivate() // Commented this out--can always add a child, and it will auto-expand the node.
}

ExpandCollapseRecursive.prototype.expand = function() {
  var $this = $(this)
  $this.html("C")
  // $this.siblings('add-child')[0].activate() // Commented this out--can always add a child, and it will auto-expand the node.
}

// =========================================================================
//                   Add Child Button
// =========================================================================
var AddChild = defCustomTag('add-child', NodeButton)

AddChild.prototype.onCreate = function() {
  NodeButton.prototype.onCreate.call(this)

  var $this = $(this)
  $this.html('(+)')

  // Click function adds a new child TextNode to the TextNode associated with this button. This means
  // adding the new node to the TextNode's NodeChildren element.
  $this.click(function() {
    if (this.is_active()) {
      this.getTextNode().addChild()
    }
  })
}

// =========================================================================
//                   Add Sibling Button
// =========================================================================
var AddSibling = defCustomTag('add-sibling', NodeButton)
AddSibling.prototype.onCreate = function() {
  NodeButton.prototype.onCreate.call(this)

  var $this = $(this)
  $this.html('...+')

  // Click function adds a new TextNode after the TextNode associated with this button.
  $this.click(function() {
    this.getTextNode().addSuccessor();
  })
}


// =========================================================================
//                   Trash Node Button
// =========================================================================
var TrashNode = defCustomTag('trash-node', NodeButton)
TrashNode.prototype.onCreate = function() {
  NodeButton.prototype.onCreate.call(this)

  var $this = $(this)
  $this.html('x')

  // Click function trashs the TextNode associated with this button.
  $this.click(function() {
    this.getTextNode().trash()
  })
}

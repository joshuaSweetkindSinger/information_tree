/*
This defines classes for the node hierarchy of an outline document.
The structure is as follows:
TextTree: a single node of this type is put in a static html file, which initiates the dynamic
          creation of a text tree when the html file is loaded into the browser, via its custom tag constructor.
          A text tree is made up of TextNodes.
TextNode: has two child elements, called NodeHeader and NodeChildren.
NodeHeader: represents a label for the node, as well as clickable buttons to take action on the node. It
            contains elements NodeLabel, ExpandCollapse, AddChild, AddSibling.
NodeChildren: represents a container for sub-nodes. Its only children are of type UiNode.

Text Nodes are stored in the db in the nodes table. When the client-side expands a node, it asks the db for its children,
which get sent as json, and then the client builds the nodes on the browser.

New nodes are created by sending an async request to the server to create the new node.
 */

// =========================================================================
//                   Text Tree
// =========================================================================
var TextTree = defCustomTag('text-tree', HTMLElement)

// Find the top node of the tree and add it to the dom.
TextTree.prototype.onCreate = function() {
  var $me = $(this)
  this.getTopNodeFromServer(function(node) {
    if (node) {
      $me.append(new TextNode(node))
    }})
}

TextTree.prototype.topNodePath = function() {
  return '/nodes/top.json'
}

TextTree.prototype.getTopNodeFromServer = function(continuation) {
  getJsonFromServer("GET", this.topNodePath(), continuation)
}

// =========================================================================
//                   Text Node
// =========================================================================
var TextNode = defCustomTag('text-node', HTMLElement)
TextNode.defaultSpec = {content:'New Node', width:100, height:50} // Default json spec for a new node

// ======= Construction and Initialization
/*
NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
need to pass args, which can only be passed via afterCreate().
 */
TextNode.prototype.afterCreate = function(options) {
  var $this = $(this)

  this.header = new NodeHeader
  $this.append(this.header)

  this.kids = new NodeChildren
  $this.append(this.kids)

  this.collapse()
  this.childrenFetched = false // True when we have received child node information from the server. See fetch_and_expand()
  this.myId    = options.id
  this.content = options.content
  this.width   = options.width
  this.height  = options.height
  this.type_id = options.type_id
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
        this.kids.myId = id
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
  var maxWidth = 600.0
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
      $(this).children('node-children').children().each(function(index) {
        this.expand(doRecursive)
      })
    }
    this.expandInternal()
    return
  }

  // Fetch and Expand
  var me = this
  this.getChildrenFromServer(function(childrenJson) {
    if (!childrenJson) return

    childrenJson.forEach(function(nodeJson) {
      var node = me.addChildOnClient(nodeJson) // TODO: Figure out how to not incur browser redraw cost for each added child.
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


TextNode.prototype.expandInternal = function() {
  this.state = 'expanded'
  $(this).children('node-children').show('slow')
  this.header.expandCollapseButton.expand()
  this.header.expandCollapseRecursiveButton.expand()
}


TextNode.prototype.collapse = function(doRecursive) {
  this.state = 'collapsed'
  var nodeChildren = $(this).children('node-children')
  nodeChildren.hide('slow')
  this.header.expandCollapseButton.collapse()
  this.header.expandCollapseRecursiveButton.collapse()
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


// =========================== Add Child
// Ask the server to create a child text node with the content in childSpec hash.
// When the server replies, create the text node on the client side as well.
TextNode.prototype.addChild = function(childSpec) {
  var me = this
  getJsonFromServer(
    "POST",
    this.addChildPath(this.id),
    function(childRep) {
      if (childRep.error) return
      me.addChildOnClient(childRep)
    },
    {node: childSpec}
  )
}

TextNode.prototype.addChildPath = function(parentId) {
  return '/nodes/' + parentId + '/create_child.json'
}


// Create a new child node on client side, with data specified in the childRep hash.
// See TextNode.afterCreate() for relevant keys in childRep
TextNode.prototype.addChildOnClient = function(childRep) {
  if (childRep.parent_id != this.id) {
    throw("Mismatching ids: parent_id from server (" + childRep.parent_id + ") does not match id of parent on client (" + this.id + ").")
  }
  var result = new TextNode(childRep)
  $(this).children('node-children').append(result)
  return result
}

// =========================== Add Sibling
// Ask the server to create a sibling text node with the content in options hash.
// When the server replies, create the text node on the client side as well.
TextNode.prototype.addSibling = function(options) {
  var me = this
  getJsonFromServer(
    "POST",
    this.addSiblingPath(this.id),
    function(json) {
      if (json.error) return
      me.addSiblingOnClient(json)
    },
    {node: options}
  )
}

TextNode.prototype.addSiblingPath = function(id) {
  return '/nodes/' + id + '/create_sibling.json'
}


// Create a new sibling node on the client side, with data specified in the nodeRep hash.
// See TextNode.afterCreate() for relevant keys in nodeRep
TextNode.prototype.addSiblingOnClient = function(nodeRep) {
  $(this).after(new TextNode(nodeRep))
}


// =========================== Remove
// Ask the server to remove this node from the hierarchy.
// When the server replies, remove the node from the browser.
TextNode.prototype.remove = function() {
  var me = this
  sendServer(
    "DELETE",
    this.removePath(this.id),
    function(request) {
      if (HTTP.is_success_code(request.status)) {
      me.removeOnClient()
      }
    })
}

TextNode.prototype.removePath = function(id) {
  return '/nodes/' + id + '/remove.json'
}


// Create a new sibling node on the client side, with data specified in the nodeRep hash.
// See TextNode.afterCreate() for relevant keys in nodeRep
TextNode.prototype.removeOnClient = function() {
  $(this).remove()
}

// ======================== Set Attributes

// Set attributes for this node. The attributes to change, and their values,
// are in options, which is a hash. The hash is sent to the server, to change the values
// on the server first, and then the server replies with a json that represents the changed node.
// Note: This does not allow you to set attributes affecting topology, e.g.: parent_id, rank.
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
var NodeHeader = defCustomTag('node-header', HTMLElement)
NodeHeader.prototype.onCreate = function() {
  var $this = $(this)

  this.autoSizeButton = new AutoSize
  $this.append(this.autoSizeButton)

  this.addChildButton = new AddChild
  $this.append(this.addChildButton)

  this.addSiblingButton = new AddSibling
  $this.append(this.addSiblingButton)

  this.removeNodeButton = new RemoveNode
  $this.append(this.removeNodeButton)

  this.expandCollapseButton = new ExpandCollapse
  $this.append(this.expandCollapseButton)

  this.expandCollapseRecursiveButton = new ExpandCollapseRecursive
  $this.append(this.expandCollapseRecursiveButton)

  this.content = new NodeContent
  $this.append(this.content)

}

Object.defineProperties(NodeHeader.prototype, {
    myId: {
      get: function() {
        return this.id
      },

      set: function(id) {
        this.id = id
        this.content.id = id
        this.expandCollapseButton.id = id
        this.addChildButton.id = id
        this.addSiblingButton.id = id
        this.removeNodeButton.id = id
      }
    }
  })

// =========================================================================
//                   Node Content
// =========================================================================
var NodeContent = defCustomTag('node-content', HTMLTextAreaElement, 'textarea')

NodeContent.prototype.afterCreate = function() {
  var $this = $(this)
  $this.addClass('node-content')
  $this.on("blur", this.onBlur)
  $this.on("mouseup", this.onResize)
}

// This event-handler is bound to the object's blur event.
// It causes the content of the node to change on the server.
NodeContent.prototype.onBlur = function() {
  var $this = $(this)
  var node = $this.parent().parent()[0]
  node.setAttributes({
    content: node.content})
}

// This event-handler is bound to the object's resize event.
// It causes the width and height of the node's text area to change on the server.
NodeContent.prototype.onResize = function(e) {
  console.log("***** onResize")
  var $this = $(this)
  var node = $this.parent().parent()[0]
  node.setAttributes({
    width: $this.width(),
    height: $this.height()})
}


// =========================================================================
//                   Node Children
// =========================================================================
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
// clicking on it does something. The button is rendered activate when
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
  $this.siblings('add-child')[0].deactivate()
}

ExpandCollapse.prototype.expand = function() {
  var $this = $(this)
  $this.html("c")
  $this.siblings('add-child')[0].activate()
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
  $this.siblings('add-child')[0].deactivate()
}

ExpandCollapseRecursive.prototype.expand = function() {
  var $this = $(this)
  $this.html("C")
  $this.siblings('add-child')[0].activate()
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
  // Note that $(this).parent() below refers to a NodeHeader, not a TextNode. The
  // TextNode is the NodeHeader's parent.
  $this.click(function() {
    if (this.is_active()) {
      this.getTextNode().addChild(TextNode.defaultSpec)
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
    this.getTextNode().addSibling(TextNode.defaultSpec)
  })
}


// =========================================================================
//                   Remove Node Button
// =========================================================================
var RemoveNode = defCustomTag('remove-node', NodeButton)
RemoveNode.prototype.onCreate = function() {
  NodeButton.prototype.onCreate.call(this)

  var $this = $(this)
  $this.html('x')

  // Click function removes the TextNode associated with this button.
  $this.click(function() {
    this.getTextNode().remove()
  })
}
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


// ============================ Text Tree
var TextTree = defCustomTag('text-tree', HTMLElement)

// Find the top node of the tree and add it to the dom.
TextTree.prototype.onCreate = function() {
  var $me = $(this)
  this.getTopNodeFromServer(function(nodeJson) {
    if (nodeJson) {
      $me.append(new TextNode(nodeJson))
    }})
}

TextTree.prototype.topNodePath = function() {
  return '/nodes/top.json'
}

TextTree.prototype.getTopNodeFromServer = function(continuation) {
  getJsonFromServer("GET", this.topNodePath(), continuation)
}

// ============================ Text Node
var TextNode = defCustomTag('text-node', HTMLElement)

TextNode.prototype.onCreate = function() {
  var $this = $(this)
  $this.append(new NodeHeader)
  $this.append(new NodeChildren)
  this.collapse()
  this.childrenFetched = false // True when we have received child node information from the server. See fetch_and_expand()
}

TextNode.prototype.afterCreate = function(options) {
  this.id      = options.id
  this.content = options.content
}

Object.defineProperties(TextNode.prototype, {
    content: {
      get: function() {
        $(this).children('node-header').children('textarea').val()
      },
      set: function(content) {
        $(this).children('node-header').children('textarea').val(content)
      }
    }
  }
)

// Expand this node, first fetching its children from the server if necessary.
TextNode.prototype.expand = function() {
  if (this.childrenFetched) return this.expandInternal() // Children are already fetched--just expand on browser side.

  // Fetch and Expand
  var me = this
  this.getChildrenFromServer(function(childrenJson) {
    if (!childrenJson) return

    childrenJson.forEach(function(nodeJson) {
      me.addChildOnClient(nodeJson) // TODO: Figure out how to not incur browser redraw cost for each added child.
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

TextNode.prototype.expandInternal = function() {
  this.state = 'expanded'
  $(this).children('node-children').show('slow')
}


TextNode.prototype.collapse = function() {
  this.state = 'collapsed'
  $(this).children('node-children').hide('slow')

}


TextNode.prototype.toggle = function() {
  if (this.state == 'expanded') {
    this.collapse()
  } else {
    this.expand()
  }
}

// Ask the server to create a child text node with the content in options hash.
// When the server replies, create the text node on the client side as well.
TextNode.prototype.addChild = function(options) {
  var me = this
  getJsonFromServer(
    "POST",
    this.addChildPath(this.id),
    function(jsonChild) {
      if (!jsonChild) return
      me.addChildOnClient(jsonChild)
    },
    {node: {content: 'New Child'}}
  )
}

TextNode.prototype.addChildPath = function(parentId) {
  return '/nodes/' + parentId + '/create_child.json'
}


// Create a node child node, with data specified in the options hash.
// Relevant keywords are id: and content:.
TextNode.prototype.addChildOnClient = function(options) {
  $(this).children('node-children').append(new TextNode(options))
}


TextNode.prototype.childrenPath = function(parentId) {
  return '/nodes/' + parentId + '/children.json'
}
// ============================ Node Header
var NodeHeader = defCustomTag('node-header', HTMLElement)
NodeHeader.prototype.onCreate = function() {
  var $this = $(this)
  $this.append(new NodeLabel)
  $this.append(new ExpandCollapse)
  $this.append(new AddChild)
  $this.append(new AddSibling)
}

// ============================ Node Label
var NodeLabel = defCustomTag('node-label', HTMLTextAreaElement, 'textarea')
NodeLabel.prototype.onCreate = function() {
  var $this = $(this)
  $this.val("New Node")
  $this.addClass('node-label')
  this.rows = 1
}

// ============================ Node Children
var NodeChildren = defCustomTag('node-children', HTMLElement)
NodeChildren.prototype.onCreate = function() {
}

// ================================ Node Buttons
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
  $this = $(this)
  $this.removeClass('node-button-active')
  $this.addClass('node-button-inactive')
}

// Render the button active, which means that
// clicking on it does something. The button is rendered activate when
// its associated node is expanded, to allow creation of child nodes.
// TODO: This should be a method on a base class from which AddChild inherits.
NodeButton.prototype.activate = function() {
  $this = $(this)
  $this.removeClass('node-button-inactive')
  $this.addClass('node-button-active')
}



// ============== Expand / Collapse Button
var ExpandCollapse = defCustomTag('expand-collapse', NodeButton)

ExpandCollapse.prototype.onCreate = function() {
  NodeButton.prototype.onCreate.call(this)

  var $this = $(this)

  $this.html("O")
  $this.click(function() {
    this.toggle()
  })

  this.state = 'collapsed'
}

ExpandCollapse.prototype.toggle = function() {
  var $this = $(this)

  if (this.state === 'expanded') {
    this.state = 'collapsed'
    $this.html("O")
    $this.siblings('add-child')[0].deactivate()
  } else {
    this.state = 'expanded'
    $this.html("C")
    $this.siblings('add-child')[0].activate()
  }
  this.parentNode.parentNode.toggle()
}

// ============== Add Child Button
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
    var $this = $(this)
    if (this.is_active()) {
      $this.parent().parent()[0].addChild({content:'New Child'})
    }
  })
}

// ============== Add Sibling Button
var AddSibling = defCustomTag('add-sibling', NodeButton)
AddSibling.prototype.onCreate = function() {
  NodeButton.prototype.onCreate.call(this)

  var $this = $(this)
  $this.html('...+')

  // Click function adds a new TextNode after the TextNode associated with this button.
  $this.click(function() {
    $(this).parent().parent().after(new TextNode('New Sibling'))
  })
}

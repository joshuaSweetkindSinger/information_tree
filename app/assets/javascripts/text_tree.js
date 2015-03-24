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
 */

TOP_NODE_PATH = '/nodes/top.json'

var TextTree = defCustomTag('text-tree', HTMLElement)

// Find the top node of the tree and add it to the dom.
TextTree.prototype.onCreate = function() {
  var $this = $(this)
  var topNode = new TextNode("Top Node")
  $this.append(topNode)
  send_server(
    "GET",
    TOP_NODE_PATH,
    function (request) {
      topNode.setLabel(JSON.parse(request.responseText).content)
    }
  )
}

var TextNode = defCustomTag('text-node', HTMLElement)

TextNode.prototype.onCreate = function() {
  var $this = $(this)
  $this.append(new NodeHeader)
  $this.append(new NodeChildren)
  this.state = 'expanded'
}

TextNode.prototype.afterCreate = function(label) {
  return this.setLabel(label)
}

TextNode.prototype.setLabel = function(label) {
  $(this).children('node-header').children('textarea').val(label)
  return label
}

TextNode.prototype.expand = function() {
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

var NodeHeader = defCustomTag('node-header', HTMLElement)
NodeHeader.prototype.onCreate = function() {
  var $this = $(this)
  $this.append(new NodeLabel)
  $this.append(new ExpandCollapse)
  $this.append(new AddChild)
  $this.append(new AddSibling)
}

var NodeLabel = defCustomTag('node-label', HTMLTextAreaElement, 'textarea')
NodeLabel.prototype.onCreate = function() {
  var $this = $(this)
  $this.val("New Node")
  $this.addClass('node-label')
  this.rows = 1
}

var NodeChildren = defCustomTag('node-children', HTMLElement)
NodeChildren.prototype.onCreate = function() {
}

var ExpandCollapse = defCustomTag('expand-collapse', HTMLElement)
ExpandCollapse.prototype.onCreate = function() {
  var $this = $(this)
  $this.html("O/o")
  $this.click(function() {
    this.parentNode.parentNode.toggle()
  })
}

var AddChild = defCustomTag('add-child', HTMLElement)

AddChild.prototype.onCreate = function() {
  var $this = $(this)
  $this.html('(+)')

  // Click function adds a new child TextNode to the TextNode associated with this button. This means
  // adding the new node to the TextNode's NodeChildren element.
  // Note that $(this).parent() below refers to a NodeHeader, not a TextNode. The
  // TextNode is the NodeHeader's parent.
  $this.click(function() {
    $(this).parent().siblings('node-children').append(new TextNode('New Child'))
  })
}

var AddSibling = defCustomTag('add-sibling', HTMLElement)
AddSibling.prototype.onCreate = function() {
  var $this = $(this)
  $this.html('...+')

  // Click function adds a new TextNode after the TextNode associated with this button.
  $this.click(function() {
    $(this).parent().parent().after(new TextNode('New Sibling'))
  })
}

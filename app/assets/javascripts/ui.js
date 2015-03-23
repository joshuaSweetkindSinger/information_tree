/*
This defines classes for the node hierarchy of an outline document.
The structure is as follows:
UiNode: has two children elements, called NodeHeader and NodeChildren.
NodeHeader: represents a label for the node, as well as clickable buttons to take action on the node. It
            contains elements NodeLabel, ExpandCollapse, AddChild, AddSibling.
NodeChildren: represents a container for sub-nodes. Its only children are of type UiNode.
 */
var UiNode = defCustomTag('ui-node', HTMLElement)

UiNode.prototype.onCreate = function() {
  var $this = $(this)
  $this.append(new NodeHeader)
  $this.append(new NodeChildren)
  this.state = 'expanded'
}

UiNode.prototype.afterCreate = function(label) {
  $(this).children('node-header').children('input').val(label)
}

UiNode.prototype.expand = function() {
  this.state = 'expanded'
  $(this).children('node-children').show('slow')
}


UiNode.prototype.collapse = function() {
  this.state = 'collapsed'
  $(this).children('node-children').hide('slow')

}


UiNode.prototype.toggle = function() {
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

var NodeLabel = defCustomTag('node-label', HTMLInputElement, 'input')
NodeLabel.prototype.onCreate = function() {
  var $this = $(this)
  $this.val("New Node")
  $this.addClass('node-label')
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

  // Click function adds a new child UiNode to the UiNode associated with this button. This means
  // adding the new node to the UiNode's NodeChildren element.
  // Note that $(this).parent() below refers to a NodeHeader, not a UiNode. The
  // UiNode is the NodeHeader's parent.
  $this.click(function() {
    $(this).parent().siblings('node-children').append(new UiNode('New Child'))
  })
}

var AddSibling = defCustomTag('add-sibling', HTMLElement)
AddSibling.prototype.onCreate = function() {
  var $this = $(this)
  $this.html('...+')

  // Click function adds a new UiNode after the UiNode associated with this button.
  $this.click(function() {
    $(this).parent().parent().after(new UiNode('New Sibling'))
  })
}

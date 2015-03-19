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
}

UiNode.prototype.afterCreate = function(label) {
  $(this).children('node-header').children('node-label').html(label)
}

var NodeHeader = defCustomTag('node-header', HTMLElement)
NodeHeader.prototype.onCreate = function() {
  var $this = $(this)
  $this.append(new NodeLabel)
  $this.append(new ExpandCollapse)
  $this.append(new AddChild)
  $this.append(new AddSibling)
}

var NodeLabel = defCustomTag('node-label', HTMLElement)
NodeLabel.prototype.onCreate = function() {
  var $this = $(this)
  $this.html("New Node")
}

var NodeChildren = defCustomTag('node-children', HTMLElement)
NodeChildren.prototype.onCreate = function() {
}

var ExpandCollapse = defCustomTag('expand-collapse', HTMLElement)
ExpandCollapse.prototype.onCreate = function() {
  var $this = $(this)
  $this.html("Expand / Collapse")
}

var AddChild = defCustomTag('add-child', HTMLElement)

AddChild.prototype.onCreate = function() {
  var $this = $(this)
  $this.html('Add Child')

  // Click function adds a new child UiNode to its parent UiNode. This means
  // adding the new node to its parent UiNode's NodeChildren element.
  // Note that $(this).parent() below refers to a NodeHeader, not a UiNode. The
  // UiNode is the NodeHeader's parent.
  $this.click(function() {
    $(this).parent().siblings('node-children').append(new UiNode('New Node'))
  })
}

var AddSibling = defCustomTag('add-sibling', HTMLElement)
AddSibling.prototype.onCreate = function() {
  var $this = $(this)
  $this.html('Add Sibling')

  // Click function adds a new UiNode as a sibling of its parent UiNode. This means
  // adding the new node as a sibling of its parent UiNode.
  $this.click(function() {
    $(this).parent().siblings('node-children').append(new UiNode('New Node'))
  })
}

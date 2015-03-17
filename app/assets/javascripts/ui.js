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
  $this.click(function() {
    $(this).parent().siblings('node-children').append(new UiNode('New Node'))
  })
}

var AddSibling = defCustomTag('add-sibling', HTMLElement)
AddSibling.prototype.onCreate = function() {
  var $this = $(this)
  $this.html('Add Sibling')
  $this.click(function() {
    $(this).parent().siblings('node-children').append(new UiNode('New Node'))
  })
}

/*
This file defines classes related to UI buttons.
The toplevel button container is the Button Panel.
 */
// =========================================================================
//                   Button Panel
// =========================================================================
/*
 ButtonPanel is a container for the node's buttons.
 */
var ButtonPanel = defCustomTag('button-panel', HTMLElement)
ButtonPanel.prototype.afterCreate = function() {
  var $this = $(this)

//  this.nop = new Nop
//  $this.append(this.nop)

  /*
  // This can cause problems when the recursion is too deep. Disabling for now.
  this.expandCollapseRecursiveButton = new ExpandCollapseRecursive
  $this.append(this.expandCollapseRecursiveButton)
  */

  this.saveButton = new Save
  $this.append(this.saveButton)

  this.addChildButton = new AddChild
  $this.append(this.addChildButton)

  this.addSuccessorButton = new AddSuccessor
  $this.append(this.addSuccessorButton)

  this.addPredecessorButton = new AddPredecessor
  $this.append(this.addPredecessorButton)

  this.cutButton = new CutNode
  $this.append(this.cutButton)

  this.pasteButton = new PasteNode
  $this.append(this.pasteButton)

  this.followLinkButton = new FollowLink
  $this.append(this.followLinkButton)

  this.emptyTrashButton = new EmptyTrash
  $this.append(this.emptyTrashButton)

  // Hide button panel after it is clicked on.
  $this.click(this.onClick)
}


/*
 Move button panel to float near. uiNode.
 Try to pop up the panel on the left of the node. If there isn't enough room, try to
 pop it up on the right side of the node instead. If there isn't enough room there either,
 pop it up flush left against the screen, which means it will overlap the node.

 Programmer's Note: In the case in which the selected node is deleted, we hide the button panel.
 If we then select a new node and change the button panel's offset before showing it, it shows up
 in the wrong place in the dom. Not sure why. But if you show the panel before setting the offset,
 then everything works okay.
p */
ButtonPanel.prototype.popTo = function(uiNode) {
  var $this = $(this)
  $this.show(); // I'm not sure why, but showing this before doing new offset avoids a bug. See documentation above.

  var panelWidth   = this.getBoundingClientRect().width
  var contentArea  = uiNode._header.contentArea
  var contentRect  = contentArea.getBoundingClientRect()
  var left         = contentRect.left - panelWidth // First try popping up the panel to the left of the node.
  var top          = contentRect.top // We will pop up at the same vertical level as the node.

  // Not enough room on the left--try popping up on the right of node instead.
 if (left < 0) {
    left = contentRect.right
  }

  // Not enough room on the right--pop up over node, matching left edges.
  if (left + panelWidth > $(window).width()) {
    left = 0;
  }

  $this.offset({left:left, top:top});
  uiNode.enableButtonPanelOptions(this)
}

ButtonPanel.prototype.onClick = function() {
  App.controller.resetMenus()
}


// Enable all buttons on the button panel.
ButtonPanel.prototype.enableAll = function () {
  $(this).children().each(function () {
    this.enable()
  })
}

// =========================================================================
//                   Button Panel Button
// =========================================================================
// Base class for button panel buttons.
var ButtonPanelButton = defCustomTag('button-panel-button', HTMLElement)

ButtonPanelButton.prototype.afterCreate = function(label, shortCutKey) {
  $(this).addClass('button-panel-button')
  $(this).html(label)
  if (shortCutKey) this.title = shortCutKey
  $(this).click(this.onClick)
}

/*
If status is true (or not supplied), then enable the button; otherwise,
disable it so that it can't be clicked on by removing its click handler.

PROGRAMMER's NOTE: the jquery on() method seems to accommodate adding the same handler multiple times.
That is, it doesn't notice whether a handler is already attached. If you attempt to attach the same handler,
twice, jquery will let you do that, and will fire the handler twice. Therefore, to make sure we don't get
the same handler attached multiple times, we clear the click handler at the beginning of the method.
*/
ButtonPanelButton.prototype.enable = function (status) {
  if (arguments.length === 0) status = true // default is to enable the button if no arg is supplied.

  $(this).off('click')

  if (!status) {
    $(this).addClass('button-panel-button-disabled')
  } else {
    $(this).removeClass('button-panel-button-disabled')
    $(this).on('click', this.onClick)
  }
}

ButtonPanelButton.prototype.disable = function () {
  this.enable(false)
}

// =========================================================================
//                   Nop Button
// =========================================================================
// Pressing this button does nothing but trigger a no-op control flow.
var Nop = defCustomTag('nop-nop', ButtonPanelButton)

Nop.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, 'Nop')

}

Nop.prototype.onClick = function(event) {
  App.controller.nop()
}


// =========================================================================
//                   FollowLink Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var FollowLink = defCustomTag('follow-link', ButtonPanelButton)

FollowLink.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, 'Follow Link', 'ctrl-f')
}

FollowLink.prototype.onClick = function (event) {
  App.controller.followLink()
}

// Disable ourselves on the popup menu if uiNode is not a followable link.
FollowLink.prototype.maybeDisable = function(uiNode) {
  var url = uiNode.content
  if (!(url.slice(0,4) == 'http')) this.disable();
}

// =========================================================================
//                   Save Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var Save = defCustomTag('save-node', ButtonPanelButton)

Save.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, 'Save', 'ctrl-s')
}

Save.prototype.onClick = function(event) {
  App.controller.saveNode()
}


// =========================================================================
//                   Cut Button
// =========================================================================
// Pressing this button copies the selected node to the copy buffer for later pasting.
var CutNode = defCustomTag('copy-node', ButtonPanelButton)

CutNode.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, 'Cut', 'ctrl-x')
}

CutNode.prototype.onClick = function (event) {
  App.controller.cutNode();
}

// =========================================================================
//                   Paste Button
// =========================================================================
// Pressing this button pastes the node in the copy buffer into the selected node, making
// it a child of the selected node.
var PasteNode = defCustomTag('paste-node', ButtonPanelButton)

PasteNode.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, 'Paste', 'ctrl-v')
}

PasteNode.prototype.onClick = function (event) {
  App.controller.pasteNode();
}


// =========================================================================
//                   Expand / Collapse Recursive Button
// =========================================================================
var ExpandCollapseRecursive = defCustomTag('expand-collapse-recursive', ButtonPanelButton)

ExpandCollapseRecursive.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, 'Open/Close All')
}

ExpandCollapseRecursive.prototype.onClick = function (event) {
  App.controller.toggleExpandCollapseAll()
}


// =========================================================================
//                   Create Child Button
// =========================================================================
var AddChild = defCustomTag('create-child', ButtonPanelButton)

AddChild.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, '+Child', 'shift-return')
}

AddChild.prototype.onClick = function (event) {
  App.controller.createChild()
}

// =========================================================================
//                   Create Successor Button
// =========================================================================
var AddSuccessor = defCustomTag('create-successor', ButtonPanelButton)
AddSuccessor.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, '+Successor', 'return')
}

AddSuccessor.prototype.onClick = function (event) {
  App.controller.createSuccessor()
}

// =========================================================================
//                   Create Predecessor Button
// =========================================================================
var AddPredecessor = defCustomTag('create-predecessor', ButtonPanelButton)
AddPredecessor.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, '+Predecessor')
}

AddPredecessor.prototype.onClick = function (event) {
  App.controller.createPredecessor()
}

// =========================================================================
//                   Empty Trash Button
// =========================================================================
var EmptyTrash = defCustomTag('empty-trash', ButtonPanelButton)
EmptyTrash.prototype.onCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, 'Empty Trash!')
}

EmptyTrash.prototype.onClick = function (event) {
  App.controller.emptyTrash()
}

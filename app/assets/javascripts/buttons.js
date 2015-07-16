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

  // this.nop = new Nop
  // $this.append(this.nop)

  this.expandCollapseRecursiveButton = new ExpandCollapseRecursive
  $this.append(this.expandCollapseRecursiveButton)

  this.saveButton = new Save
  $this.append(this.saveButton)

  this.addChildButton = new AddChild
  $this.append(this.addChildButton)

  this.addSuccessorButton = new AddSuccessor
  $this.append(this.addSuccessorButton)

  this.addPredecessorButton = new AddPredecessor
  $this.append(this.addPredecessorButton)

  this.copyButton = new CopyNode
  $this.append(this.copyButton)

  this.pasteButton = new PasteNode
  $this.append(this.pasteButton)

  this.followLinkButton = new FollowLink
  $this.append(this.followLinkButton)

  this.trashNodeButton = new TrashNode
  $this.append(this.trashNodeButton)

  this.untrashNodeButton = new UntrashNode
  $this.append(this.untrashNodeButton)

  // Hide button panel after it is clicked on.
  $this.click(this.onClick)
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
  $(this).offset({left:left-102, top:top}); // TODO: Remove hardcoded constant.
}

ButtonPanel.prototype.onClick = function() {
  $(this).hide()
}


// =========================================================================
//                   Expand / Collapse Button
// =========================================================================
var ExpandCollapse = defCustomTag('expand-collapse', HTMLElement)

ExpandCollapse.prototype.afterCreate = function(nodeView) {
  this.nodeView = nodeView

  $(this).html('>');

  $(this).click(function(event) {this.toggle(event)})
}


ExpandCollapse.prototype.toggle = function() {
  $(this).html(this.nodeView.state === 'expanded' ? '>' : 'v')
  App.controller.toggleNodeExpandCollapse(this.nodeView);
}

// =========================================================================
//                   Button Panel Button
// =========================================================================
// Base class for button panel  buttons.
var ButtonPanelButton = defCustomTag('button-panel-button', HTMLElement)

ButtonPanelButton.prototype.afterCreate = function() {
  $(this).addClass('button-panel-button')
}

// =========================================================================
//                   Nop Button
// =========================================================================
// Pressing this button does nothing but trigger a no-op control flow.
var Nop = defCustomTag('nop-nop', ButtonPanelButton)

Nop.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Nop')
  $this.click(this.onClick)
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
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Follow Link')
  $this.click(function(event) {App.controller.followLink()})
}


// =========================================================================
//                   Save Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var Save = defCustomTag('save-node', ButtonPanelButton)

Save.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Save')
  $this.click(this.onClick)
}

Save.prototype.onClick = function(event) {
  App.controller.save()
}


// =========================================================================
//                   Copy Button
// =========================================================================
// Pressing this button copies the selected node to the copy buffer for later pasting.
var CopyNode = defCustomTag('copy-node', ButtonPanelButton)

CopyNode.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Copy')
  $this.click(this.onClick)
}

CopyNode.prototype.onClick = function (event) {
  App.controller.copyNode();
}

// =========================================================================
//                   Paste Button
// =========================================================================
// Pressing this button pastes the node in the copy buffer into the selected node, making
// it a child of the selected node.
var PasteNode = defCustomTag('paste-node', ButtonPanelButton)

PasteNode.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Paste')
  $this.click(this.onClick)
}

PasteNode.prototype.onClick = function (event) {
  App.controller.paste();
}
// TODO: I think all these buttons could just be instances of a MyButton class.
// Don't need separate classes for all of them.

// =========================================================================
//                   Expand / Collapse Recursive Button
// =========================================================================
var ExpandCollapseRecursive = defCustomTag('expand-collapse-recursive', ButtonPanelButton)

ExpandCollapseRecursive.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)
  $(this).html('Open/Close All');
  $(this).click(function(event) {App.controller.toggleExpandCollapseAll()})
}


// =========================================================================
//                   Add Child Button
// =========================================================================
var AddChild = defCustomTag('add-child', ButtonPanelButton)

AddChild.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('+Child')

  // Click function adds a new child NodeView to the NodeView associated with this button. This means
  // adding the new node to the NodeView's NodeChildrenView element.
  $this.click(function() {App.controller.addChild()})
}

// =========================================================================
//                   Add Successor Button
// =========================================================================
var AddSuccessor = defCustomTag('add-successor', ButtonPanelButton)
AddSuccessor.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('+Successor')

  // Click function adds a new NodeView after the NodeView associated with this button.
  $this.click(function() {App.controller.addSuccessor()})
}

// =========================================================================
//                   Add Predecessor Button
// =========================================================================
var AddPredecessor = defCustomTag('add-predecessor', ButtonPanelButton)
AddPredecessor.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('+Predecessor')

  // Click function adds a new NodeView after the NodeView associated with this button.
  $this.click(function() {App.controller.addPredecessor()})
}

// =========================================================================
//                   Trash Node Button
// =========================================================================
var TrashNode = defCustomTag('trash-node', ButtonPanelButton)
TrashNode.prototype.onCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Delete!')

  $this.click(this.onClick);
}

TrashNode.prototype.onClick = function (event) {
  App.controller.trash();
}

// =========================================================================
//                   Untrash Node Button
// =========================================================================
// Pressing this button undoes the last delete operation, restoring the last trashed node to the hierarchy
// by re-inserting it with the predecessor it had before. This is guaranteed to work if it is performed just
// after the delete operation was performed. However, if performed later on, the predecessor itself may have been
// moved or may have been trashed, in which case unexpected results may occur.
var UntrashNode = defCustomTag('untrash-node', ButtonPanelButton)

UntrashNode.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this)

  var $this = $(this)
  $this.html('Untrash')
  $this.click(function(event) {App.controller.restoreLastDeletedNode()})
}

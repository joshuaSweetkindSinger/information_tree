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

  this.cutButton = new CutNode
  $this.append(this.cutButton)

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
// TODO: the isTopNode flag is inelegant and won't scale well. Find a better way.
ButtonPanel.prototype.popTo = function(node, isTopNode) {
  $(this).show(); // I'm not sure why, but showing this before doing new offset avoids a bug. See documentation above.
  var offset = $(node).offset();
  var left   = offset.left;
  var top    = offset.top;
  $(this).offset({left:left-102, top:top}); // TODO: Remove hardcoded constant.

  /* TODO: All this knowledge is in the wrong place. A node should know what options are valid on it and
    tell that to the popup menu. Hardcoding that knowledge in the popup is not DRY.
  */

  // These options are active only if we're not dealing with the top node.
  this.addPredecessorButton.enable(!isTopNode);
  this.addSuccessorButton.enable(!isTopNode);
  this.cutButton.enable(!isTopNode);
  this.trashNodeButton.enable(!isTopNode);
}

ButtonPanel.prototype.onClick = function() {
  $(this).hide()
}

// =========================================================================
//                   Button Panel Button
// =========================================================================
// Base class for button panel  buttons.
var ButtonPanelButton = defCustomTag('button-panel-button', HTMLElement)

ButtonPanelButton.prototype.afterCreate = function(label) {
  $(this).addClass('button-panel-button')
  $(this).html(label)
  $(this).click(this.onClick)
}

/*
If status is true, then enabled the button; otherwise, disable it so that it can't be clicked on.
PROGRAMMER's NOTE: the jquery on() method seems to accommodate adding the same handler multiple times.
That is, it doesn't notice whether a handler is already attached. If you attempt to attach the same handler,
twice, jquery will let you do that, and will fire the handler twice. Therefore, to make sure we don't get
the same handler attached multiple times, we clear the click handler at the beginning of the method.
*/
ButtonPanelButton.prototype.enable = function (status) {
  $(this).off('click')

  if (!status) {
    $(this).addClass('button-panel-button-disabled')
  } else {
    $(this).removeClass('button-panel-button-disabled')
    $(this).on('click', this.onClick)
  }
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
  ButtonPanelButton.prototype.afterCreate.call(this, 'Follow Link')
}

FollowLink.prototype.onClick = function (event) {
  App.controller.followLink()
}

// =========================================================================
//                   Save Button
// =========================================================================
// Pressing this button automatically resizes the associated content textarea to be a pleasant size
// for the text.
var Save = defCustomTag('save-node', ButtonPanelButton)

Save.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, 'Save')
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
  ButtonPanelButton.prototype.afterCreate.call(this, 'Cut')
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
  ButtonPanelButton.prototype.afterCreate.call(this, 'Paste')
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
  ButtonPanelButton.prototype.afterCreate.call(this, '+Child')
}

AddChild.prototype.onClick = function (event) {
  App.controller.createChild()
}

// =========================================================================
//                   Create Successor Button
// =========================================================================
var AddSuccessor = defCustomTag('create-successor', ButtonPanelButton)
AddSuccessor.prototype.afterCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, '+Successor')
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
//                   Trash Node Button
// =========================================================================
var TrashNode = defCustomTag('trash-node', ButtonPanelButton)
TrashNode.prototype.onCreate = function() {
  ButtonPanelButton.prototype.afterCreate.call(this, 'Trash!')
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
  ButtonPanelButton.prototype.afterCreate.call(this, 'Untrash')
}

UntrashNode.prototype.onClick = function (event) {
  App.controller.restoreLastDeletedNode()
}

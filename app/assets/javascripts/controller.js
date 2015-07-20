// ========================================================================
//                   User Interface
// ========================================================================
/*
 Although everything on the client side is in some sense user-interface, here we are specifically
 designating a Ui object whose methods are those that respond directly to browser events and
 whose member variables are those that keep track of Ui state, such as selected objects, etc.

 The Ui gets its job done by calling lower-level client-side methods, which manipulate
 client-side objects. These lower-level methods
 do not belong to the ui and are distinguished by being callable in different ui contexts.

 Rather than making the Ui functionality be distributed across various classes, according to which dom
 object is receiving the click, we instead coalesce the full set of ui functionality in one place, which
 makes these methods more "functional" in the approach, because each ui function will need to be told an object-of-interest
 to act on. Under normal circumstances, it would be more natural to just associate the functionality as a method on the
 object of interest.
 */
Controller = function () {
  var self = this;

  this.selectedNode = null // The Ui maintains a "selected node", to which actions are performed.
  this.buttonPanel  = new ButtonPanel;

  App.uiTree.initRequest
    .success(function() {
    $(App.uiTree).append(self.buttonPanel);
    $(self.buttonPanel).hide();
    self.selectNode(App.uiTree.top);
  });
};

// Respond to a left-click on a node. Select the node and toggle the expanded-collapsed state of that node.
Controller.prototype.clickLeftOnNode = function (uiNode) {
  this.selectNode(uiNode);
}

// Respond to a right-click on a node. Select the node and pop up the command menu.
Controller.prototype.clickRightOnNode = function (uiNode, event) {
  this.selectNode(uiNode);
  this.buttonPanel.popTo(uiNode);
  event.preventDefault();
}

// Handle a blur action on a node. This usually means saving any changes to the node to the server.
Controller.prototype.blurNode = function (uiNode) {
  uiNode = uiNode || this.selectedNode
  if (uiNode.isContentDirty()) this.autoSizeNode(uiNode)
  if (uiNode.isDirty()) this.saveNode(uiNode)
}


Controller.prototype.autoSizeNode = function (uiNode) {
  (uiNode || this.selectedNode).autoSize()
}

/*
 Select the specified node.
 */
Controller.prototype.selectNode = function (uiNode) {
  this.selectedNode = uiNode;
}


// TODO: make the selected node be a node instead of a nodeview.
// Trash the selected node.
Controller.prototype.trash = function (uiNode) {
  uiNode = uiNode || this.selectedNode
  uiNode.node.trash()
    .success(function() {
      uiNode.trash()
      if (uiNode === this.selectedNode) {
        this.selectedNode = null;   // We just deleted the selected node, so now there is none.
        $(this.buttonPanel).hide(); // we just deleted the selected node, so hide the button panel.
      }
    })
}


// Toggle the expanded-collapsed state of node.
Controller.prototype.toggleNodeExpandCollapse = function (uiNode) {
  (uiNode || this.selectedNode).toggleExpandCollapse();
}


// Open up in a new tab (or window) the URL represented by our node's content.
Controller.prototype.followLink = function (uiNode) {
  uiNode = (uiNode || this.selectedNode)
  var url = uiNode.content
  if (url.slice(0,4) == 'http') open(url)
}

/*
 Make the node referenced by childSpec be a child of parentUiNode, creating the child if necessary.
 childSpec can either be an object with an id key referencing an existing node, or null.
 If null, a new UiNode will be created. If a new node will be created, then we move focus to the new node
 after it is added.
 */
Controller.prototype.addChild = function (parentUiNode, childSpec) {
  var self = this;
  return (parentUiNode || self.selectedNode)
    .addChild(childSpec)
    .success(function(uiNode) {
      if (!childSpec) self.restoreFocus(uiNode);
    })
}

// successorSpec can either be an object with an id key referencing an existing node or null.
// Add successorSpec as the successor of predecessor. If successorSpec is null, create a new node
// and set the focus to it.
Controller.prototype.addSuccessor = function (predecessorUiNode, successorSpec) {
  var self = this;
  return (predecessorUiNode || self.selectedNode)
    .addSuccessor(successorSpec)
    .success(function(uiNode) {
      if (!successorSpec) self.restoreFocus(uiNode)
    })
}

// predecessorSpec can either be an object with an id key referencing an existing node or null.
// Add predecessorSpec as the predecessor of successor. If predecessorSpec is null, create a new node
// and set the focus to it.
Controller.prototype.addPredecessor = function (successorUiNode, predecessorSpec) {
  var self = this;
  return (successorUiNode || self.selectedNode)
    .addPredecessor(predecessorSpec)
    .success(function(uiNode) {
      if (!predecessorSpec) self.restoreFocus(uiNode)
    })
}

// Restore the focus to the specified viewNode, which somehow gets lost on new node creation.
// Hack! For some reason, sometimes, a sequence of blur events occurs that undoes
// the focus() to a new Node, because they occur after the focus().
Controller.prototype.restoreFocus = function (uiNode) {
  setTimeout(function() {uiNode.focus()}, 100);
}


// Cut node == copy + delete
Controller.prototype.cutNode = function (uiNode) {
  uiNode = (uiNode || this.selectedNode);
  this.copyNode(uiNode);
  this.trash(uiNode);
}


// Copy node into the copiedNode holding area.
Controller.prototype.copyNode = function (uiNode) {
  this.copiedNode = (uiNode || this.selectedNode);
}


// Paste the copiedNode onto node.
Controller.prototype.pasteNode = function (uiNode) {
  (uiNode || this.selectedNode).paste(this.copiedNode)
}


Controller.prototype.saveNode = function (uiNode) {
  uiNode = uiNode || this.selectedNode;
  var attributes = {
    content: uiNode.content,
    width:   uiNode.width,
    height:  uiNode.height
  }
  this.setAttributes(uiNode, attributes)
}


Controller.prototype.hideButtonPanel = function () {
  $(this.buttonPanel).hide()
}


Controller.prototype.toggleExpandCollapseAll = function (uiNode) {
  (uiNode || this.selectedNode).toggleExpandCollapse(true)
}


// TODO: the trash functionality needs to record information about the former parentage
// and sibling relationships somewhere so that a trashed node can be restored later.
Controller.prototype.restoreLastDeletedNode = function() {
  alert("Untrash has not yet been implemented");
}

Controller.prototype.setAttributes = function (uiNode, attributes) {
  (uiNode || this.selectedNode).setAttributes(attributes)
}


// This does nothing. Use it for testing.
Controller.prototype.nop = function() {
}
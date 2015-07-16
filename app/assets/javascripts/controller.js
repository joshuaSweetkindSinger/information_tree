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

  App.treeView.then(function() {
    $(App.treeView).append(self.buttonPanel);
    $(self.buttonPanel).hide();
    self.selectNode(App.treeView.top);
  });


  // Trash the selected node.
  self.trash = function (node) {
    node = node || self.selectedNode
    node.trash();
    if (node === self.selectedNode) {
      self.selectedNode = null;   // We just deleted the selected node, so now there is none.
      $(self.buttonPanel).hide(); // we just deleted the selected node, so hide the button panel.
    }
  };

  // Respond to a left-click on a node. Select the node and toggle the expanded-collapsed state of that node.
  self.clickLeftOnNode = function (node) {
    self.selectNode(node);
  }

  // Respond to a right-click on a node. Select the node and pop up the command menu.
  self.clickRightOnNode = function (node, event) {
    self.selectNode(node);
    self.buttonPanel.popTo(node);
    event.preventDefault();
  }


  /*
   Select the specified node.
   */
  self.selectNode = function (node) {
    self.selectedNode = node;
  }


  // Toggle the expanded-collapsed state of node.
  self.toggleNodeExpandCollapse = function (node) {
    (node || self.selectedNode).toggle(false);
  }


  /*
   Child can be null, in which case a new node will be created.
   If a new node will be created, then we pass a callback to move focus to the new node
   after it is added.
   */
  self.addChild = function (parent, child) {
    (parent || self.selectedNode).addChild(child, child ? null : self._addNodeUiCallback);
  }

  // Callback to the Ui after the server has given us a new node.
  self._addNodeUiCallback = function (newNode) {
    newNode.header.content.placeholder = "New Node";

    // Hack! For some reason, sometimes, a sequence of blur events occurs that undoes
    // the focus() below, because the blurs occur after the focus.
    setTimeout(function() {
        $(newNode.header.content).focus()
      },
      100);
  }

  // Add successor as the successor of predecessor. If successor is null, create a new node
  // and set the focus to it.
  self.addSuccessor = function (predecessor, successor) {
    (predecessor || self.selectedNode).addSuccessor(successor, successor ? null : self._addNodeUiCallback);
  }

  // Add predecessor as the predecessor of successor. If predecessor is null, create a new node
  // and set the focus to it.
  self.addPredecessor = function (successor, predecessor) {
    (successor || self.selectedNode).addPredecessor(predecessor, predecessor ? null : self._addNodeUiCallback);
  }


  self.hideButtonPanel = function () {
    $(self.buttonPanel).hide()
  }

  self.followLink = function (node) {
    (node || self.selectedNode).followLink()
  }

  self.autoSize = function (node) {
    (node || self.selectedNode).autoSize()
  }

  // Copy node into the copiedNode holding area.
  self.copyNode = function (node) {
    self.copiedNode = (node || self.selectedNode);
  }

  // Cut node == copy + delete
  self.cutNode = function (node) {
    node = (node || self.selectedNode);
    self.copyNode(node);
    self.trash(node);
  }

  // Paste the copiedNode onto node.
  self.pasteNode = function (node) {
    (node || self.selectedNode).paste(self.copiedNode)
  }



  self.toggleExpandCollapseAll = function (node) {
    (node || self.selectedNode).toggle(true)
  }


  // TODO: the trash functionality needs to record information about the former parentage
  // and sibling relationships somewhere so that a trashed node can be restored later.
  self.restoreLastDeletedNode = function() {
    alert("Untrash has not yet been implemented");
  }

  self.setAttributes = function (node, attributes) {
    (node || self.selectedNode).setAttributes(attributes)
  }

  self.save = function (node) {
    node = node || self.selectedNode;
    var attributes = {
      content: node.content,
      width:   node.width,
      height:  node.height
    }
    self.setAttributes(node, attributes)
  }

  // This does nothing. Use it for testing.
  self.nop = function() {
  }
};

App.controller = Controller; // TODO: deprecated
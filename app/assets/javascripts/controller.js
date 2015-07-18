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

  App.treeView.initRequest
    .success(function() {
    $(App.treeView).append(self.buttonPanel);
    $(self.buttonPanel).hide();
    self.selectNode(App.treeView.top);
  });



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


  self.hideButtonPanel = function () {
    $(self.buttonPanel).hide()
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

  self.setAttributes = function (nodeView, attributes) {
    (nodeView || self.selectedNode).setAttributes(attributes)
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

// TODO: make the selected node be a node instead of a nodeview.
// Trash the selected node.
Controller.prototype.trash = function (nodeView) {
  nodeView = nodeView || self.selectedNode
  nodeView.node.trash()
    .success(function() {
      nodeView.trash()
      if (nodeView === self.selectedNode) {
        self.selectedNode = null;   // We just deleted the selected node, so now there is none.
        $(self.buttonPanel).hide(); // we just deleted the selected node, so hide the button panel.
      }
    })
}


// Toggle the expanded-collapsed state of node.
Controller.prototype.toggleNodeExpandCollapse = function (nodeView) {
  (nodeView || this.selectedNode).toggleExpandCollapse();
}


// Open up in a new tab (or window) the URL represented by our node's content.
Controller.prototype.followLink = function (nodeView) {
  nodeView = (nodeView || self.selectedNode)
  var url = nodeView.content
  if (url.slice(0,4) == 'http') open(url)
}

/*
 Child can be null, in which case a new node will be created.
 If a new node will be created, then we move focus to the new node
 after it is added.
 */
Controller.prototype.addChild = function (parent, child) {
  var self = this;
  return (parent || self.selectedNode)
    .addChild(child)
    .success(function(nodeView) {
      if (child) self.restoreFocus(nodeView);
    })
}

// Add successor as the successor of predecessor. If successor is null, create a new node
// and set the focus to it.
Controller.prototype.addSuccessor = function (predecessor, successor) {
  var self = this;
  return (predecessor || self.selectedNode)
    .addSuccessor(successor)
    .success(function(nodeView) {
      if (successor) self.restoreFocus(nodeView)
    })
}

// Add predecessor as the predecessor of successor. If predecessor is null, create a new node
// and set the focus to it.
Controller.prototype.addPredecessor = function (successor, predecessor) {
  var self = this;
  return (successor || self.selectedNode)
    .addPredecessor(predecessor)
    .success(function(nodeView) {
      if (predecessor) self.restoreFocus(nodeView)
    })
}

// Restore the focus to the specified nodeView, which somehow gets lost on new node creation.
// Hack! For some reason, sometimes, a sequence of blur events occurs that undoes
// the focus() to a new Node, because they occur after the focus().
Controller.prototype.restoreFocus = function (newNode) {
  var self = this;
  setTimeout(function() {
      $(newNode.header.content).focus()
    },
    100);
}


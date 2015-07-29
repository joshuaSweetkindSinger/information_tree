//= require buttons

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
Controller.prototype.clickedLeftOnNode = function (uiNode) {
  this.selectNode(uiNode);
}

// Respond to a right-click on a node. Select the node and pop up the command menu.
Controller.prototype.clickedRightOnNode = function (uiNode, event) {
  this.selectNode(uiNode);
  this.buttonPanel.popTo(uiNode);
  event.preventDefault();
}

// Respond to a right-click on the top node. Select the node and pop up its special command menu.
Controller.prototype.clickedRightOnTopNode = function (uiTopNode, event) {
  this.selectNode(uiTopNode);
  this.buttonPanel.popTo(uiTopNode, true);
  event.preventDefault();
}

// Respond to a right-click on the trash node. Select the node and pop up its special command menu.
Controller.prototype.clickedRightOnTrashNode = function (uiTrashNode, event) {
  return this.clickedRightOnTrashNode(uiTrashNode, event);
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


// Trash the selected node.
Controller.prototype.trash = function (uiNode) {
  uiNode = uiNode || this.selectedNode
  uiNode.trash()
    .success(function() {
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
 Make uiNodeToInsert be a child of uiReferenceNode.
 */
Controller.prototype.insertChild = function (uiReferenceNode, uiNodeToInsert) {
  return uiReferenceNode.insertChild(uiNodeToInsert)
}


/*
 Make uiNodeToInsert be a successor of uiReferenceNode.
 */
Controller.prototype.insertSuccessor = function (uiReferenceNode, uiNodeToInsert) {
  return uiReferenceNode.insertSuccessor(uiNodeToInsert)
}


/*
 Make uiNodeToInsert be a predecessor of uiReferenceNode.
 */
Controller.prototype.insertPredecessor = function (uiReferenceNode, uiNodeToInsert) {
  return uiReferenceNode.insertPredecessor(uiNodeToInsert)
}


/*
 Create a new uiNode and attach it to the tree as determined by mode, one of: createChild,
 createSuccessor, createPredecessor.
 */
Controller.prototype.createNode = function (uiNode, mode) {
  var self = this;
  return (uiNode || this.selectedNode)[mode]()
    .success(function(uiNewNode) {
      self.restoreFocus(uiNewNode);
    })
}

/*
 Create a new child of uiNode
 */
Controller.prototype.createChild = function (uiNode) {
  return this.createNode(uiNode, 'createChild');
}


/*
 Create a new successor of uiNode
 */
Controller.prototype.createSuccessor = function (uiNode) {
  return this.createNode(uiNode, 'createSuccessor');
}

/*
 Create a new predecessor of uiNode
 */
Controller.prototype.createPredecessor = function (uiNode) {
  return this.createNode(uiNode, 'createPredecessor');
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
  if (this.copiedNode) {
    (uiNode || this.selectedNode).paste(this.copiedNode)
  } else {
    alert("There is no node in the paste buffer to paste.")
  }
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
  console.log("Controller.nop")
}

// Called by node when a drag operation starts to let the controller
// know about it. In this case, we clear the previous drop target
// because a new drop is possibly about to occur.
Controller.prototype.adviseDragStart = function (uiNode) {
  this.dropTarget = null;
}


/*
Advise the controller that a drag event just ended.
Determine whether helperUiNode was dropped on top of another node,
 or let go beneath a node, and do either an insertChild() or an insertSuccessor() accordingly on
 originalNode.

 Inputs:
   event:        is the drag event object.
   helperUiNode: is a throw-away node created by jquery to give visual feedback on the dragged node
                 while the user is dragging it, without dragging the actual, original node that was clicked on.
   originalNode: is that original node that was clicked on by the user to initiate the drag event.
 */
Controller.prototype.adviseDragStop = function (event, helperUiNode, originalUiNode) {
  var uiReferenceNode;

  // There's a drop target: add originalNode as a child
  if (uiReferenceNode = this.dropTarget) {
    this.insertChild(uiReferenceNode, originalUiNode);

  // There's a node above us: add originalNode as a successor
  } else if (uiReferenceNode = App.uiTree.findLowestNodeAbove(helperUiNode.position.top)) {
    this.insertSuccessor(uiReferenceNode, originalUiNode);
  }
}

/*
 Record the drop target so that it can be added as a parent when the drag event finishes.
 */
Controller.prototype.adviseDrop = function(uiNode) {
  this.dropTarget = uiNode;
}


/*
Establish command key shortcuts for the ui.
 */
Controller.prototype.keyPressedOnNode = function (uiNode, event) {
  // carriage return -- create new successor node of uiNode
  if (event.charCode == 13 && !event.altKey && !event.shiftKey && !event.ctrlKey) {
    event.preventDefault();
    this.createSuccessor(uiNode);

  // shift-return -- create new child node of uiNode
  } else if (event.charCode == 13 && !event.altKey && event.shiftKey && !event.ctrlKey) {
    event.preventDefault();
    this.createChild(uiNode);

    // control-c -- copy uiNode
  } else if (event.charCode == 'c'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    this.copyNode(uiNode);

  // control-f -- follow link
  } else if (event.charCode == 'f'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    this.followLink(uiNode);

  // control-v -- paste the copied node onto uiNode.
  } else if (event.charCode == 'v'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    this.pasteNode(uiNode);

    // control-x -- cut uiNode
  } else if (event.charCode == 'x'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    this.cutNode(uiNode);

    // control-s -- save uiNode
  }  else if (event.charCode == 's'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    this.saveNode(uiNode);

    // control-a -- autosize uiNode
  }  else if (event.charCode == 'a'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    this.autoSizeNode(uiNode);
  }
}

/*
Establish command key shortcuts for the top node.
 */
Controller.prototype.keyPressedOnTopNode = function (uiTopNode, event) {
  // carriage return -- create new successor node is disallowed for top node.
  if (event.charCode == 13 && !event.altKey && !event.shiftKey && !event.ctrlKey) {
    event.preventDefault();

    // control-c -- copy this node is disallowed for top node.
  } else if (event.charCode == 'c'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();

    // control-x -- cut this node is disallowed for top node
  } else if (event.charCode == 'x'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();

    // Do standard node handling.
  } else {
    this.keyPressedOnNode(uiTopNode, event);
  }
}

Controller.prototype.keyPressedOnTrashNode = function (uiTrashNode, event) {
  return this.keyPressedOnTopNode(uiTrashNode, event);
}
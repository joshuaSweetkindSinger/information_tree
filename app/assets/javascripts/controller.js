//= require buttons
//= require drop_down_menus/visited_node_list
//= require drop_down_menus/node_path_list

// ========================================================================
//                   Controller
// ========================================================================
/*
 Although everything on the client side is in some sense user-interface, here we are specifically
 designating a controller object whose methods are those that respond directly to browser events and
 whose member variables are those that keep track of Ui state, such as selected objects, etc.

 The controller gets its job done by calling lower-level client-side methods, which manipulate
 client-side objects. These lower-level methods
 do not belong to the ui proper. They are callable in different ui contexts.

 Rather than distributing the Ui functionality widely across various classes, according to which dom
 object is receiving the click, we instead coalesce a core set of ui functionality in the controller.
 It isn't clear that this method is superior, or scales well, but it has the advantage of allowing a human
 to assess what the ui is about by examining this one file. It also allows interactions and dependencies
 among ui elements to be handled by the controller.
 */
var Controller = function () {
  this.selectedNode    = null // The Ui maintains a "selected node", to which actions are performed.
  this.buttonPanel     = new ButtonPanel
  this.appHeader       = $('#app-header')[0]
  this.visitedNodeList = $('#visited-node-list-drop-down')[0].init().menu
  this.nodePathList    = $('#node-path-list-drop-down')[0].init().menu

  $(this.appHeader).after(ITA.informationTree)
  this.initTree()
}



/*
 Initialize the UI elements of the tree.
 Set the root nodes of the tree, select the top node of the tree, and append some menus to the dom.
 */
Controller.prototype.initTree = function (rootNodeIds) {
  var tree = ITA.informationTree

  // Append and hide menu elements
  $(tree).append(this.buttonPanel)
  $(this.buttonPanel).hide()

  $(tree).append(this.visitedNodeList)
  $(this.visitedNodeList).hide()

  $(tree).append(this.nodePathList)
  $(this.nodePathList).hide()

  // Set root nodes of tree
  // var request = rootNodeIds ? ITA.server.getNodes(rootNodeIds, true) : ITA.server.getRoots() // Currently, UI does not take advantage of this extra functionality.
  var request = ITA.server.getRoots()
  var self    = this
  request.success(function (rootRefs) {
    tree.setLocalRootsFromRefs(rootRefs)
    self.selectNode(tree.getLocalRoots()[0])
  })
}

// Respond to a left-click on a node. Select the node and toggle the expanded-collapsed state of that node.
Controller.prototype.clickedLeftOnNode = function (uiNode) {
  this.selectNode(uiNode)
}

// Respond to a right-click on a node. Select the node and pop up the command menu.
Controller.prototype.clickedRightOnNode = function (uiNode, event) {
  this.resetMenus()
  this.selectNode(uiNode)
  this.buttonPanel.popTo(uiNode)
  event.preventDefault()
}


/*
Handle a blur action on a node. This means saving any changes to the node to the server.
Also, if the node is empty and not dirty, putInBasket the node on blur.
  */
Controller.prototype.blurNode = function (uiNode) {
  uiNode = uiNode || this.selectedNode

  if (uiNode.isContentDirty()) this.autoSizeNode(uiNode)
  if (uiNode.isDirty()) this.saveNode(uiNode)
  if (!uiNode.isDirty() && uiNode.content === '') uiNode.destroyEmpty()
}


Controller.prototype.autoSizeNode = function (uiNode) {
  (uiNode || this.selectedNode).autoSize()
}

/*
 Select the specified node.
 */
Controller.prototype.selectNode = function (uiNode) {
  this.selectedNode = uiNode
  $(uiNode).focus()
  this.visitedNodeList.addVisitedNode(uiNode)
  this.nodePathList.setPath(uiNode)
}


/*
 Visit the specified node. This means scrolling the node to the top of the viewport as well as selecting the node.
 */
Controller.prototype.visitNode = function (uiNode) {
  ITA.informationTree.maybeAugmentTree(uiNode)
  ITA.informationTree.scrollTo(uiNode)
  this.selectNode(uiNode)
}


// Put the selected node in the basket.
Controller.prototype.putInBasket = function (uiNode) {
  var self = this
  uiNode = uiNode || this.selectedNode
  uiNode.goToBasket()
    .success(function() {
      if (uiNode === self.selectedNode) {
        self.selectedNode = null    // We just deleted the selected node, so now there is none.
        $(self.buttonPanel).hide()  // we just deleted the selected node, so hide the button panel.
      }
    })
}


/*
 Copy uiNode and attach it to the tree as a child of the basket.
*/
Controller.prototype.copyToBasket = function (uiNode) {
  return (uiNode || this.selectedNode).copyToBasket()
}


Controller.prototype.emptyBasket = function () {
  ITA.informationTree.basket.empty()
}


// Toggle the expanded-collapsed state of node.
Controller.prototype.toggleNodeExpandCollapse = function (uiNode) {
  uiNode = (uiNode || this.selectedNode)
  this.selectNode(uiNode)
  uiNode.toggleExpandCollapse()
}


// Open up in a new tab (or window) the URL represented by our node's content.
Controller.prototype.followLink = function (uiNode) {
  uiNode = (uiNode || this.selectedNode)
  var url = uiNode.content
  if (url.slice(0,4) == 'http') open(url)
}

// Open selected node and its children as a static html page in a new tab.
Controller.prototype.renderRecursivelyAsHtml = function (uiNode) {
  uiNode = (uiNode || this.selectedNode)
  open(ITA.server.renderRecursivelyPath(uiNode.id) + '.html')
}


// Open selected node and its children as a static json page in a new tab.
Controller.prototype.renderRecursivelyAsJson = function (uiNode) {
  uiNode = (uiNode || this.selectedNode)
  open(ITA.server.renderRecursivelyPath(uiNode.id) + '.json')
}

// Create a sub-tree in a new tab with uiNode as the top node
Controller.prototype.toSubTree = function (uiNode) {
  uiNode = (uiNode || this.selectedNode)
  ITA.informationTree.setLocalRoots([uiNode])
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
 Create a new uiNode and attach it to the tree as a child/successor/predecessor of uiNode, as determined by mode, one of: createChild,
 createSuccessor, createPredecessor.
 */
Controller.prototype.createNode = function (uiNode, mode) {
  var self = this
  return (uiNode || this.selectedNode)[mode]()
    .success(function(uiNewNode) {
      uiNewNode.afterAttach.then(function(uiNewNode) {uiNewNode.focus()})
    })
}

/*
 Create a new child of uiNode
 */
Controller.prototype.createChild = function (uiNode) {
  uiNode = uiNode || this.selectedNode
  uiNode.expand() // Make sure node is expanded before creating child, so that it will be visible.
  return this.createNode(uiNode, 'createChild')
}


/*
 Create a new successor of uiNode
 */
Controller.prototype.createSuccessor = function (uiNode) {
  return this.createNode(uiNode || this.selectedNode, 'createSuccessor')
}

/*
 Create a new predecessor of uiNode
 */
Controller.prototype.createPredecessor = function (uiNode) {
  return this.createNode(uiNode || this.selectedNode, 'createPredecessor')
}


// Paste the node currently at the top of the basket as a new child of uiNode
Controller.prototype.pasteNode = function (uiNode) {
  var nodeToPaste = ITA.informationTree.basket.kids()[0]
  if (nodeToPaste) {
    (uiNode || this.selectedNode).paste(nodeToPaste)
  } else {
    alert("There is no node in the basket to paste.")
  }
}


// Paste the node currently at the top of the basket as a new successor of uiNode
Controller.prototype.pasteSuccessorNode = function (uiNode) {
  var nodeToPaste = ITA.informationTree.basket.kids()[0]
  if (nodeToPaste) {
    (uiNode || this.selectedNode).pasteSuccessor(nodeToPaste)
  } else {
    alert("There is no node in the basket to paste.")
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

Controller.prototype.resetMenus = function () {
  this.hideAllMenus()
  this.clearAllDropDowns()
}

Controller.prototype.hideAllMenus = function () {
  $(this.buttonPanel).hide()
  $(this.visitedNodeList).hide()
  $(this.nodePathList).hide()
}

// Remove highlighting from all dropdown menu item elements.
Controller.prototype.clearAllDropDowns = function () {
  $(this.appHeader).children().removeClass('highlight-drop-down')
}


Controller.prototype.toggleExpandCollapseAll = function (uiNode) {
  (uiNode || this.selectedNode).toggleExpandCollapse(true)
}


// TODO: the basket functionality needs to record information about the former parentage
// and sibling relationships somewhere so that a trashed node can be restored later.
Controller.prototype.restoreLastDeletedNode = function() {
  alert("Untrash has not yet been implemented")
}

Controller.prototype.setAttributes = function (uiNode, attributes) {
  (uiNode || this.selectedNode).setAttributes(attributes)
}


// This does nothing. Use it for testing.
Controller.prototype.nop = function() {
  console.log("Controller.nop")
}

// Called by uiNode when a drag operation starts to let the controller
// know about it. In this case, we clear the previous drop target
// because a new drop is possibly about to occur.
Controller.prototype.onDragStart = function (uiNode) {
  this.dropTarget        = null     // The node that uiNode will be dropped on top of, if any.
  this.predecessorTarget = null     // The node that will be immediately above uiNode's release position, if any, when no drop target.
  this.selectNode(uiNode)
  $(uiNode).zIndex(10)                // Put draggable on top of everything. // TODO: find a place for this hardcoded constant.
}


/*
Called by a UiNode to advise the controller that a drag event just ended.
Determine whether uiNode was dropped on top of another node,
or let go beneath a node, and do either an insertChild() or an insertSuccessor() accordingly.
Handle smooth animation of uiNode to its new position in the tree.

 Inputs:
   event:        is the drag event object.
   ignoreHelper: Not sure what this is, since we don't have helper mode enabled for dragging.
   uiNode:       is the original node that was clicked on by the user to initiate the drag event.
 */
Controller.prototype.onDragStop = function (event, ignoreHelper, uiNode) {
  var request         = null
  var $uiNode         = $(uiNode)
  var previousOffset  = $uiNode.offset()  // Remember where the node was before we changed its position in the tree.

  // There's a drop target: add originalNode as a child
  if (this.dropTarget) {
    request = this.insertChild(this.dropTarget, uiNode)

  // There's a node above us: add originalNode as a successor
  } else if (this.predecessorTarget) {
    request = this.insertSuccessor(this.predecessorTarget, uiNode)
  }

  // Handle animation to new position
  if (request) {
    request.then(function() {
      $uiNode.offset(previousOffset)
      $uiNode.animate({left:'0px', top:'0px'})
      $uiNode.zIndex(0) // Restore node to normal z-index. We had set it high for the drag operation so it would be on top.
    })
  } else {
    $uiNode.zIndex(0) // Restore node to normal z-index. We had set it high for the drag operation so it would be on top.
  }
}

/*
 Record the drop target so that it can be added as a parent when the drag event finishes.
 */
Controller.prototype.onDrop = function(uiNode) {
  this.dropTarget = uiNode
}


/*
 Figure out whether uiNode should revert back to its original position, returning true if so.
 In the process, figure out whether uiNode is beneath another node, and, if so, set this.predecessorTarget
 accordingly.
 If there is a dropTarget or a predecessorTarget, then uiNode should not revert to its original position.

 PROGRAMMER NOTES
 MATH: helperUiNode.position().top is in coordinates relative to the top of the information tree, which
 is 0,0 in this coordinate system. Nodes near the bottom of the information tree will
 have a high top value. We convert this value to "scrolled" information-tree coords
 before passing it to findLowestNodeAbove(). The information-tree is a div that sits beneath the top
 menu bar, and it is scrollable. Any node in the tree can be asked its tree coords via $(node).position().
 These values will be expressed in pixels relative to the scroll position of the tree. The upper left corner
 of the tree that is visible in the view is always 0,0 in this coord system.
 Nodes off-screen above this will have negative top values in "scrolled" tree coords.

 We use $(tree).scrollTop() to get the current values of the scroll offsets so we can do the conversion.
 */
Controller.prototype.handleRevert = function(uiNode) {
  var tree = ITA.informationTree
  return !this.dropTarget && !(this.predecessorTarget = tree.findLowestNodeAbove($(uiNode).offset().top))
}

/*
Establish command key shortcuts for the ui.
 */
Controller.prototype.keyPressedOnNode = function (uiNode, event) {
  // control-carriage return -- create new successor node of uiNode
  if (event.charCode == 13 && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault()
    this.createSuccessor(uiNode)

  // shift-return -- create new child node of uiNode
  } else if (event.charCode == 13 && !event.altKey && event.shiftKey && !event.ctrlKey) {
    event.preventDefault()
    this.createChild(uiNode)

    // control-c -- copy uiNode
  } else if (event.charCode == 'c'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault()
    this.copyToBasket(uiNode)

  // control-f -- follow link
  } else if (event.charCode == 'f'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault()
    this.followLink(uiNode)

  // control-v -- paste the top of the basket onto uiNode.
  } else if (event.charCode == 'v'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault()
    this.pasteNode(uiNode)

    // control-shift-v -- paste the top of the basket as a successor of uiNode.
  } else if (event.charCode == 'v'.charCodeAt(0) && !event.altKey && event.shiftKey && event.ctrlKey) {
    event.preventDefault()
    this.pasteSuccessorNode(uiNode)

    // control-x -- cut uiNode
  } else if (event.charCode == 'x'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault()
    this.putInBasket(uiNode)

    // control-s -- save uiNode
  }  else if (event.charCode == 's'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault()
    this.saveNode(uiNode)

    // control-a -- autosize uiNode
  }  else if (event.charCode == 'a'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault()
    this.autoSizeNode(uiNode)
  }
}

/*
Establish command key shortcuts for the top node.
 */
Controller.prototype.keyPressedOnTopNode = function (uiTopNode, event) {
  // carriage return -- create new successor node is disallowed for top node.
  if (event.charCode == 13 && !event.altKey && !event.shiftKey && !event.ctrlKey) {
    event.preventDefault()

    // control-c -- copy this node is disallowed for top node.
  } else if (event.charCode == 'c'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault()

    // control-x -- cut this node is disallowed for top node
  } else if (event.charCode == 'x'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault()

    // Do standard node handling.
  } else {
    this.keyPressedOnNode(uiTopNode, event);
  }
}

Controller.prototype.keyPressedOnTrashNode = function (uiTrashNode, event) {
  return this.keyPressedOnTopNode(uiTrashNode, event)
}
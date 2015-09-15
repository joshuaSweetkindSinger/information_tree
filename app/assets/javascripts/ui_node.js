//= require view_node/view_node
/*
  The Ui Node implements ui functionality on top of the UiNode class.
  It handles mouse clicks, keyboard presses, etc., and communicates those user events
  to the controller.
*/

// =========================================================================
//                   Ui Node
// =========================================================================
var UiNode = defCustomTag('ui-node', ViewNode);

ViewNode.uiClass = UiNode; // The class to instantiate.


// ======= Construction and Initialization
/*
 Create a UiNode object from a Node object. The UiNode object is a wrapper for the Node
 object and endows the Node object with UI-related functionality. The Node object is not a dom element,
 but the UiNode object is.

 NOTE: afterCreate() is only called via programmatic creation of new objects, as opposed to static creation.
 We put all the logic in our afterCreate() method, because we know we are not doing static creation, and we
 need to pass args, which can only be passed via afterCreate().
 */
UiNode.prototype.afterCreate = function(node, state) {
  ViewNode.prototype.afterCreate.call(this, node, state)
  this.bindEventHandlers()
  $(this).addClass('ui-node')
}

/*
Note: the jquery on() method will bind the same handler multiple times if you're not careful.
Adding event bindings in a derived class can be dicey when you have class inheritance and each
level calls the super, because that can result in multiple bindings to the same browser event.
If your derived class is adding a new event binding, there's no problem,
but if instead you want to override an event handler that has already been bound by the parent class,
then instead just override the specific event handler method, e.g., override onClick()
to instantiate your on click handler. You don't need to bind it, because the parent class here is already binding it.
 */
UiNode.prototype.bindEventHandlers = function () {
  $(this).draggable({
    revert: this.handleRevert.bind(this),
    // helper: "clone",
    start: this.onDragStart,
    stop: this.onDragStop
  })

  // Attach handlers to content element
  var $content = $(this._header.contentArea)
  $content.on("click", this.onContentClick.bind(this))
  $content.on("blur", this.onBlur.bind(this))
  $content.on("contextmenu", this.onContextMenu.bind(this))
  $content.on("keypress", this.onKeypress.bind(this))
  $content.droppable({
    tolerance: "pointer",
    hoverClass: "drop-hover",
    greedy: true,
    drop: this.onDrop.bind(this)
  })

  // Attach handlers to expand-collapse element
  var $expandCollapse = $(this._header.expandCollapseButton)
  $expandCollapse.on('click', this.onExpandCollapseClick.bind(this))

  // For proper dragging logic.
  $(this).on('mousemove', this.onMouseMove.bind(this))
  $(this).on('mousedown', this.onMouseDown.bind(this))
}


UiNode.prototype.onExpandCollapseClick = function() {
  App.controller.toggleNodeExpandCollapse(this);
}

/*
 Block the jquery draggable property from initiating a drag event
 on mouse move events when noDrag is true. See onMouseDown below.
*/
UiNode.prototype.onMouseMove = function(event) {
  if (App.controller.noDrag) {
    // TODO: Commented out because this short-circuits resizing content areas in firefox.
    // TODO: Fix this.
    // event.preventDefault()
    // event.stopPropagation()
  }
}

/*
Unless the mousedown occurs in a DragArea element, set a flag that blocks a drag event from being initiated
by the jquery draggable property while the mouse moves around.
 */
UiNode.prototype.onMouseDown = function(event) {
  if (!$(event.target).is('drag-area')) {
    App.controller.noDrag = true; // TODO: this is ugly! We're setting a flag on another object. But we need a "global" state var here.
    // TODO: Commented out because this short-circuits resizing content areas in firefox.
    // TODO: Fix this.
    // event.preventDefault()
    // event.stopPropagation()
  } else {
    App.controller.noDrag = false; // TODO: equally ugly, but at least the noDrag logic is local ot this method.
  }
}

/*
 Advise the controller that this UiNode object just started being dragged.
 */
UiNode.prototype.onDragStart = function() {
  App.controller.onDragStart(this)
}


/*
Advise the controller that this UiNode object just finished being dragged. If it was dragged on
top of another object, the controller will handle the drop event.
 */
UiNode.prototype.onDragStop = function(event, helperUiNode) {
  App.controller.onDragStop(event, helperUiNode, this)
}


/*
 Advise the controller that a node was just dropped on top of <this> node.

 Note: It seems that a single mouse-release can generate two drop events, one of them a phantom.
 Not sure why. But the "true" drop event is recognizable because the associated node will have an id.
 We only forward to the controller for the true drop event.
 */
UiNode.prototype.onDrop = function(event, ui) {
  if (this.id) {
    App.controller.onDrop(this);
  }
}

/*
 Advise the controller that this UiNode object just finished being dragged and should handle
 revert logic for the dragged node.
 */
UiNode.prototype.handleRevert = function() {
  return App.controller.handleRevert(this)
}


UiNode.prototype.onContentClick = function (event) {
  App.controller.clickedLeftOnNode(this)
}


/*
 This somewhat awkward intermediary is necessary because, at create time, we don't have
 a pointer to the Node parent from the UiNodeContent object. So we create a delegator
 that will work at click-time.
 */
UiNode.prototype.onContextMenu = function(event) {
  App.controller.clickedRightOnNode(this, event)
}


/*
Enable all the buttons on the button panel that should be enabled when a generic UiNode is right-clicked-on.
In this case, all buttons should be enable. Certain subclasses of UiNode may not permit all the options available on the button panel
that pops up in response to a right click.
 */
UiNode.prototype.enableButtonPanelOptions = function (buttonPanel) {
  buttonPanel.enableAppropriateButtons(this)
  $(buttonPanel.emptyBasketButton).hide()
}


UiNode.prototype.onKeypress = function(event) {
  App.controller.keyPressedOnNode(this, event)
}




// This event-handler is bound to the object's blur event.
// It causes the content of the node to change on the server.
UiNode.prototype.onBlur = function(e) {
  App.controller.blurNode(this);
}

// Put browser focus on this node, for data entry. Pass along the focus to our contentArea sub-element.
UiNode.prototype.focus = function () {
  this._header.contentArea.focus()
}

UiNode.prototype.isContentDirty = function () {
  return this.content != this.node.content
}

UiNode.prototype.isSizeDirty = function () {
  return (this.width != this.node.width) || (this.height != this.node.height)
}

UiNode.prototype.isDirty = function () {
  return this.isContentDirty() || this.isSizeDirty()
}
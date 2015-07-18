
// =========================================================================
//                   Node Content
// =========================================================================
// NodeContentView holds the text that represents the content of the node.

var NodeContentView = defCustomTag('node-content', HTMLTextAreaElement, 'textarea')

NodeContentView.prototype.afterCreate = function(nodeView, options) {
  var $this = $(this);
  var self  = this;

  this.nodeView    = nodeView;
  this.id          = 'NodeContentView-' + nodeView.node.id;
  this.placeholder = "New Node";



  $this.addClass('node-content'); // Since we are extending a text-area element, we can't put css on the node-content tag--there isn't one in the dom!
  $this.on("click", this.onClick);
  $this.on("blur", this.onBlur)
  $this.on("contextmenu", this.onContextMenu);
  $this.on("keypress", this.onKeypress)

  this.title = options.tooltip;

  $this.droppable({
    tolerance: "pointer",
    hoverClass: "drop-hover",
    greedy: true,
    drop: this.handleDrop
  })
}


// Handle a left click in the text area.
NodeContentView.prototype.onClick = function (event) {
  return App.controller.clickLeftOnNode(this.nodeView);
}


/*
 This somewhat awkward intermediary is necessary because, at create time, we don't have
 a pointer to the Node parent from the NodeContentView object. So we create a delegator
 that will work at click-time.
 */
NodeContentView.prototype.onContextMenu = function(event) {
  return App.controller.clickRightOnNode(this.nodeView, event);
}

NodeContentView.prototype.onKeypress = function(event) {
  // carriage return -- create new successor node
  if (event.charCode == 13 && !event.altKey && !event.shiftKey && !event.ctrlKey) {
    event.preventDefault();
    App.controller.addSuccessor(this.nodeView);

    // shift-return -- create new child node
  } else if (event.charCode == 13 && !event.altKey && event.shiftKey && !event.ctrlKey) {
    event.preventDefault();
    App.controller.addChild(this.nodeView);

    // control-c -- copy this node
  } else if (event.charCode == 'c'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    App.controller.copyNode(this.nodeView);

    // control-v -- paste the copied node onto this node.
  } else if (event.charCode == 'v'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    App.controller.pasteNode(this.nodeView);

    // control-x -- cut this node
  } else if (event.charCode == 'x'.charCodeAt(0) && !event.altKey && !event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    App.controller.cutNode(this.nodeView);
  }
}


/*
 Handle a drop event. We were just dropped on top of a node.
 Record the drop target so that we can be added as a child when the drag event finishes.
 Note: It seems that a single mouse-release can generate two drop events, one of them a phantom.
 Not sure why. But the "true" drop event is recognizable because the associated drop node will have an id.
 We only record this node as the drop target, not the phantom. I believe the phantom has to do with
 the cloned helper node that is created as part of the drag.
 */
NodeContentView.prototype.handleDrop = function(event, ui) {
  var nodeView = this.nodeView;
  if (nodeView.id) {
    App.treeView.dropTarget = nodeView;
  }
};


// This event-handler is bound to the object's blur event.
// It causes the content of the node to change on the server.
NodeContentView.prototype.onBlur = function(e) {
  var autosize = this.nodeView.calcAutoSize();
  App.controller.setAttributes(this.nodeView,
    {content: this.nodeView.content,
      width: autosize.width,
      height: autosize.height})
}

// This event-handler is bound to the object's blur event.
// It causes the width and height of the node's text area to change on the server.
NodeContentView.prototype.onResize = function(e) {
}

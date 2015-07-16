//= require node_view.js

/*
This file defines client-side functionality for the information-tree sub-app.
TODO: Obsolete documentation. Update this.
This defines dom tag classes for the node hierarchy of an information tree.
The structure is as follows:
TextTree: a single node of this type is put in a static html file, which initiates the dynamic
          creation of a text tree when the html file is loaded into the browser, via its custom tag constructor.
          A text tree is made up of TextNodes.
TextNode: has two child elements, called NodeHeader and NodeChildren.
NodeHeader: represents content for the node.
NodeChildren: represents a container for sub-nodes. Its only children are of type TextNode.

Text Nodes are stored in the db in the nodes table. When the client-side expands a node, it asks the db for its children,
which get sent as json, and then the client builds the nodes on the browser.

New nodes are created by sending an async request to the server to create the new node.

Some terminology, and discussion of the relationship between server and client:
The server is the place where nodes get created. The client requests that the server create a node
by sending it a nodeSpec to the proper endpoint. The server responds with a nodeRep. Both of these
are identical-looking json objects. The name nodeSpec indicates a request to create an object with
certain properties. The name nodeRep indicates that a representation of the now-existing object
has been sent back to the client.

TOPLEVEL OBJECTS:
Controller: Controls all UI interactions.
TreeView:   Client-side representation of the information tree.
Server:     Mediate all api calls to the server.
*/

/*
 TODO: Make New Node get deleted on blur if nothing changed.
 TODO: Think about nodespec, noderep, and node. All of these should be nodespecs and anything
 that takes a nodespec should take the others. Does addNode always add a new node, or sometimes an existing one?
 If the latter, how did the new node get created? What are the right primitives? Does it always go through the server first?
 Is there a way to do some things on client side first? What are right primitives for creation and movement of nodes?
 Primitives: server side: Node.new() creates a new node on server side. Node.insert(node, insertionPoint) inserts a node at the right place.
 server side: Node.getTop(), Node.getTrash(), Node.get(:id) return specific nodesReps.
 server side: addNodeOnServer(nodeSpec, insertionPoint) creates a new node on server at insertion point.
 server side: getNodeFromServer(ref) returns a nodeRep for the referenced node.
 client side: addNodeOnClient(nodeRep) attaches a rep from the server to the client side tree.
 Server side node primitives: create, read, update, delete, trash, move, children.
 Client side node primitives: create, update, trash, move, expand.
 TODO: fix rank calculation. Do we need predecessor and successor in db?
 TODO: Make the trash node visible in hierarchy: Top has children named User and System. But Trash and Basket under System.
 TODO: There's an ambiguity between node.content and node.header.content. The former returns the text of node.header.content.
 The latter returns the content dom object, which is a textarea element.
 TODO: look for refs to stopPropagation() and preventDefault() and make sure they're necessary.
 TODO: all the various UI dom components should simply defer to the ui controller for their functionality.
 They should bind event handlers, but then pass the event to the ui controller for actual processing.
 They are like sockets, with functionality to be plugged in by the ui controller.
 TODO: hitting return on an empty node should delete the node.
 TODO: Consider having hit return on a node put you in edit mode for the node, equal to clicking on it.
 This presupposes we're not always in edit mode.
 TODO: implement cut/copy/paste, and put cut nodes in "the basket".
 TODO: Refactor for layers:
 Top layer is the UI. It orchestrates all user-initiated action. It handles all events. It introduces
 ui concepts like cut/paste, the clipboard, the trash, etc. Any data-entry or modification of the
 tree must be mediated by the ui. The ui consists of a controller and dom elements. The dom elements
 represent the tree and ui-related decorations such as pop up menus. The tree and its nodes
 are represented by dom elements, but these dom elements are wrappers on underlying client-side
 object that are *not* dom elements. These client-side objects represent the fundamental objects
 that are the nodes of the tree, their relationships to each other, and the tree object itself.
 These objects, in turn, are backed by server-side cognates.

 The UI gets its job done as follows. User actions are intercepted by event handlers on dom
 elements. These dom elements are formally part of the ui layer. Each dom element will most
 likely handle the event by passing it to the ui controller, which will coordinate all actions,
 but some events might be handled directly by the dom element. The majority of
 user-actions entail modification of a node. This achieved by sending a message to the associated
 client-side node object, which is NOT part of the UI. This is the middle layer, which is the client
 side model. These client-side objects, in turn, get their job done by making api calls to the server
 to effect changes on the server side. They also handle responses from the server to update their
 state, which they forward to their ui representations, so that the ui can render the state
 change appropriately.
 UI <--> client-side model <--> server-side api

 Main Components:
 Controller: handles all client-side UI interactions
 Server: client side object that mediates interactions with the server.
 Tree: represents the entire tree.
 Node: Represents a single node in the tree.

 TODO: Hide classes and functions within a package.
 */

//(function () { // Wrap everything in an anonymous function call to hide some globals.

// ========================================================================
//                   Application Object
// =========================================================================
window.InformationTreeApp = {}; //

var App = window.InformationTreeApp; // nickname for our namespace
var IT  = App; // TODO: Get rid of references to this. This is deprecated.

App.initPage = function() {
  this.server     = new Server;
  this.treeView   = $('information-tree')[0].init();
  this.tree       = this.treeView; // TODO: deprecated

  this.controller = new Controller;
  this.ui         = this.controller; // TODO: deprecated
}


// ========================================================================
//                   Server API
// ========================================================================
var Server = function () {

}

Server.prototype.top = function(callback) {
  return new JsonRequest("GET", this.topNodePath(), callback)
}


Server.prototype.topNodePath = function() {
  return '/nodes/top.json'
}



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

IT.Ui = Controller; // TODO: deprecated


// ========================================================================
//                   Tree View
// ========================================================================
var TreeView = defCustomTag('information-tree', HTMLElement);
IT.Tree = TreeView; // TODO: deprecated

TreeView.prototype.init = function() {
  var self = this;
  $(this).click(this.onClick); // TODO: These belong on an information-tree-view object.

  this.tree = (new Tree).then(function() {
    self.top = self.tree.top; // TODO: fix this. tree.top should not be a dom element.
    $(self).append(self.top);
    // $(document).tooltip(); // TODO: is there a way for this not to be here?
  })

  return this;
};

TreeView.prototype.onClick = function (event) {
  App.controller.hideButtonPanel();
}

TreeView.prototype.then = function (callback) {
  this.tree.then(callback);
  return this;
}


/*
Return an array of all the nodes in the text tree that are currently visible.
Return the nodes in order of descending y-value. This means that every visible node will
be preceded by its older siblings, all their visible descendants, and by its parent.
*/
IT.Tree.prototype.visibleNodes = function() {
  return this.top.visibleNodes([]);
}


IT.Tree.prototype.findLowestNodeAbove = function(y) {
  var nodes = this.visibleNodes().reverse();
  for(var i = 0; i < nodes.length; i++) {
    var node = nodes[i];

    // Ignore any "phantom" node that does not have an id.
    if (!node.id) {
      continue;
    }

    if ($(node).position().top < y) {
      return node;
    }
  };
}


/*
If it currently exists in the dom, return the text node with the specified id.
*/
IT.Tree.prototype.find = function(id) {
  if (!id) return;

  var $node = $('#' + id);
  if ($node.length > 0) {
    return $node[0];
  }
}

/*
If it currently exists in the dom, return the text node whose id is nodeRep.id,
after updating it with possibly new values from nodeRep;
otherwise, assume that nodeRep is a complete representation for a new node: instantiate it and
return the new node. Note that the newly created note is unglommed; that is, it is
unattached to the text tree.
*/
IT.Tree.prototype._findOrCreate = function(nodeRep) {
  var foundNode = this.find(nodeRep.id);
  return foundNode ? foundNode.update(nodeRep) : new NodeView(nodeRep);
}


/*
If it currently exists in the dom, merely update the text node whose id is nodeRep.id
with the other information contained in nodeRep, and return it.

If it does not yet exist in the dom, assume that nodeRep is a complete spec for a new node:
instantiate it and return the new node after glomming it to the text tree in its proper position.
*/
IT.Tree.prototype._addNodeOnClient = function(nodeRep) {
  return this._findOrCreate(nodeRep)._glom();
}


IT.Tree.prototype._addNodesOnClient = function(fetchedNodeReps) {
  return fetchedNodeReps.map(this._addNodeOnClient.bind(this));
}

// ========================================================================
//                   Tree
// ========================================================================
var Tree = function() {
  var self = this;

  // Tell the server to get the top node. When we get it, create a client-side NodeView and assign it to
  // member variable 'top'. In the meantime, store the request object on _topRequest.
  this._delayed = App.server.top().then(function(top) {self.top = new NodeView(top)});
}

/*
Execute callback when the tree instance is fully initialized.
 */
Tree.prototype.then = function (callback) {
  this._delayed.then(callback);
  return this;
}



// =========================================================================
//                   Node Header
// =========================================================================
/*
NodeHeader is a container for the node's content and buttons.
*/
var NodeHeader = defCustomTag('node-header', HTMLElement)
NodeHeader.prototype.afterCreate = function(nodeView, options) {
  var $this = $(this)
  this.nodeView = nodeView

  this.expandCollapseButton = new ExpandCollapse(nodeView)
  $this.append(this.expandCollapseButton)

  this.content = new NodeContent(nodeView, options);
  $this.append(this.content)
}

NodeHeader.prototype.set_id = function(id) {
  this.id = 'NodeHeader-' + id;
  this.content.set_id(id);
}


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
//                   Node Content
// =========================================================================
// NodeContent holds the text that represents the content of the node.

var NodeContent = defCustomTag('node-content', HTMLTextAreaElement, 'textarea')

NodeContent.prototype.afterCreate = function(nodeView, options) {
  var $this = $(this);
  var self  = this;

  this.nodeView = nodeView;

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
NodeContent.prototype.onClick = function (event) {
  return IT.ui.clickLeftOnNode(this.nodeView);
}


/*
This somewhat awkward intermediary is necessary because, at create time, we don't have
a pointer to the Node parent from the NodeContent object. So we create a delegator
that will work at click-time.
*/
NodeContent.prototype.onContextMenu = function(event) {
  return IT.ui.clickRightOnNode(this.nodeView, event);
}

NodeContent.prototype.onKeypress = function(event) {
  // carriage return -- create new successor node
  if (event.charCode == 13 && !event.altKey && !event.shiftKey && !event.ctrlKey) {
    event.preventDefault();
    IT.ui.addSuccessor(this.nodeView);

  // shift-return -- create new child node
  } else if (event.charCode == 13 && !event.altKey && event.shiftKey && !event.ctrlKey) {
    event.preventDefault();
    IT.ui.addChild(this.nodeView);

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
NodeContent.prototype.handleDrop = function(event, ui) {
  var nodeView = this.nodeView;
  if (nodeView.id) {
    IT.tree.dropTarget = nodeView;
  }
};


NodeContent.prototype.set_id = function(id) {
  this.id = 'NodeContent-' + id;
}


// This event-handler is bound to the object's blur event.
// It causes the content of the node to change on the server.
NodeContent.prototype.onBlur = function(e) {
  var autosize = this.nodeView.calcAutoSize();
  IT.ui.setAttributes(this.nodeView,
    {content: this.nodeView.content,
       width: autosize.width,
      height: autosize.height})
}

// This event-handler is bound to the object's blur event.
// It causes the width and height of the node's text area to change on the server.
NodeContent.prototype.onResize = function(e) {
}


// =========================================================================
//                   Node Children
// =========================================================================
// NodeChildren is a container for the node's child nodes.
var NodeChildren = defCustomTag('node-children', HTMLElement)
NodeChildren.prototype.afterCreate = function() {
}

NodeChildren.prototype.set_id = function(id) {
  this.id = 'NodeChildren-' + id;
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
  IT.ui.toggleNodeExpandCollapse(this.nodeView);
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
  IT.ui.nop()
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
  $this.click(function(event) {IT.ui.followLink()})
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
  IT.ui.save()
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
  $(this).click(function(event) {IT.ui.toggleExpandCollapseAll()})
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
  // adding the new node to the NodeView's NodeChildren element.
  $this.click(function() {IT.ui.addChild()})
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
  $this.click(function() {IT.ui.addSuccessor()})
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
  $this.click(function() {IT.ui.addPredecessor()})
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
  $this.click(function(event) {IT.ui.restoreLastDeletedNode()})
}

$(document).ready(function(){
  App.initPage();
})
//})() // We wrapped everything in an anonymous function call to hide some globals.
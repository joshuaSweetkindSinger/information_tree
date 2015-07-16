//= require app
//= require node_view
//= require node_header_view
//= require server
//= require controller
//= require tree_view
//= require tree
//= require buttons
//= require node_content_view
//= require node_children_view

/*
This file defines client-side functionality for the information-tree sub-app.
TODO: Obsolete documentation. Update this.
This defines dom tag classes for the node hierarchy of an information tree.
The structure is as follows:
TextTree: a single node of this type is put in a static html file, which initiates the dynamic
          creation of a text tree when the html file is loaded into the browser, via its custom tag constructor.
          A text tree is made up of TextNodes.
TextNode: has two child elements, called NodeHeaderView and NodeChildren.
NodeHeaderView: represents content for the node.
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
 TODO: consider creating a single View class, with subclasses representing the different view classes.
 TODO: Should the treeView be holding the droppable target? Or should the UI be holding it? Seems like
       if the ui holds the selectedNode, it should also hold the droppable target. And vice versa,
       perhaps the treeView should hold both. 
 */

$(document).ready(function(){
  App.initPage();
})

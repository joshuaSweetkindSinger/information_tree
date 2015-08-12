//= require app

/*
This is the toplevel javascript file for client-side tree manipulation.
NOTE: For the class that implements the toplevel dom object with tag name 'information-tree', see ui_tree.js.

High-level description of architecture:
 Main Components:
 Controller: handles all client-side UI interactions
 Server: client side object that mediates interactions with the server.
 Tree: client-side object only: represents the entire tree.
 UiNode: Ui-aware class, dom element representing a node in the tree.
 Node: non-viewable, non-dom-element, core node functionality and relationships.

 Top layer is the UI. It orchestrates all user-initiated action. It handles all events. It introduces
 ui concepts like cut/paste, the clipboard, the trash, etc. Any data-entry or modification of the
 tree must be mediated by the ui. The ui consists of a controller and UiNode objects,
 the latter of which are dom elements representing the nodes in the tree. These UiNode objects
 are wrappers on underlying Node objects that are *not* dom elements.
 These client-side Node objects represent the fundamental objects
 that are the nodes of the tree, their relationships to each other, and the tree object itself.
 These objects, in turn, are backed by server-side cognates.

 The UI gets its job done as follows. User actions are intercepted by event handlers on UiNode dom
 elements. These dom elements are formally part of the ui layer. Each dom element will handle the event
 by passing it to the ui controller, which will coordinate all actions.
 The majority of user-actions entail modification of a node. This achieved by sending a message to the associated
 client-side node object, which is NOT part of the UI. This is the middle layer, which is the client
 side model. These client-side objects, in turn, get their job done by making api calls to the server
 to effect changes on the server side. They also handle responses from the server to update their
 state, which they forward to their ui representations, so that the ui can render the state
 change appropriately.
 UI <--> client-side model <--> server-side api


The dom elements comprising the information tree are as follows:
information-tree: a single node of this type is put in a static html file, which initiates the dynamic
          creation of a InformationTree object when the html file is loaded into the browser, via its custom tag constructor.
          An information tree is made up of UiNodes.
UiNode: A dynamically instantiated dom-element that represents a node in the information tree.

On the server side, nodes are stored in the db in the nodes table. When the client-side expands a node, it asks the db for its children,
which get sent as json, and then the client builds the nodes on the browser.

New nodes are created by sending an async request to the server to create the new node.

Some terminology, and discussion of the relationship between server and client:
The server is the place where nodes get created and manipulated. The client requests that the server create a node
by sending it a nodeSpec or a nodeRef to the proper endpoint. The server responds with a nodeRep. Both of these
are identical-looking json objects. The name nodeSpec indicates a request to create an object with
certain properties. The name nodeRef indicates a request to manipulate an existing object.
The name nodeRep indicates that a representation of the now-existing object has been sent back to the client.
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
 client side: addNode(nodeRep) attaches a rep from the server to the client side tree.
 Server side node primitives: create, read, update, delete, trash, move, children.
 Client side node primitives: create, update, trash, move, expand.
 TODO: fix rank calculation. Do we need predecessor and successor in db?
 TODO: Make the trash node visible in hierarchy: Top has children named User and System. But Trash and Basket under System.
 TODO: There's an ambiguity between node.content and node._header.content. The former returns the text of node._header.content.
 The latter returns the content dom object, which is a textarea element.
 TODO: look for refs to stopPropagation() and preventDefault() and make sure they're necessary.
 TODO: It isn't clear that all UI dom elements should defer to the controller. the UI will be
 more extensible if we can add new UI elements that enhance UI functionality without having to also alter
 the controller.
 TODO: all the various UI dom components should simply defer to the ui controller for their functionality.
 They should bind event handlers, but then pass the event to the ui controller for actual processing.
 They are like sockets, with functionality to be plugged in by the ui controller.
 TODO: hitting return on an empty node should delete the node.
 TODO: Consider having hit return on a node put you in edit mode for the node, equal to clicking on it.
 This presupposes we're not always in edit mode.
 TODO: implement cut/copy/paste, and put cut nodes in "the basket".



TODO: There are annoying flashes when a node is saved. Probably because of the round-trip to server, and maybe
because of the timing of when they are added to the dom.

TODO: find all nodes with null parents and delete them (except trash and top)
TODO: Feature: Add intra-tree node links, e.g., "see Application-Specific-Passwords", which, when clicked on,
would navigate to the referenced node in the information tree.
TODO: Modify schema so that each node has a has_children boolean. Whenever a node becomes the parent of a child,
that flag is set to true. When the last child is removed, that flag is set to false. This will enable the UI to
only show expand icons for nodes that are expandable.
 */

$(document).ready(function(){
  App.initPage();
})

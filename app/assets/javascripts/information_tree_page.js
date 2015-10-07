//= require app

/*
This is the toplevel javascript file for client-side tree manipulation.
NOTE: For the class that implements the toplevel dom object with tag name 'information-tree', see ui_information_tree.js.

High-level description of architecture:
 Main Components:
 Controller: handles all client-side UI interactions
 Server: client side object that mediates interactions with the server.
 InformationTree: client-side object only: represents the entire tree.
 UiNode: Ui-aware class, dom element representing a node in the tree.
 Node: non-viewable, non-dom-element, core node functionality and relationships.

 Top layer is the UI. It orchestrates all user-initiated action. It handles all events. It introduces
 ui concepts like cut/paste, the basket, etc. Any data-entry or modification of the
 tree must be mediated by the ui. The ui consists of a controller and UiNode objects,
 the latter of which are dom elements representing the nodes in the tree. These UiNode objects
 are wrappers on underlying Node objects that are *not* dom elements.
 These client-side Node objects represent the fundamental objects
 that are the nodes of the tree, their relationships to each other, and the tree object itself.
 These objects, in turn, are backed by server-side cognates.

 The UI gets its job done as follows. User actions are intercepted by event handlers on UiNode dom
 elements. These dom elements are formally part of the ui layer. Each dom element will handle the event
 by passing it to the ui controller, which will coordinate all actions.
 The majority of user-actions entail modification of a node. This is achieved by sending a message to the associated
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
 TODO: look for refs to stopPropagation() and preventDefault() and make sure they're necessary.

 TODO: Consider having hit return on a node put you in edit mode for the node, equal to clicking on it.
 This presupposes we're not always in edit mode.
 TODO: implement cut/copy/paste, and put cut nodes in "the basket".



TODO: There are annoying flashes when a node is saved. Probably because of the round-trip to server, and maybe
because of the timing of when they are added to the dom.

TODO: Feature: Add intra-tree node links, e.g., "see Application-Specific-Passwords", which, when clicked on,
would navigate to the referenced node in the information tree.
TODO: Modify schema so that each node has a has_children boolean. Whenever a node becomes the parent of a child,
that flag is set to true. When the last child is removed, that flag is set to false. This will enable the UI to
only show expand icons for nodes that are expandable.

TODO: Implement a search bar that returns up to 30 matching nodes in a node-marker menu. Then, clicking on a node marker
needs to take the user to visit that node, which requires loading its entire path, since none of the path, except for
Top may actually be on the client side yet. Probably best way to download the path is to return an array of json nodes.
This is a very flexible structure. We just hash each json node into the client side and call it a day. A node becomes
visible on the client side when it has a path to Top. A node without a known parent can go into an "orphans"
system node.


TODO: Clicking on admin should do paging.
TODO: There should be a help nav item that explains the app and pops up help in a new tab.
TODO: Restore make backup to Admin section.
TODO: From admin, "go back to info tree" should select existing tab.
TODO: change basket to "putInBasket". Don't need a separate pointer to a "cut" object. Just use top of putInBasket.
TODO: merge set_attributes with update() in nodes controller.
TODO: None of these Path() methods in server.js is DRY, because the server knows them.
TODO: Add new yield to admin header for page-specific options.
TODO: Client should ask server to give it symbolic constants it needs, like ids of system node types,
      and routing table paths.
TODO: Top Node isn't really a type. It's an attribute that is a function of having no parent. Get rid of this type and refactor.
      Note that Top < Node is also a class. Get rid of the class.
TODO: refactor callbacks that are part of expand/reveal/scrollTo as deferreds using .then(). The PseudoRequest
      you set up is a start, but it should be renamed. We really want a class like Deferred, because these are not
      requests that are going to the server.
TODO: in ui_node.js, uncomment the drag/drop logic that short-circuits drag drop when it shouldn't occur,
but in a way that allows text area resizing to occur.
TODO: Add option to draw a sub-tree in a new tab.
TODO: The to_html operation should render the tree using html-5 tags
Status: Need to be able to get multiple node refs back from the server in one call. What would
the syntax look like? /nodes/118 generalizes to /nodes/:top,143,1253,223...456.json, or possibly
/nodes.json?ids=:top,143,2514...
TODO: Top node should be renamed to "root". Instead of getTopNode we should have getRoot, etc.
TODO: Since we expanded the notion of a tree to include multiple root nodes, the notion of a
      single identified system node with a type of ROOT or TOP is probably not needed. A root node
      is just a normal node that does not have parents. Get rid of this system type.

TODO: I'm still not happy with the relationship between ViewNode and Node. For example, the parent of a
view node is not explicitly represented. You have to go to the node, get it's id, then find it in the
dom using jquery. But, if viewnodes had explicit parents and siblings, then insert operations would
be harder, because you'd have to duplicate everything on the client side. Still not convinced I have
the best architecture for this.
TODO: Redo the sub-tree functionality so that the root node of the subtree comes up in the same tab,
not a new tab, but record the full hierarchy in the node path dropdown, and allow user to climb back
up the hierarchy.

TODO: It's wasteful for expandedViewNodes() to build an array of all expanded nodes. Currently it's only
used to determine the insertion point. You can walk the tree without building an array.

TODO: examine the field isLocalRoot on uiNode. It's not DRY, because we already have a RootNode class. Try
to refactor so that we just have one or the other. Also the basket is in this.localRootNodes, but its
isLocalRoot slot is false. Clean this up!
STATUS: Figure out how to show any node that is requested, so long as it has been downloaded from the server.
At any time, there is a sub-tree showing, and the node may or may not be in that subtree. If it is, then it's easy:
we just scroll to it. If it's not, then we need to figure out how to augment the subtree by the minimal amount to show the node.
This means finding the least common ancestor of the node and one of the local roots of the subtree. Then we need to
connect this LCA to both the subtree root and to the requested node.

TODO: Consider adding multiple parentage to nodes
TODO: Remove duplicates from the visited history
TODO: Consider moving the server off to just be an api, on another port. Then write multiple apps that
use the api. One could be a basic web app that just serves web pages. Another could be a front-end client
that is more whizzy.
TODO: Paste should just take top of the trash and not worry about a selected for paste slot.
Status: In the middle of a branch destroy_empty, which handles empty nodes not by cutting them but by deleting them.
This requires that you create a full path in the api for deletion of a node from a parent on the client side, then
on to the back end, same logic.
 */

/* NOTE: We're using the $(window).load callback here rather than the more common
   $(document).ready callback, because we have found that ITA.initPage can't find
   the init() method on the information tree on most instances of chrome when you use
   $(document).ready, because it hasn't been defined yet.
     Not sure what the problem is, but using the $(window).load callback,
   which occurs last in the load cycle, seems to solve the problem.
 */
$(window).load(function(){
  // Create the top level information tree app object. It's a singleton.
  // Although it seems like we're not keeping a pointer to the object,
  // the init method actually establishes its own global pointer, window.ITA, to the singleton
  // object that it produces.
  new InformationTreeApp
})

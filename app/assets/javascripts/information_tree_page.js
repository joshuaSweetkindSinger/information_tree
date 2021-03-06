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
TODO: The to_html operation should render the tree using html-5 tags
Status: Need to be able to get multiple node refs back from the server in one call. What would
the syntax look like? /nodes/118 generalizes to /nodes/:top,143,1253,223...456.json, or possibly
/nodes.json?ids=:top,143,2514...

TODO: I'm still not happy with the relationship between ViewNode and Node. For example, the parent of a
view node is not explicitly represented. You have to go to the node, get it's id, then find it in the
dom using jquery. But, if viewnodes had explicit parents and siblings, then insert operations would
be harder, because you'd have to duplicate everything on the client side. Still not convinced I have
the best architecture for this.

TODO: It's wasteful for expandedViewNodes() to build an array of all expanded nodes. Currently it's only
used to determine the insertion point. You can walk the tree without building an array.


TODO: Consider adding multiple parentage to nodes
TODO: Consider moving the server off to just be an api, on another port. Then write multiple apps that
use the api. One could be a basic web app that just serves web pages. Another could be a front-end client
that is more whizzy.

TODO: Seriously consider getting rid of Node layer on client side.
TODO: Separate view_node.js into several files.
TODO: None of the server Path() methods is DRY, because the server knows them.
We should generate them automatically from the routes.rb file, or some such.
TODO: Remove duplicates from the visited history
 TODO: Since we expanded the notion of a tree to include multiple root nodes, the notion of a
 single identified system node with a type of ROOT or TOP is probably not needed. A root node
 is just a normal node that does not have parents. Get rid of this system type.
Status: added select node on expand.
TODO: Keep track of visited node and information-tree status between sessions.
TODO: Allow infinite scrolling to the right.
TODO: Give ability to search for nodes
TODO: Think about how to specify a URL for a given node an then get back its path, but also
      without blowing away any existing client cached nodes.
TODO: ctrl-left-arrow should move a node "to the left", which means: make it the successor of its parent.
TODO: ctrl-right-arrow should move a node "to the right", which means: make it the last child of its predecessor.
TODO: ctrl-shift-v pastes the top of the basket as the successor of the currently selected node.
TODO: Try using + and - keys for zoom. Center on the current y position, but choose the proper level of the
      hierarchy to show based on the zoom level. When the zoom level is 0, you should just the top node. At level 1,
      you show all level 1 nodes and all nodes above them. At level k, you show all nodes at level k or lower. There
      are subtler ways to do this. You could have two parameters: instead of just k, you could have j and k. Show the current
      node to level j, but everything else to level k.
TODO: Allow for different kinds of media in a node. The only allowable kind now is a text node. But what about
      allowing nodes that are tables, or key/value pairs, or images, etc. In all other respects, a node
      stays the same, and has the same functionality as a text node, including the ability to have children.
      But its display contents are different depending on its type.
TODO: When you visit a node, if it has been visited previously, put it on top of the visit stack (and
      remove it from its former place in the visit stack). Currently, already-visited nodes keep their
      place on the visit stack, rather than moving to the top.
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

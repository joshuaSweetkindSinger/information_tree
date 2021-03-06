/*
  A node is the client-side representation of an information-tree node.
  It does *not* contain ui-related functionality and decorations.
  For that, see NodeView.

  Also, although a node object contains relationships fields: parent, predecessor, successor,
  these can go stale on the client side when the node is moved via an insert operation. The client-side UI
  does not bother to update these when nodes are moved around in the hierarchy. The only true way to assess
  the siblings of a node on the client side are to look at the dom relationships themselves, as indicated by
  the node's ViewNode counterpart, accessed via the _view() method.
*/

/*
Node constructor: create a client-side node object from a node representation (a hash object).
 */
var Node = function (nodeRep) {
  this._children       = [];
  this.childrenFetched = false // True when we have received child node information from the server. See fetch_and_expand()

  this.update(nodeRep)
}


// Default json spec for a new node
Node.defaultSpec = {
  content:'',
  type_id:1,
  width:500,
  height:100
}

/*
Create a new server-side node with attributes as specified in nodeSpec, or
with default attributes if nodeSpec is not supplied, then effect the same changes
on the client side, creating a new client-side Node object. Valid attributes to set are
'content', 'type_id', 'width', 'height'. The new node, on both server and client,
will have no parents (it is in "limbo" until it is added to the tree).

This method returns a request object for asynchronous continuation to further process the client-side
Node object.
 */
Node.createNode = function (nodeSpec) {
  return ITA.server.createNode(nodeSpec || Node.defaultSpec)
    .success(function(nodeRep) {return new Node(nodeRep)})
}

/*
 Update ourselves with new information from the server-side rep <nodeRep>.
 In principle, this update could involve any of the fields of a node object.
 As of this writing, we are really only interested in updating hierarchy links.

 TODO: in future, make this clear and efficient. Probably want to take the node returned
 by the server and just hook it up to a prototype and call it a day, and also find any existing
 dom objects associated with the node and hook those up too. This may require some cleanup though
 for the dom objects.
 */
Node.prototype.update = function (nodeRep) {
  this.error          = nodeRep.error
  this.id             = nodeRep.id;
  this.type_id        = nodeRep.type_id
  this.parent_id      = nodeRep.parent_id;
  this.predecessor_id = nodeRep.predecessor_id;
  this.successor_id   = nodeRep.successor_id;
  this.rank           = nodeRep.rank;
  this.content        = nodeRep.content
  this.width          = nodeRep.width
  this.height         = nodeRep.height
  this.createdAt      = nodeRep.created_at;
  this.updatedAt      = nodeRep.updated_at;

  if (this.error) this.reportError();

  return this;
}

/*
Allow a ui-object to attach itself as our view, or return the attached view
if no args are given.
 */
Node.prototype.view = function (obj) {
  return arguments.length == 0 ? this._view : this._view = obj;
}


/*
 Ask the server to insert a child or sibling node, specified by the node object nodeToInsert,
 to the reference node represented by <this> node. After the server
 responds with a success code and node rep, effect the same changes on the client-side.


 nodeToInsert must contain an id, and the server will use the existing node
 with that id for the add operation and move it to the new location (child or sibling)
 relative to <this>. None of the attributes of the client-side node are used by the server.

 mode determines how node is moved relative to <this>, as either a child, successor, or predecessor
 of the node represented by <this>. mode should be a string,
 that names one of ITA.server's add methods: 'insertChild', 'insertSuccessor', 'insertPredecessor'
 */
Node.prototype.insert = function (nodeToInsert, mode) {
  var self = this;
  return ITA.server[mode](this.id, nodeToInsert.id)
    .success(function(nodeRep) {
      return nodeToInsert.update(nodeRep)
    })
    .failure(function(error) {
      console.log("Got an error attempting to add a node on server. reference node = ", self, "; node-to-insert = ", nodeToInsert, "; mode = ", mode, "; error = ", error);
    })
}

Node.prototype.insertChild = function (nodeToInsert) {
  return this.insert(nodeToInsert, 'insertChild')
}

Node.prototype.insertSuccessor = function (nodeToInsert) {
  return this.insert(nodeToInsert, 'insertSuccessor')
}

Node.prototype.insertPredecessor = function (nodeToInsert) {
  return this.insert(nodeToInsert, 'insertPredecessor')
}


Node.prototype.reportError = function() {
  console.log("Got an error attempting to make changes to node on server: ", this)
}


Node.prototype.putInBasket = function() {
  return ITA.server.putInBasket(this.id)
}

/*
If children have not yet been fetched, fetch the children and return an array of nodereps for
the children. If the children have been fetched, return an empty array.

Thus, the return value is always an array of the children that have been fetched.
 */
Node.prototype.fetchChildren = function () {
  var self = this;

  return this.childrenFetched ? new PseudoRequest([])
    : ITA.server.getNodeChildren(this.id)
    .success(function(childReps) {
      self.childrenFetched = true;
      return self._children = childReps.map(function (n) {return new Node(n)})
    })
}

// Set attributes for this node. The attributes to change, and their values,
// are in options, which is a hash. The hash is sent to the server, to change the values
// on the server first, and then the server replies with a json that represents the changed node.
// Note: This does not allow you to set attributes affecting topology, e.g.: parent_id, rank.
// Attributes which can be set are: content, width, height.
Node.prototype.setAttributes = function(nodeUpdate) {
  var self = this;
  return ITA.server.setNodeAttributes(this.id, nodeUpdate)
    .success(function (nodeRep) {
      return self.update(nodeRep);
    })
}

// Destroy this node on the server side, so long as it is empty of content and children; otherwise,
// raise an error.
Node.prototype.destroyEmpty = function () {
  return ITA.server.destroyEmpty(this.id)
}

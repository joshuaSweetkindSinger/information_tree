/*
  A node is the client-side representation of an information-tree node.
  It does *not* contain ui-related functionality and decorations.
  For that, see NodeView.
*/


var Node = function (nodeRep) {
  this._children       = [];
  this.childrenFetched = false // True when we have received child node information from the server. See fetch_and_expand()

  this.update(nodeRep)
}


// Default json spec for a new node
Node.defaultSpec = {
  content:'',
  width:500,
  height:100
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
 Ask the server to add a child or sibling node, specified by <nodeSpec>,
 to the node represented by <this> node. After the server
 responds with a success code, effect the same changes on the client-side.

 If nodeSpec is null, create a new default node.

 If nodeSpec is non-null and fully spec'd,
 but without an id, create a new node as specified.

 If nodeSpec is non-null, but just contains an id, use the existing node
 with that id for the add operation and move it to the new location (child or sibling)
 relative to <this>.

 mode determines how node is moved relative to <this>, as either a child, successor, or predecessor
 of the node represented by <this>. mode should be a string,
 that names one of App.server's add methods: 'addChild', 'addSuccessor', 'addPredecessor'

 callback is a function that gets executed after the node has been returned from the server, and only if the
 request was successful.

 NOTES: nodeSpec is a hash that specifies a new node, or names an existing one, but it is *not* a node object.
 nodeRep is a hash that represents a node on the server side. It contains complete info, but it is not
 a client-side node object.
 node is a client-side node object.
 */
Node.prototype.add = function (nodeSpec, mode) {
  if (!nodeSpec) nodeSpec = Node.defaultSpec;

  var self = this;
  return App.server[mode](this.id, nodeSpec)
    .success(function(nodeRep) {
      return new Node(nodeRep)
    })
    .failure(function(error) {
      console.log("Got an error attempting to add a node on server. parent = ", self, "; spec = ", nodeSpec, "; mode = ", mode, "; error = ", error);
    })
}

Node.prototype.addChild = function (nodeSpec) {
  return this.add(nodeSpec, 'addChild')
}

Node.prototype.addSuccessor = function (nodeSpec) {
  return this.add(nodeSpec, 'addSuccessor')
}

Node.prototype.addPredecessor = function (nodeSpec) {
  return this.add(nodeSpec, 'addPredecessor')
}


Node.prototype.reportError = function() {
  console.log("Got an error attempting to make changes to node on server: ", this)
}


Node.prototype.trash = function() {
  return App.server.trash(this.id)
}

// TODO: Refactor so this just always return its children.
// As it now stands, it will return an array of those children that were fetched.
// Fetch children if necessary and "return" through async protocol an array of the children fetched.
Node.prototype.fetchChildren = function () {
  var self = this;

  return this.childrenFetched ? new PseudoRequest([])
    : App.server.getNodeChildren(this.id)
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
  return App.server.setNodeAttributes(this.id, nodeUpdate)
    .success(function (nodeRep) {
      return self.update(nodeRep);
    })
}

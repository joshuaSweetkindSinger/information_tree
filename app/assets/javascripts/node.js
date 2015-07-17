/*
  A node is the client-side representation of an information-tree node.
  It does *not* contain ui-related functionality and decorations.
  For that, see NodeView.
*/


var Node = function (nodeRep) {
  this.children        = [];
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

  return this;
}

/*
Allow a ui-object to attach itself as our view, or return the attached view
if no args are given.
 */
Node.prototype.view = function (obj) {
  return arguments.length == 0 ? this.view : this.view = obj;
}

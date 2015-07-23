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

/*
 The three methods below create a new node on the server, or insert an existing one at a new location.
 Attach it to the text node tree at a position relative to the baseNode
 as indicated by the method name.

 Inputs:
 baseId:   The id of an existing node that determines the point in the tree relative to which node will be added.
 nodeSpec: if creating a new node, this should be an object that specs out the desired new node.
           If adding an existing node, then this should just be an object with an id whose
           value is the id of the existing node.
 */

Server.prototype.addChild = function(baseId, nodeSpec) {
  return new JsonRequest("POST", this.addChildPath(baseId), {node: nodeSpec});
};

Server.prototype.addChildPath = function(id) {
  return '/nodes/' + id + '/add_child.json'
}

Server.prototype.addSuccessor = function(baseId, nodeSpec) {
  return new JsonRequest("POST", this.addSuccessorPath(baseId), {node: nodeSpec});
};

Server.prototype.addSuccessorPath = function(id) {
  return '/nodes/' + id + '/add_successor.json'
}

Server.prototype.addPredecessorPath = function(baseId, nodeSpec) {
  return new JsonRequest("POST", this.addPredecessorPath(baseId), {node: nodeSpec});
};

Server.prototype.addPredecessorPath = function(id) {
  return '/nodes/' + id + '/add_predecessor.json'
}

Server.prototype.trash = function (id) {
  return new Request("DELETE", this.trashPath(id))
}

Server.prototype.trashPath = function(id) {
  return '/nodes/' + id + '/trash.json'
}

/*
 Get the child nodes of the node with id, in json format
*/
Server.prototype.getNodeChildren = function(id) {
  return new JsonRequest("GET", this.nodeChildrenPath(id))
}

Server.prototype.nodeChildrenPath = function(id) {
  return '/nodes/' + id + '/children.json'
}


Server.prototype.setNodeAttributes = function (id, options) {
  return new JsonRequest("PUT", this.setAttributesPath(id), {node: options})
}


Server.prototype.setAttributesPath = function(id) {
  return '/nodes/' + id + '/set_attributes.json'
}

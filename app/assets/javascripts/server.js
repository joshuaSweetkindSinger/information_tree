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
Create a new node on the server with attributes specified in nodeSpec,
or with default attributes if nodeSpec is not supplied.

Returns a JsonRequest object for asynchronous continuation to handle the
returned node representation from the server.
 */
Server.prototype.createNode = function(nodeSpec) {
  return new JsonRequest("POST", this.createNodePath(), nodeSpec ? {node: nodeSpec} : {});
};

Server.prototype.createNodePath = function() {
  return '/nodes.json'
}

/*
 The three methods below insert an existing node on the server at a new location.
 Attach it to the text node tree at a position relative to the referenceNode
 as indicated by the method name.

 Inputs:
 referenceNode: The existing node that determines the point in the tree relative to which nodeToInsert will be added.
 nodeToInsert: This should just be a node object with an id whose value is the id of the existing node to insert.
               All other attributes of the node will be ignored.
 */

Server.prototype.insertChild = function(referenceNode, nodeToInsert) {
  return new JsonRequest("PUT", this.addChildPath(referenceNode), {node: {id: nodeToInsert.id}});
};

Server.prototype.addChildPath = function(referenceNode) {
  return '/nodes/' + referenceNode.id + '/insert_child.json'
}

Server.prototype.insertSuccessor = function(referenceNode, nodeToInsert) {
  return new JsonRequest("PUT", this.addSuccessorPath(referenceNode), {node: {id: nodeToInsert.id}});
};

Server.prototype.addSuccessorPath = function(referenceNode) {
  return '/nodes/' + referenceNode.id + '/insert_successor.json'
}

Server.prototype.addPredecessorPath = function(referenceNode, nodeToInsert) {
  return new JsonRequest("PUT", this.addPredecessorPath(referenceNode), {node: {id: nodeToInsert.id}});
};

Server.prototype.addPredecessorPath = function(referenceNode) {
  return '/nodes/' + referenceNode.id + '/insert_predecessor.json'
}

Server.prototype.trash = function (node) {
  return new Request("DELETE", this.trashPath(node))
}

Server.prototype.trashPath = function(node) {
  return '/nodes/' + node.id + '/trash.json'
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

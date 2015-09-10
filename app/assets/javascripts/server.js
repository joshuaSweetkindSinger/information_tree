// ========================================================================
//                   Server API
// ========================================================================
var Server = function () {

}

Server.prototype.getTop = function() {
  return new JsonRequest("GET", this.topNodePath())
}


Server.prototype.topNodePath = function() {
  return '/nodes/top.json'
}

Server.prototype.getTrash = function() {
  return new JsonRequest("GET", this.trashNodePath())
}


Server.prototype.trashNodePath = function() {
  return '/nodes/trash.json'
}


/*
Create a new node on the server with attributes specified in nodeSpec,
or with default attributes if nodeSpec is not supplied.

Returns a JsonRequest object for asynchronous continuation to handle the
returned node representation from the server.

Valid attributes to set for a node are :content, :type_id, :width, :height.
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

Server.prototype.insertChild = function(referenceNodeId, nodeToInsertId) {
  return new JsonRequest("PUT", this.insertChildPath(referenceNodeId), {node: {id: nodeToInsertId}});
};

Server.prototype.insertChildPath = function(referenceNodeId) {
  return '/nodes/' + referenceNodeId + '/insert_child.json'
}

Server.prototype.insertSuccessor = function(referenceNodeId, nodeToInsertId) {
  return new JsonRequest("PUT", this.insertSuccessorPath(referenceNodeId), {node: {id: nodeToInsertId}});
};

Server.prototype.insertSuccessorPath = function(referenceNodeId) {
  return '/nodes/' + referenceNodeId + '/insert_successor.json'
}

Server.prototype.insertPredecessor = function(referenceNodeId, nodeToInsertId) {
  return new JsonRequest("PUT", this.insertPredecessorPath(referenceNodeId), {node: {id: nodeToInsertId}});
}

Server.prototype.insertPredecessorPath = function(referenceNodeId) {
  return '/nodes/' + referenceNodeId + '/insert_predecessor.json'
}

Server.prototype.trash = function (nodeId) {
  return new Request("DELETE", this.trashPath(nodeId))
}

Server.prototype.trashPath = function(nodeId) {
  return '/nodes/' + nodeId + '/trash.json'
}

Server.prototype.emptyTrash = function () {
  return new Request("DELETE", this.emptyTrashPath())
}

Server.prototype.emptyTrashPath = function() {
  return '/nodes/trash.json'
}
/*
 Get the child nodes of the node with id, in json format
*/
Server.prototype.getNodeChildren = function(nodeId) {
  return new JsonRequest("GET", this.nodeChildrenPath(nodeId))
}

Server.prototype.nodeChildrenPath = function(nodeId) {
  return '/nodes/' + nodeId + '/children.json'
}


Server.prototype.setNodeAttributes = function (nodeId, options) {
  return new JsonRequest("PUT", this.setAttributesPath(nodeId), {node: options})
}


Server.prototype.setAttributesPath = function(nodeId) {
  return '/nodes/' + nodeId + '/set_attributes.json'
}

// TODO: None of these Path() methods is DRY, because the server knows them.
// We should generate them automatically from the routes.rb file, or some such.
Server.prototype.renderRecursivelyAsHtmlPath = function (nodeId) {
  return '/nodes/' + nodeId + '/recursive.html'
}

Server.prototype.renderRecursivelyAsJsonPath = function (nodeId) {
  return '/nodes/' + nodeId + '/recursive.json'
}
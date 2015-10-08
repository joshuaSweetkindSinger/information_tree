// ========================================================================
//                   Server API
// ========================================================================
var Server = function () {

}

/*
Return an array of the top nodes of the information tree. This is all nodes that have no parent.
It includes the system nodes, such as the basket.
 */
Server.prototype.getRoots = function () {
  return new JsonRequest("GET", this.rootsPath())
    .errorMsg("Could not get roots from server.")

}


Server.prototype.rootsPath = function () {
  return '/nodes/roots'
}

/*
Return the system node known as the "basket"
 */
Server.prototype.getBasket = function () {
  return new JsonRequest("GET", this.basketPath())
    .errorMsg("Could not get basket from server.")
}

/*
Return the node with the specified nodeId.
 */
Server.prototype.getNode = function (nodeId) {
  return new JsonRequest("GET", this.nodePath(nodeId))
    .errorMsg("Could not get node from server with id " + nodeId)
}

Server.prototype.nodePath = function (nodeId) {
  return '/nodes/' + nodeId
}

Server.prototype.nodesPath = function () {
  return '/nodes'
}



  /*
  Return an array of the specified nodes. Include the basket node in the array
  if specified.

  The method below is commented out because currently the UI is not using it.
   */
/*
Server.prototype.getNodes = function (nodeIds, getBasket) {
  return new JsonRequest("GET", this.nodesPath(nodeIds, getBasket))
}

 Server.prototype.nodesPath = function (nodeIds, getBasket) {
 if (!nodeIds) return '/nodes'

 // Build nodeIds string
  var nodeIdsStr = ""
  var sep = ""
  nodeIds.forEach(function(nodeId){
    nodeIdsStr += sep + 'ids[]=' + nodeId
    sep = '&'
  })

  // Build basket string
  var basketStr = getBasket ? 'true' : ""
  return '/nodes.json?' + nodeIdsStr + '&basket=' + basketStr
}
*/

/*
Get the child nodes of the node with id, in json format
*/
Server.prototype.getNodeChildren = function (nodeId) {
  return new JsonRequest("GET", this.nodeChildrenPath(nodeId))
    .errorMsg("Could not get children of node " + nodeId + " from server.")
}

Server.prototype.nodeChildrenPath = function (nodeId) {
  return this.nodePath(nodeId) + '/children'
}


/*
Create a new node on the server with attributes specified in nodeSpec,
or with default attributes if nodeSpec is not supplied.

Returns a JsonRequest object for asynchronous continuation to handle the
returned node representation from the server.

Valid attributes to set for a node are :content, :type_id, :width, :height.
 */
Server.prototype.createNode = function (nodeSpec) {
  return new JsonRequest("POST", this.nodesPath(), nodeSpec ? {node: nodeSpec} : {})
    .errorMsg("Could not create node on server with spec: " + nodeSpec)
};


/*
 The three methods below insert an existing node on the server at a new location.
 Attach it to the text node tree at a position relative to the referenceNode
 as indicated by the method name.

 Inputs:
 referenceNode: The existing node that determines the point in the tree relative to which nodeToInsert will be added.
 nodeToInsert: This should just be a node object with an id whose value is the id of the existing node to insert.
               All other attributes of the node will be ignored.
 */

Server.prototype.insertChild = function (referenceNodeId, nodeToInsertId) {
  return new JsonRequest("PUT", this.insertChildPath(referenceNodeId), {node: {id: nodeToInsertId}})
    .errorMsg("Could not insert child " + nodeToInsertId + " into parent node " + referenceNodeId)
};

Server.prototype.insertChildPath = function (referenceNodeId) {
  return this.nodePath(referenceNodeId) + '/insert_child'
}

Server.prototype.insertSuccessor = function (referenceNodeId, nodeToInsertId) {
  return new JsonRequest("PUT", this.insertSuccessorPath(referenceNodeId), {node: {id: nodeToInsertId}})
    .errorMsg("Could not insert successor " + nodeToInsertId + " after predecessor node " + referenceNodeId)
};

Server.prototype.insertSuccessorPath = function (referenceNodeId) {
  return this.nodePath(referenceNodeId) + '/insert_successor'
}

Server.prototype.insertPredecessor = function (referenceNodeId, nodeToInsertId) {
  return new JsonRequest("PUT", this.insertPredecessorPath(referenceNodeId), {node: {id: nodeToInsertId}})
    .errorMsg("Could not insert predecessor " + nodeToInsertId + " before successor node " + referenceNodeId)
}

Server.prototype.insertPredecessorPath = function (referenceNodeId) {
  return this.nodePath(referenceNodeId) + '/insert_predecessor'
}

Server.prototype.putInBasket = function (nodeId) {
  return new Request("PUT", this.nodePath(nodeId) + '/cut')
    .errorMsg("Could not put " + nodeId + " in the basket.")
}

Server.prototype.emptyBasket = function () {
  return new Request("DELETE", this.basketPath())
    .errorMsg("Could not empty the basket.")
}

Server.prototype.basketPath = function () {
  '/nodes/basket'
}


Server.prototype.setNodeAttributes = function (nodeId, options) {
  return new JsonRequest("PUT", this.setAttributesPath(nodeId), {node: options})
    .errorMsg("Could not set attributes for " + nodeId)
}

Server.prototype.setAttributesPath = function (nodeId) {
  return this.nodePath(nodeId) + '/set_attributes'
}

Server.prototype.renderRecursivelyPath = function (nodeId) {
  return this.nodePath(nodeId) + '/recursive'
}

Server.prototype.destroyEmpty = function (nodeId) {
  return new Request("DELETE", this.nodePath(nodeId) + '/destroy_empty.json')
    .errorMsg("Error encountered while attempting to destroy empty node on server. Id = " + nodeId)
}
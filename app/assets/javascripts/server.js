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
 Create a new node on the server, or insert an existing one at a new location.
 Attach it to the text node tree at a position relative to the baseNode
 as indicated by mode, which must be one of 'add_child', 'add_successor', 'add_predeessor'.
 Then execute the function next() when done.
 Inputs:
 baseId: The id of an existing node that determines the point in the tree relative to which node will be added.
 node: if creating a new node, this should be an object that specs out the desired new node.
 If adding an existing node, then this should just be an object with an id whose
 value is the id of the existing node.
 mode: one of 'add_child', 'add_successor', 'add_predecessor'.
 next: This is a continuation function that says what to do after the node is created or inserted.
 */
Server.prototype.addNode = function(baseId, nodeSpec, mode) {
  return new JsonRequest("POST", this.addNodePath(baseId), {node: nodeSpec, mode:mode});
};


Server.prototype.addNodePath = function(id) {
  return '/nodes/' + id + '/add_node.json'
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

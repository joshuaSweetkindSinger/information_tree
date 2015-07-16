
// ========================================================================
//                   Tree
// ========================================================================
var Tree = function() {
  var self = this;

  // Tell the server to get the top node. When we get it, create a client-side NodeView and assign it to
  // member variable 'top'. In the meantime, store the request object on _topRequest.
  this._delayed = App.server.top().then(function(top) {self.top = new Node(top)});
}

/*
 Execute callback when the tree instance is fully initialized.
 */
Tree.prototype.then = function (callback) {
  this._delayed.then(callback);
  return this;
}

//= require server
//= require ui_information_tree
//= require drop_down_menus/visited_node_list
//= require controller
//= require node_cache

// ========================================================================
//                   Application Object
// =========================================================================
/*
This is the toplevel class. It is instantiated as a singleton and it contains pointers to all the
main architectural components of the app.
 */
var InformationTreeApp = function() {
  if (window.ITA) {
    throw "Singleton InformationTreeApp already exists"
  }
  
  window.ITA            = this // sub-object initializations below require this pointer to be set.
  this.csrfToken        = $('[name="csrf-token"]').attr('content');
  this.server           = new Server
  this.nodeCache        = new NodeCache
  this.informationTree  = new InformationTree
  this.controller       = new Controller
}




InformationTreeApp.prototype.getTreeTop = function () {
  var top = parseInt(document.location.pathname.split('/').pop()) // Get last token from loaded url and convert to integer.
  return top === NaN ? nil : top
}


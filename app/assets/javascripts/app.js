//= require server
//= require ui_information_tree
//= require ui_visited_node_list
//= require controller

// ========================================================================
//                   Application Object
// =========================================================================
window.InformationTreeApp = {}; //

var App = window.InformationTreeApp; // nickname for our namespace

App.initPage = function() {
  this.server     = new Server;
  this.informationTree   = $('information-tree')[0].init();
  this.visitedNodeList = $('visited-node-list')[0].init();
  this.controller = new Controller;
}

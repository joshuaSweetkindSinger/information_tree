//= require server
//= require ui_information_tree
//= require visited_node_list
//= require controller

// ========================================================================
//                   Application Object
// =========================================================================
window.InformationTreeApp = {}; //

var App = window.InformationTreeApp; // nickname for our namespace

App.initPage = function() {
  this.server            = new Server
  this.informationTree   = $('information-tree')[0].init()
  this.controller        = new Controller
  this.csrfToken         = $('[name="csrf-token"]').attr('content');
}

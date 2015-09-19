//= require server
//= require ui_information_tree
//= require drop_down_menus/visited_node_list
//= require controller

// ========================================================================
//                   Application Object
// =========================================================================
window.InformationTreeApp = {}; //

var App = window.InformationTreeApp; // nickname for our namespace

App.initPage = function() {
  var treeTop            = this.getTreeTop()
  this.server            = new Server
  this.informationTree   = new InformationTree(treeTop)
  this.controller        = new Controller
  this.csrfToken         = $('[name="csrf-token"]').attr('content');

  $('#app-header').after(this.informationTree)
}


App.getTreeTop = function () {
  var top = parseInt(document.location.pathname.split('/').pop()) // Get last token from loaded url and convert to integer.
  return top === NaN ? nil : top
}
//= require server
//= require ui_information_tree
//= require controller

// ========================================================================
//                   Application Object
// =========================================================================
window.InformationTreeApp = {}; //

var App = window.InformationTreeApp; // nickname for our namespace

App.initPage = function() {
  this.server     = new Server;
  this.uiTree   = $('information-tree')[0].init();
  this.controller = new Controller;
}

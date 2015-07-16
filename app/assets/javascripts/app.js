// ========================================================================
//                   Application Object
// =========================================================================
window.InformationTreeApp = {}; //

var App = window.InformationTreeApp; // nickname for our namespace

App.initPage = function() {
  this.server     = new Server;
  this.treeView   = $('information-tree')[0].init();
  this.controller = new Controller;
}

// ========================================================================
//                   Application Object
// =========================================================================
window.InformationTreeApp = {}; //

var App = window.InformationTreeApp; // nickname for our namespace
var IT  = App; // TODO: Get rid of references to this. This is deprecated.

App.initPage = function() {
  this.server     = new Server;
  this.treeView   = $('information-tree')[0].init();
  this.controller = new Controller;
}

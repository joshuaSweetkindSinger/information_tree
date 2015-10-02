/*
This file defines base classes associated with dropdown menus. It supplies generic functionality for
pop-up menus associated with dropdown menu items on a header bar.
*/

// ========================================================================
//                   DropDownPopUp
// ========================================================================
/*
This class is the actual menu that pops up once a dropdown element in the app header has been clicked on.
 */
var DropDownPopUp = defCustomTag('drop-down-pop-up', HTMLElement)


DropDownPopUp.prototype.afterCreate = function() {
  $(this).addClass('drop-down-pop-up')
  $(this).zIndex(10) // Make sure we're on top.
  return this
};


/*
 Move pop up to float next to element--presumably a dropDown button on the header bar that was just
 clicked on to invoke its pulldown menu to pop up.
 */
DropDownPopUp.prototype.popUp = function(element) {
  var $this = $(this)
  $this.show(); // I'm not sure why, but showing this before doing new offset avoids a bug. See documentation above.
  $('body').append(this) // Attach to body, not info tree, because we want it to remain fixed even if tree is scrolled.

  var $element = $(element)
  var rect     = $element.parent()[0].getBoundingClientRect()
  var offset   = $element.offset()
  offset.top   = rect.top + rect.height

  $this.offset(offset)
}

// ========================================================================
//                   DropDownMenu
// ========================================================================
/*
This is the element the goes in the app header. When clicked on, it pops up a DropDownPopUp menu.
 */
var DropDownMenu = defCustomTag('drop-down-menu', HTMLElement)


/*
 The init() method is called by the controller to initialize the statically placed drop-down
 after pageload.

 PROGRAMMER'S NOTE: init() is not part of the html5 class-extension scaffolding. It is
 an additional, ad-hoc method just for this class.
 */
DropDownMenu.prototype.init = function(menu) {
  this.menu = menu
  $(this).on('click', this.onClick.bind(this))
  return this
};


// Reveal the internal menu associated with this dropdown menu marker.
DropDownMenu.prototype.popUp = function() {
  $(this).addClass('highlight-drop-down')
  this.menu.popUp(this)
}

DropDownMenu.prototype.onClick = function (event) {
  ITA.controller.resetMenus()
  this.popUp()
}
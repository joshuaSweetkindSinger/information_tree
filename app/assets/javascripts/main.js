/*
Functions supporting the expand/collapse interactivity of the outline formed
by <ul> and <li> items.
 */

// Toplevel click function, assigned to <li> items in the ready() function at bottom.
function toggleExpandCollapse(e) {
  e = $(this)
  if (e.hasClass("collapsed")) {
    expandLiOneLevel(e)
  } else {
    collapseLi(e)
  }
}


// Mark the specified <li> jquery element as having been expanded.
function markLiExpanded(li) {
  li.removeClass('collapsed')
  if (listItemHasSubcontent(li)) {
    li.addClass('expanded')
  }
}


// Mark the specified <li> jquery element as having been collapsed.
function markLiCollapsed(li) {
  li.removeClass('expanded')
  if (listItemHasSubcontent(li)) {
    li.addClass('collapsed')
  }
}

// This is a UI-level function. When a collapsed <li> is clicked on,
// this function is called to animate its expansion, revealing the
// content underneath it.
function expandLiOneLevel (e) {
  markLiExpanded(e)
  listItemSubcontent(e).show('slow')
}


// Returns true if this li has sub-content.
function listItemHasSubcontent (li) {
  return listItemSubcontent(li).length != 0
}


// Return a jquery result set of all the subcontent of the specified list item.
function listItemSubcontent (li) {
  return li.nextUntil('li')
}


/*
Recursively collapse all the content beneath e.

If e is a <ul> item, then collapsing it simply means
collapsing all its children. This is a recursive pass-through that
does nothing but propagate the collapse down to the children.

If e is an <li>, then collapsing it means
collapsing and hiding all of its subcontent, and
marking the list-item as collapsed if it has non-empty content.

Note that the list-item itself
is not hidden: it remains visible as a stand-in for
the collapsed content beneath it.
*/
function collapseTree (e) {
  // Not an <li> -- just propagate the collapse to the next level.
  if (!e.is('li')) {
    e.children().each(function (index, c) {
      collapseTree($(c))
    })
    return
  }

  var content = listItemSubcontent(e)

  if (content.length != 0) {
    content.hide()
    content.each(function (index, c) {
      collapseTree($(c))
    })
    markLiCollapsed(e)
  }
}


/*
This is a ui-level function. When an expanded <li> item is clicked on,
it slowly hides all the content beneath it.
It also makes sure that all the content beneath the item is recursively collapsed.
 */
function collapseLi (li) {
  listItemSubcontent(li).hide('slow', function () {collapseTree(li)})
}

// This performs a one-time initialization of the outline tree that
// puts everything in a collapsed state with only the top-level revealed.
function initializeExpandCollapse () {
  var topLi = $('li').first()
  collapseTree(topLi)
  expandLiOneLevel(topLi)
}

// Initialize the page after the DOM is ready.
$(document).ready(function() {
  console.log("Running document ready function")
  $("li").click(toggleExpandCollapse)
  initializeExpandCollapse()
})
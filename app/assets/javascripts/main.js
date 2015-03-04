


function toggleExpandCollapse(e) {
  e = $(this)
  if (e.hasClass("collapsed")) {
    expandOneLevel(e)
  } else {
    collapseRecursive(e)
  }
}



// Mark the specified <li> jquery element as having been expanded.
function markLiExpanded(li) {
  li.removeClass('collapsed')
  if (listItemHasSubcontent(li)) {
    li.addClass('expanded')
  }
}

/*
Reveal all the jquery items in content, which is a jquery result set.
The reveal is done using show('slow') to make it animate nicely.

Implementation note: if the content contains a <ul>, then all the items one level underneath
the <ul> need to be revealed. We "show" them prematurely, keeping the <ul> itself hidden, so
that the items don't actualy appear. This sets the stage
so that when the <ul> is revealed, all its content underneath will already have been
revealed. Perhaps this helps the animation to go more smoothly--not sure.
 */
function reveal (content) {
  // Expand ul items in content, but don't reveal ul itself yet. This is just prep.
  content.filter('ul').each(function(index, ul) {
    $(ul).children('li').show() // Restrict to <li> items. Don't show sub-<ul> items!
  })

  content.show('slow')
}


function expandOneLevel (e) {
  if (e.is('li')) {
    reveal(listItemSubcontent(e))
    markLiExpanded(e)

  } else if (e.is('ul')) {
    reveal(e)
  }
}


// Returns true if this li has sub-content.
function listItemHasSubcontent (li) {
  return listItemSubcontent(li).length != 0
}
// Returns true if this li has sub-content.
function listItemSubcontent (li) {
  return li.nextUntil('li')
}


/*
Collapse the logical content level represented by e,
and collapse all the sub-content as well.

If e is a <ul> item, then collapsing it simply means
hiding it and collapsing all its children.

If e is a list-item, then collapsing it means
collapsing all of its subcontent and, if its subcontent is non-empty,
marking it as collapsed by attaching the attribute class="collapsed"
(and removing class="expanded"). Note that the list-item itself
is not hidden: it remains visible as a stand-in for
the collapsed content beneath it.
*/
function collapseRecursive (e) {
  if (e.is('ul')) {
    e.children().each(function (index, c) {
      collapseRecursive($(c))
    })
    e.hide()
  } else if (e.is('li') && listItemHasSubcontent(e)) {
    e.addClass('collapsed')
    e.removeClass('expanded')
    listItemSubcontent(e).each(function (index, c) {
      $(c).hide('slow')
      collapseRecursive($(c))
    })
  }
}


function initializeExpandCollapse () {
  var topUl = $('ul').first()
  collapseRecursive(topUl)
  expandOneLevel(topUl)
}


$(document).ready(function() {
  console.log("Running document ready function")
  $("li").click(toggleExpandCollapse)
  initializeExpandCollapse()
})
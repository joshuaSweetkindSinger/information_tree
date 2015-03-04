


function toggleExpandCollapse(e) {
  e = $(this)
  if (e.hasClass("collapsed")) {
    expandOneLevel(e)
  } else {
    collapseRecursive(e)
  }
}



// Expand to one level only, beneath the specified li element.
function expandOneLevel (e) {
  if (e.is('li')) {
    var subcontent = listItemSubcontent(e)

    // Expand ul items in subcontent
    subcontent.filter('ul').each(function(index, ul) {
      $(ul).children('li').show('slow')
    })

    e.removeClass('collapsed')
    if (listItemHasSubcontent(e)) {
      e.addClass('expanded')
    }
    subcontent.show('slow')
  } else if (e.is('ul')) {
    e.children('li').show()
    e.show('slow')
  }
}

function collapseLi (e) {
  var siblings = e.nextUntil('li')

  // Child has internal content. Reflect the collapsed state.
  if (siblings.length != 0) {
    e.addClass('collapsed')
    e.removeClass('expanded')
  }

  siblings.hide('slow') // Hide all siblings
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
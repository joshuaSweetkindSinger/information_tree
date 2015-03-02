


function toggleExpandCollapse(e) {
  e = $(this)
  if (e.hasClass("collapsed")) {
    expandLi(e)
  } else {
    collapseLi(e)
  }
}



// Expand to one level only, beneath the specified li element.
function expandLi (e) {
  var subcontent = listItemSubcontent(e)
  subcontent.show('slow')

  // Expand ul items in subcontent
  subcontent.filter('ul').each(function(index, ul) {
    $(ul).children('li').show('slow')
  })

  e.removeClass('collapsed')
  if (listItemHasSubcontent(e)) {
    e.addClass('expanded')
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


// Collapse the logical content level represented by e,
// and collapse all the sub-content as well.
function collapseRecursive (e) {
  if (e.is('ul')) {
    e.hide()
    e.children().each(function (index, c) {
      collapseRecursive($(c))
    })
  } else if (e.is('li') && listItemHasSubcontent(e)) {
    e.addClass('collapsed')
    e.nextUntil('li').each(function (index, c) {
      collapseRecursive($(c))
    })
  } else {
    e.hide()
  }
}


function initializeExpandCollapse () {
  var topUl = $('ul').first()
  collapseRecursive(topUl)
  topUl.show()
  topUl.children('li').show('slow')
}


$(document).ready(function() {
  console.log("Running document ready function")
  $("li").click(toggleExpandCollapse)
  initializeExpandCollapse()
})
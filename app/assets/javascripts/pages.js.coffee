# NOTE: This file is NOT part of the information-tree app. It is a remnant
# of an early prototype of the app.


# Initialize javascript functionality for the static pages sub-app.
# This sub-app stores information in static .erb files. The client-side
# functionality allows the user to expand/collapse the associated nodes.

#= require /expand_collapse_list_items

#= require expand_collapse_list_items

# Initialize the page after the DOM is ready.
$(document).ready( ->
    $("li").click(handleClick)
    initializeExpandCollapse()
  )
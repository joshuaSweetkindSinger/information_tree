# Initialize client-side functionality for the server-side "nodes" controller sub-app.
# This sub-app gets the entire information tree from the database and downloads it to the client
# in one fell swoop. The user then has expand/collapse functionality for the nodes on the client side.
# NOTE: The Nodes controller plays double duty: it services the nodes sub-app as well as the text-tree
# sub-app.

#= require expand_collapse_list_items

# Initialize the page after the DOM is ready.
$(document).ready( ->
  $("li").click(handleClick)
  initializeExpandCollapse()
)
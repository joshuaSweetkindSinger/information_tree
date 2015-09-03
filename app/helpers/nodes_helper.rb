module NodesHelper
  MAX_CONTENT_SNIPPET_LENGTH = 50  # The maximum length to show of a node's content
                                   # when it is being shown as a snippet.

  # Inputs:
  #    content: a string belonging to a content node.
  # Returns:
  #   a new, possibly clipped string, limited to max_length chars. If the original
  # string has been clipped, then the last three chars of the returned string will be '...'
  def snip_content (content, max_length = MAX_CONTENT_SNIPPET_LENGTH)
    result = content[0, max_length]
    if content.length > max_length
      result[-3,3] = '...'
    end
    result
  end
end

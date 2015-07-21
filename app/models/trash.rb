class Trash < Node
  # Return the trash node.
  def self.trash
    result = where("type_id = #{TRASH_TYPE_ID}").first
    result || _make_trash_node
  end

  # Make the trash node.
  def self._make_trash_node
    result = Trash.new(content:'Trash', rank:0, width:40, height:20)
    result.type_id = TRASH_TYPE_ID
    result.save!
    result
  end

  # =========================================================================
  #                   Instance Methods
  # =========================================================================

  def add_successor
    raise "Cannot add a successor to the trash node--only children"
  end

  def add_predecessor
    raise "Cannot add a predecessor to the trash node--only children"
  end
end
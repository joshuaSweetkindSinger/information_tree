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
  # Override Node's insert method. We don't need to rerank our children as Node does. Otherwise, everything is the same.
  def insert (node, splice_position)
    _insert(node, splice_position)

    node
  end


  def add_successor
    raise "Cannot add a successor to the trash node--only children"
  end

  def add_predecessor
    raise "Cannot add a predecessor to the trash node--only children"
  end


  # Calculate our rank.
  # Algorithm for calculating ranks: a node's rank is one less than it's successor's.
  # If a node has no successor, its rank is 0.
  def calc_child_rank (node)
    node.calc_pushed_child_rank
  end
end
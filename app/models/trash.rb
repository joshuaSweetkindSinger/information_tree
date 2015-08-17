
class Trash < Node
  DAYS_TO_KEEP_TRASHED_NODE = 30 # Trashed nodes will be deleted after this many days

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
  # Override Node's insert method. We don't need to rerank our children as Node does.
  # But we do want to delete very old nodes whenever a new one is added, in order to do basic
  # maintenance on the Trash. Otherwise, everything else is the same.
  def insert (node, splice_position)
    _insert(node, splice_position)

    delete_old_nodes

    node
  end


  # Delete all nodes in the trash that were put there longer than days_to_keep days ago.
  def delete_old_nodes (days_to_keep = DAYS_TO_KEEP_TRASHED_NODE)
    children.where('updated_at < ?', Time.now - days_to_keep.day).each do |node|
      node.destroy
    end
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
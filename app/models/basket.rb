# The Basket is a single system child_node that holds "cut" nodes. A cut child_node
# can later be pasted back into the main tree, or the basket's contents can be deleted,
# which means all the nodes in the basket are deleted.

class Basket < Node
  DAYS_TO_KEEP_NODE = 30 # A child_node in the basket will be deleted after this many days

  # Make the basket child_node.
  def self._make_basket_node
    result = Basket.new(content:'Basket', rank:0, width:40, height:20)
    result.type_id = BASKET_TYPE_ID
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

  # Delete everything in the basket.
  def empty
    delete_old_nodes 0
  end


  # Delete all nodes in the basket that were put there longer than days_to_keep days ago.
  def delete_old_nodes (days_to_keep = DAYS_TO_KEEP_NODE)
    children.where('updated_at < ?', Time.now - days_to_keep.day).each do |node|
      node.destroy_self_and_children!
    end
  end


  def add_successor
    raise "Cannot add a successor to the basket child_node--only children"
  end

  def add_predecessor
    raise "Cannot add a predecessor to the basket child_node--only children"
  end


  # Calculate the rank of a child_node just pushed onto the basket.
  # A child_node's rank is one less than it's successor's.
  # If a child_node has no successor, its rank is 0.
  def calc_child_rank (child_node)
    if child_node.successor
      child_node.successor.rank - 1
    else
      0
    end
  end
end


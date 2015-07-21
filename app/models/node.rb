class Node < ActiveRecord::Base
  # TODO -- put these in the database instead
  BULLET    = 1 # type_id of this value indicates a bullet item.
  PARAGRAPH = 2 # type_id of this value indicates a paragraph item.
  TOP_ID    = -1 # system-designated "parent" id for top node.
  TRASH_ID  = -2 # system-designated "parent" id for trash node.

  attr_accessible :content, :parent_id, :rank, :type_id, :predecessor_id, :successor_id, :width, :height
  belongs_to :parent, class_name: 'Node'
  belongs_to :predecessor, class_name: 'Node'
  belongs_to :successor, class_name: 'Node'
  has_many :children, class_name: 'Node', foreign_key: :parent_id

  after_initialize do |node|
    node.type_id ||= BULLET # By default, new nodes are bullets rather than paragraphs or other types.
  end

  # ===================================== Class Methods
  def self.top
    result = where("parent_id = #{TOP_ID}").first
    result || _make_top_node
  end

  def self._make_top_node
    result = Node.new(content:'Top', rank:0, width:100, height:50)
    result.parent_id = TOP_ID
    result.save!
    result
  end

  # Return the trash node.
  def self.trash
    result = where("parent_id = #{TRASH_ID}").first
    result || _make_trash_node
  end

  # Make the trash node.
  def self._make_trash_node
    result = Node.new(content:'Trash', rank:0, width:100, height:50)
    result.parent_id = TRASH_ID
    result.save!
    result
  end

  # ========================= Tools for debugging / cleaning db
  # Print a quick and dirty report to stdout that shows nodes with inconsistent
  # links or missing rank. Inconsistent links means that the predecessor/successor links
  # are broken, since these are the only links that can be inconsistent at this point
  # in the architecture. Parent/child links can't be broken because we don't have child links,
  # just parent links.
  # TODO: Make this method efficient.
  def self.find_broken_nodes
    result = []
    self.all.each do |node|
      if node.predecessor && node.predecessor.successor != node && !result.include?(node)
        result.push(node);
      end

      if node.successor && node.successor.predecessor != node && !result.include?(node)
        result.push(node);
      end

      if !node.rank && !result.include?(node)
        result.push(node);
      end
    end
    result
  end

  # Move to the trash all nodes that have no parent.
  def self.trash_orphans
    self.where(parent_id: nil).each do |node|
      node.trash
    end
  end


# ======================================

  # Make a backup of the entire information tree.
  def self.back_up
    File.open(self.back_up_pathname, 'w') do |f|
      f << Node.all.to_json
    end
  end

  def self.back_up_pathname
    "backups/information_tree_backup_#{Time.now.strftime("%Y-%m-%d_%H-%M-%S")}"
  end

  # ===================================== Instance Methods

  # Insert ourselves into the node hierarchy at position, which is a SplicePosition instance.
  # NOTE: self is *not* the insertion point; it is the node being inserted.
  #       splice_position is the insertion point.
  #
  # This method fixes all the predecessor and successor links, calculates the rank of node,
  # and causes node to be saved to the db if it was not already in the db, along with mods
  # to the sibling nodes on either side of it. If node was already in the db, its previous
  # relationship links are unhooked.
  #
  # The return value of this method is node.
  def insert (splice_position)
    transaction do
      _unhook!
      _splice!(splice_position)
      self.rank = calc_rank()
      save!
    end

    # TODO: this is overly-agressive and will cause performance problems.
    # To prevent underflow of rank resolution, re-rank children on each splice operation.
    self.parent.rerank_children
    self
  end


  # An internal method. Unhook ourselves from the hierarchy so that we have no parent, successor, or predecessor.
  # Patch the other ends of each of these links as necessary to maintain integrity of the hierarchy.
  def _unhook!
    _repatch_siblings
    siblings_to_save = _untether
    save!                                    # Save self first in order to avoid unique index errors.
    siblings_to_save.each {|node| node.save!}
  end

# Blow away parent and sibling info. Return siblings that were non-nil
# before bashing so that the caller can save them at the proper time
# as part of an insert() operation.
  def _untether
    siblings_to_save = [predecessor, successor].select {|node| node}
    self.parent      = nil
    self.predecessor = nil
    self.successor   = nil
    siblings_to_save
  end

  # Make our predecessor and successor be each other's predecessor and successor,
  # in preparation for unhooking ourselves from the tree.
  # NOTE: We only need to patch the successor if it exists, because the _set_predecessor() method
  # will patch the predecessor for us. If the successor does not exist, then we set the predecessor to nil.
  def _repatch_siblings
    if self.successor
      self.successor._set_predecessor(self.predecessor)
    elsif self.predecessor
      self.predecessor._set_successor(nil)
    end
  end



  # Link ourselves into the position specified by splice_position,
  # updating our links and those of our new siblings.
  def _splice! (splice_position)
    self.parent = splice_position.parent
    _set_predecessor(splice_position.predecessor)
    _set_successor(splice_position.successor)

    # Save in correct order to avoid unique index errors.
    successor.save!   if successor
    predecessor.save! if predecessor
    save!
  end


  # An internal method: Patch up predecessor/successor links with the specified predecessor.
  def _set_predecessor (predecessor)
    self.predecessor      = predecessor
    predecessor.successor = self if predecessor
  end

  # An internal method: Patch up predecessor/successor links with the specified successor.
  def _set_successor (successor)
    self.successor        = successor
    successor.predecessor = self if successor
  end


  def to_s
    "[Node: #{id},  parent:(#{parent_id}), predecessor: (#{predecessor_id}), successor: (#{successor_id}), content: #{content}]"
  end


  # Calculate our rank.
  # Algorithm for calculating ranks: a node's rank is the average of the ranks
  # of its predecessor and successor siblings. If a node has no predecessor, the rank used in place
  # of the predecessor's rank is 0.0. If a node has no successor, the rank used in place
  # of the successor's rank is 1.0.
  def calc_rank
    predecessor_rank = predecessor ? predecessor.rank : 0.0
    successor_rank   = successor   ? successor.rank   : 1.0
    (successor_rank + predecessor_rank) / 2.0
  end


  # Loop through your children and re-assign ranks to each of them.
  # This is a utility method that keeps the ranks from getting exponentially small and marching toward
  # underflow. The re-ranking process just assigns rank k/(n+1) to the k-th child of n children.
  # This keeps the rank increasing, and between 0 and 1 exclusive.
  def rerank_children
    c = children.order(:rank)
    n = c.length
    transaction do
      c.each_with_index do |node, k|
        node.rank = (k + 1) / Float(n + 1) # We use k+1 because the index is 0-based.
        node.save!
      end
    end
  end


  # Add node to the node hierarchy, to be a new child
  # of self. If node is already in the hierarchy, then its existing parent- and sibling-links
  # will be detached and re-hooked-up to fit with its new position.
  # node is added onto the beginning of self's set of children, unless last
  # is true, in which case it is added onto the end.
  def add_child (node, last = false)
    node.insert(SplicePositionChild.new(self, last))
  end


  # Add node to the node hierarchy to be the successor
  # of self. If node is already in the hierarchy, then its existing parent- and sibling-links
  # will be detached and re-hooked-up to fit with its new position.
  def add_successor (node)
    node.insert(SplicePositionPredecessor.new(self))
  end


  # Add node to the node hierarchy to be the predecessor
  # of self. If node is already in the hierarchy, then its existing parent- and sibling-links
  # will be detached and re-hooked-up to fit with its new position.
  def add_predecessor (node)
    node.insert(SplicePositionSuccessor.new(self))
  end


  # Remove self and children from the node hierarchy, patching up predecessor/successor links.
  # This moves the node and its children to the "trash" node. It doesn't really delete them.
  def trash
    Node.trash.add_child(self)
  end


  # Destroy yourself and all your children from the hierarchy, and their children, recursively.
  def destroy_self_and_children!
    children.each do |node|
      node.destroy
    end
    destroy
  end


  def last_child
    children.order('rank desc').first
  end


  def first_child
    children.order('rank asc').first
  end
end

# =============================================================================
#                                   SplicePosition
# =============================================================================
# Instances of this class facilitate the insert operation, which causes a node
# to be inserted into the hierarchy at the position designated by the SplicePosition instance.
# This is a base class, not to be instantiated. See SplicePositionParent, etc., below.
class SplicePosition
  attr_accessor :parent, :successor, :predecessor

  def initialize
    self.parent      = nil
    self.successor   = nil
    self.predecessor = nil
  end

  def to_s
    "[SplicePosition: parent:(#{parent}), predecessor: (#{predecessor}), successor: (#{successor})]"
  end
end

# Designates a splice position in which the node to be inserted
# becomes a child of the node that initializes the splice position object.
# If last is true, then it becomes the last child; otherwise, it becomes the first child.
class SplicePositionChild < SplicePosition
  attr_accessor :last

  def initialize (node, last = false)
    super()
    self.parent      = node
    self.predecessor = node.last_child  if  last
    self.successor   = node.first_child if !last
  end
end

# Designates a splice position in which the node to be inserted
# becomes the predecessor of the node that initializes the splice position object.
class SplicePositionPredecessor < SplicePosition
  def initialize (node)
    super()
    self.parent      = node.parent
    self.predecessor = node
    self.successor   = node.successor
  end
end

# Designates a splice position in which the node to be inserted
# becomes the successor of the node that initializes the splice position object.
class SplicePositionSuccessor < SplicePosition
  def initialize (node)
    super()
    self.parent      = node.parent
    self.predecessor = node.predecessor
    self.successor   = node
  end
end

class Node < ActiveRecord::Base
  # TODO -- put these in the database instead
  BULLET = 1 # type_id of this value indicates a bullet item.
  PARAGRAPH = 2 # type_id of this value indicates a paragraph item.
  TOP_ID = -1 # system-designated "parent" id for top node.
  TRASH_ID = -2 # system-designated "parent" id for trash node.

  attr_accessible :content, :parent_id, :rank, :type_id, :predecessor_id, :successor_id, :width, :height
  belongs_to :parent, class_name: 'Node'
  belongs_to :predecessor, class_name: 'Node'
  belongs_to :successor, class_name: 'Node'
  has_many :children, class_name: 'Node', foreign_key: :parent_id

  after_initialize do |node|
    node.type_id ||= BULLET # By default, new nodes are bullets rather than paragraphs or other types.
  end

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

  # Insert ourselves into the node hierarchy at position, which is a SplicePosition instance.
  #
  # This method fixes all the predecessor and successor links, calculates the rank of node,
  # and causes node to be saved to the db if it was not already in the db, along with mods
  # to the sibling nodes on either side of it. If node was already in the db, its previous
  # relationship links are unhooked.
  #
  # The return value of this method is node.
  def splice (splice_position)
    save_if_new_else_unhook

    parent = splice_position.parent
    set_predecessor(splice_position.predecessor)
    set_successor(splice_position.successor)

    rank = calc_rank()

    splice_position.predecessor.save!
    splice_position.successor.save!
    save!
    self # TODO: Check whether save! also returns self. Maybe this is unnecessary.
  end


  # If node is new, save it so we can get an id for it.
  # If it already exists, unhook it from its existing parent/predecessor/successor links.
  def save_if_new_else_unhook
    if !new_record?
      save!          # Get an id for the new node.
    else
      unhook()       # unhook old relationship links
    end
  end


  # Unhook ourselves from the hierarchy so that we have no parent, successor, or predecessor.
  # Patch the other ends of each of these links as necessary to maintain integrity of the hierarchy.
  def unhook
    self.parent = nil
    _set_predecessor(nil)
    _set_successor(nil)
  end

  # An internal method: Patch up predecessor/successor links with the specified predecessor.
  def _set_predecessor (_predecessor)
    self.predecessor       = _predecessor
    _predecessor.successor = self if _predecessor
  end

  # An internal method: Patch up predecessor/successor links with the specified successor.
  def _set_successor (_successor)
    self.successor        = _successor
    _sucessor.predecessor = self if _successor
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


  # Add node to the node hierarchy, to be a new child
  # of self. It's added onto the beginning of self's set of children, unless last
  # is true, in which case it is added onto the end.
  def add_child (node, last = false)
    node.splice(SplicePositionParent.new(self, last))
  end

  # Add node to the node hierarchy to be the successor
  # of self. If node is already in the hiearchy, then its existing parent- and sibling-links
  # will be detached and re-hooked-up to fit with its new position.
  def add_successor (node)
    node.splice(SplicePositionPredecessor.new(self))
  end

  # Add node to the node hierarchy to be the predecessor
  # of self. If node is already in the hiearchy, then its existing parent- and sibling-links
  # will be detached and re-hooked-up to fit with its new position.
  def add_predecessor (node)
    node.splice(SplicePositionSuccessor.new(self))
  end


  # Remove self and children from the node hierarchy, patching up predecessor/successor links.
  # This moves the node and its children to the "trash" node. It doesn't really delete them.
  def trash
    Node.trash.add_child(self)
  end


  # def trash
  #   predecessor_node = self.predecessor
  #   successor_node   = self.successor
  #   predecessor_node.successor_id = (successor_node   ? successor_node.id   : nil) if predecessor_node
  #   successor_node.predecessor_id = (predecessor_node ? predecessor_node.id : nil) if successor_node
  #
  #   predecessor_node.save! if predecessor_node
  #   successor_node.save! if successor_node
  # end


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
# Instances of this class facilitate the splice operation, which causes a node
# to be inserted into the hierarchy at the position designated by the SplicePosition instance.
# This is a base class, not to be instantiated. See SplicePositionParent, etc., below.
class SplicePosition
  attr_accessor :parent, :successor, :predecessor

  def initialize
    self.parent      = nil
    self.successor   = nil
    self.predecessor = nil
  end


class SplicePositionParent < SplicePosition
  attr_accessor :last

  def initialize (node, last = false)
    super()
    self.parent      = node
    self.predecessor = node.last_child if last
    self.successor   = node.first_chid if !last
  end
end


class SplicePositionPredecessor < SplicePosition
  def initialize (node)
    super()
    self.parent      = node.parent
    self.predecessor = node
    self.successor   = node.successor
  end
end


class SplicePositionSuccessor < SplicePosition
  def initialize (node)
    super()
    self.parent      = node.parent
    self.predecessor = node.predecessor
    self.successor   = node
  end
end

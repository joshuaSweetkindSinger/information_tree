# TODO: who calls calc_rank, which is now a method on the parent, not the inserted node.



class Node < ActiveRecord::Base
  # TODO -- put these in the database instead
  TOP_TYPE_ID       = -1 # system-designated type id for top node.
  TRASH_TYPE_ID     = -2 # system-designated type id for trash node.
  SYSTEM_NODE_TYPES = [TRASH_TYPE_ID, TOP_TYPE_ID]

  BULLET_TYPE_ID    =  1 # type_id of this value indicates a bullet item. The use of multiple types is not implemented yet.

  # Cosmetics for html rendering
  NODE_WIDTH = 500
  NODE_HEIGHT = 100

  # Default node spec for creation of new nodes.
  DEFAULT_SPEC = {content:'',
                  type_id:BULLET_TYPE_ID,
                  width:NODE_WIDTH,
                  height:NODE_HEIGHT}

  attr_accessible :content, :type_id, :width, :height
  belongs_to :parent, class_name: 'Node'
  belongs_to :predecessor, class_name: 'Node'
  belongs_to :successor, class_name: 'Node'
  has_many :children, class_name: 'Node', foreign_key: :parent_id

  after_initialize do |node|
    node.type_id ||= BULLET_TYPE_ID # By default, new nodes are bullets rather than paragraphs or other types.
  end


  # =============================================================================
  # =============================================================================
  #                                   Class Methods
  # =============================================================================
  # =============================================================================


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

  # Move to the trash all nodes that have no parent, except for system nodes like top node and trash node.
  def self.trash_orphans
    self.where(parent_id: nil).each do |node|
      if !node.is_system_node?
        node.cut
      end
    end
  end


# ======================================

  # Make a backup of the entire information tree in json format.
  def self.back_up_to_json
    File.open(self.back_up_pathname + '.json', 'w') do |f|
      f << Node.all.to_json
    end
  end

  def self.back_up_pathname
    "backups/information_tree_backup_#{Time.now.strftime("%Y-%m-%d_%H-%M-%S")}"
  end


  # =============================================================================
  # =============================================================================
  #                                   Instance Methods
  # =============================================================================
  # =============================================================================


  # =============================================================================
  #                                   Render Recursively
  # =============================================================================
  MAX_DEPTH = 3 # For write_as_html_list, restrict expansion to html to this depth.

  # Render self and children recursively as NodeRep objects, but not rendering
  # more than max_depth levels deep.
  # Return the top-level NodeRep that represents the root of the sub-tree that has been
  # rendered. Use converter functions like NodeRepToHtml::convert to convert the sub-tree to
  # different formats.
  #
  def render_recursively (max_depth = nil)
    max_depth ||= MAX_DEPTH  # We don't assign this as a default in the arglist, because we allow the caller to pass nil, meaning: 'please use the default'
    result = NodeRep.new
    result.type_id  = type_id
    result.content  = content
    result.height   = height
    result.width    = width
    result.children = []

    if max_depth > 0 && !children.empty?
      children.order(:rank).each do |child|
        result.children << child.render_recursively(max_depth - 1)
      end
    end

    result
  end


  # =============================================================================
  #                                   Misc
  # =============================================================================
  def is_system_node?
    SYSTEM_NODE_TYPES.include?(type_id)
  end


  def to_s
    "[Node: #{id},  parent:(#{parent_id}), predecessor: (#{predecessor_id}), successor: (#{successor_id}), content: #{content}]"
  end


  def last_child
    children.where('successor_id is null').first
  end


  def first_child
    children.where('predecessor_id is null').first
  end


  # Destroy yourself and all your children from the hierarchy, and their children, recursively.
  def destroy_self_and_children!
    children.each do |node|
      node.destroy
    end
    destroy
  end

  # =============================================================================
  #                                   Insertion Methods
  # =============================================================================


  # Add node to the node hierarchy, to be a new child
  # of self. If node is already in the hierarchy, then its existing parent- and sibling-links
  # will be detached and re-hooked-up to fit with its new position.
  # node is added onto the beginning of self's set of children, unless last
  # is true, in which case it is added onto the end.
  def insert_child (node, last = false)
    insert(node, SplicePositionChild.new(self, last))
  end


  # Add node to the node hierarchy to be the successor
  # of self. If node is already in the hierarchy, then its existing parent- and sibling-links
  # will be detached and re-hooked-up to fit with its new position.
  def insert_successor (node)
    insert(node, SplicePositionPredecessor.new(self))
  end


  # Add node to the node hierarchy to be the predecessor
  # of self. If node is already in the hierarchy, then its existing parent- and sibling-links
  # will be detached and re-hooked-up to fit with its new position.
  def insert_predecessor (node)
    insert(node, SplicePositionSuccessor.new(self))
  end


  # Insert node into the node hierarchy relative to ourselves, as indicated by
  # splice-position, which is a SplicePosition instance.
  #
  # This method fixes all the predecessor and successor links, calculates the rank of node,
  # and causes node to be saved to the db if it was not already in the db, along with mods
  # to the sibling nodes on either side of it. If node was already in the db, its previous
  # relationship links are unhooked.
  #
  # This method also reranks all the children of the node's parent, to prevent underflow.
  # Due to the method we are using to calculate ranks, adding, say 20 children to the top of the list
  # every time could produce underflow.
  #
  # The return value of this method is node.
  def insert (node, splice_position)
    transaction do
      _insert(node, splice_position)
      node.parent.rerank_children
    end

    node
  end


  # See documentation for insert() above.
  def _insert (node, splice_position)
    transaction do
      node._attach(splice_position)
      node.rank = node.parent.calc_child_rank(node)
      node.save!
    end

    node
  end



  # Attach ourselves to the hierarchy at the position indicated by splice_position.
  def _attach(splice_position)
    transaction do
      _unhook!
      _splice!(splice_position)
      save!
    end

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
    if successor
      successor._set_predecessor(predecessor)
    elsif predecessor
      predecessor._set_successor(nil)
    end
  end



  # Link ourselves into the position specified by splice_position,
  # updating our links and those of our new siblings.
  def _splice! (splice_position)
    splice_position.calc_relatives
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


  # Remove self and children from the node hierarchy, patching up predecessor/successor links.
  # This moves the node and its children to the "trash" node. It doesn't really delete them.
  def cut
    Trash.trash.insert_child(self)
  end

  # =============================================================================
  #                                   Rank Calculation
  # =============================================================================
  # Rank is the order of a node among its siblings. Currently, I use real numbers
  # to express rank, and there is nothing significant about the absolute value of
  # the rank. It is useful only relative to the other ranks. By sorting them,
  # the children of a node are returned from the db in proper order.


  # Calculate node's splice-rank. This is the most-used rank method so far.
  # But others might come along. This is a generic utility rank-calculation-function,
  # one of the possible rank calculation methods that calc_node_rank() might use.
  #
  # Algorithm for calculating ranks: a node's rank is the average of the ranks
  # of its predecessor and successor siblings. If a node has no predecessor, the rank used in place
  # of the predecessor's rank is 0.0. If a node has no successor, the rank used in place
  # of the successor's rank is 1.0.
  def calc_splice_rank
    predecessor_rank = predecessor ? predecessor.rank : 0.0
    successor_rank   = successor   ? successor.rank   : 1.0

    (successor_rank + predecessor_rank) / 2.0
  end


  # Used by the trash node to calculate the rank of its children.
  # Each successive child pushed onto the top of the child list is given a rank
  # that is one less than its successor.
  def calc_pushed_child_rank
    if successor
      successor.rank - 1
    else
      0
    end
  end

  # Calculate the rank for node, which should be a relative of ourselves (child, successor, predecessor),
  # as part of the process of inserting node as a relative of ourselves.
  def calc_child_rank (child_node)
    child_node.calc_splice_rank
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
end

# =============================================================================
#                                   SplicePosition
# =============================================================================
# Instances of this class facilitate the insert operation, which causes a node
# to be inserted into the hierarchy at the position designated by the SplicePosition instance.
# This is a base class, not to be instantiated. See SplicePositionParent, etc., below.
class SplicePosition
  attr_reader :node, :parent, :successor, :predecessor

  def initialize (node)
    @node        = node
    @parent      = nil
    @successor   = nil
    @predecessor = nil
  end

  # Override this in derived class.
  # Calculate the parent, successor, and predecessor nodes for the node-to-be-inserted. The node-to-be-inserted
  # is going to be inserted into the tree hierarchy relative to @node. For example, if @node is the splice position
  # predecessor of the node-to-be-inserted, then the node-to-be-inserted will become its successor.
  # PROGRAMMER NOTES
  # As part of the insertion process, this method needs to be called at exactly the right time,
  # just after the node-to-be-inserted has been unhooked from the tree.
  # The timing is tricky because the reference node,
  # @node, may well be undergoing changes to its relatives as part of
  # the insert() operation that is in-progress. We need to calculate the proper parent, successor, and predecessor
  # for the node-to-be-inserted at just the right time and then save those values before
  # they change (again) on @node itself. When the node-to-be-inserted is unhooked, this may cause changes
  # to @node--desirable changes that we want to take into account, so calc_relatives should be called after
  # the unhook() operation. When the node-to-be-inserted is spliced, this may again cause changes to @node--
  # undesirable changes as far as this method is concerned, so calc_relatives should be called before the splice()
  # operation.
  def calc_relatives
  end

  def to_s
    "[#{self.class.name}: node: (#{node}), parent:(#{parent}), predecessor: (#{predecessor}), successor: (#{successor})]"
  end
end

# Designates a splice position in which the node to be inserted
# becomes a child of the node that initializes the splice position object.
# If last is true, then it becomes the last child; otherwise, it becomes the first child.
class SplicePositionChild < SplicePosition
  attr_accessor :last

  def initialize (node, last = false)
    super(node)
  end

  # See documentation on superclass
  def calc_relatives
    @node.reload # @node may have had its relations changed. Get the latest from the db.
    @parent      = @node
    @predecessor = @node.last_child  if  last
    @successor   = @node.first_child if !last
  end
end

# Designates a splice position in which @node becomes the predecessor of the node-to-be-inserted
class SplicePositionPredecessor < SplicePosition
  def initialize (node)
    super(node)
  end

# See documentation on superclass
  def calc_relatives
    @node.reload # @node may have had its relations changed. Get the latest from the db.
    @parent      = @node.parent
    @predecessor = @node
    @successor   = @node.successor
  end
end



# Designates a splice position in which @node becomes the successor of the node-to-be-inserted
class SplicePositionSuccessor < SplicePosition
  def initialize (node)
    super(node)
  end

  def calc_relatives
    @node.reload # @node may have had its relations changed. Get the latest from the db.
    @parent      = @node.parent
    @predecessor = @node.predecessor
    @successor   = @node
  end
end


# =============================================================================
#                                   NodeRep
# =============================================================================
# This is a helper class used by the method render_recursively() above. It allows us
# to realize a node and its children explicitly so that it can then be rendered as json, or html,
# or in whatever format we desire. By contrast, the ActiveRecord Node class doesn't realize its children
# until it needs to, and the to_json() method doesn't work on it as desired. Also, by explicitly rendering
# into a new object type, we can control the depth to which the tree is rendered.
class NodeRep
  attr_accessor :type_id, :content, :height, :width, :children
end

# =============================================================================
#                                   NodeRep To Html
# =============================================================================
# This module knows how to convert a NodeRep and its children to an html representation.
module NodeRepToHtml
  # Render self and children as html.
  def self.convert (nodeRep)
    result = ''
    result << "<li>#{nodeRep.content}</li>"

    if !nodeRep.children.empty?
      result << '<ul>'
      nodeRep.children.each do |child|
        result << convert(child)
      end
      result << '</ul>'
    end

    result
  end
end

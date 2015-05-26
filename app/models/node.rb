class Node < ActiveRecord::Base
  # TODO -- put these in the database instead
  BULLET = 1 # type_id of this value indicates a bullet item.
  PARAGRAPH = 2 # type_id of this value indicates a paragraph item.

  attr_accessible :content, :parent_id, :rank, :type_id, :predecessor_id, :successor_id, :width, :height
  belongs_to :parent, class_name: 'Node'
  belongs_to :predecessor, class_name: 'Node'
  belongs_to :successor, class_name: 'Node'
  has_many :children, class_name: 'Node', foreign_key: :parent_id

  after_initialize do |node|
    node.type_id ||= BULLET # By default, new nodes are bullets rather than paragraphs or other types.
  end

  def self.top
    result = where('parent_id = -1').first
    result || make_top_node
  end

  def self.make_top_node
    result = Node.new(content:'Top', rank:0, width:100, height:50)
    result.parent_id = -1
    result.save!
    result
  end


  # Cause node, which should be unsaved, to be inserted in the node hierarchy
  # between predecessor_node and successor_node, as one of their siblings.
  # All should have the common parent <parent>, which can conceivably be nil, if these
  # are all top-level nodes (but not sure if we want to allow this in other areas of the app).
  # parent, predecessor_node, and successor_node, if non-nil, should all be saved records in the db,
  # and the successor of predecessor_node should be successor_node, and vice versa.
  # If predecessor_node is nil, then node becomes the first child of parent. If successor_node is
  # nil, then node becomes the last child of parent.
  #   This method fixes all the predecessor and successor links, calculates the rank of node,
  # and causes node to be saved to the db, along with mods to the sibling nodes on either side of it.
  # Its return value is node.
  def self.splice_in_node (parent, predecessor_node, node, successor_node)
    puts "***** Enter splice_in_node"
    puts "parent: #{parent}"
    puts "predecessor: #{predecessor_node}"
    puts "new node: #{node}"
    puts "successor: [#{successor_node}]"


    # Sanity checks
    raise "successor node #{successor_node} is not the successor of predecessor node #{predecessor_node}" if predecessor_node && (predecessor_node.successor != successor_node)
    raise "predecessor node #{predecessor_node }is not the predecessor of successor node #{successor_node}" if successor_node && (successor_node.predecessor != predecessor_node)
    raise "parent #{parent} is not the parent of predecessor_node #{predecessor_node}" if predecessor_node && (predecessor_node.parent != parent)
    raise "parent #{parent} is not the parent of successor_node #{successor_node}" if successor_node && (successor_node.parent != parent)

    # We need to get the node an id before we can patch up the predecessor/successor links
    # We do this by saving it to the db.
    node.parent = parent
    node.save!

    # Patch up parent and predecessor/successor links
    node.predecessor              = predecessor_node
    node.successor                = successor_node
    predecessor_node.successor_id = node.id if predecessor_node
    successor_node.predecessor_id = node.id if successor_node

    # Calculate our rank
    node.rank = node.calc_rank()

    # Save the siblings on either side to the db first, to change their predecessor/successor links.
    # We can't save node again until this is done, because the siblings are already pointing to
    # the nodes that it wants to point to
    predecessor_node.save! if predecessor_node
    successor_node.save!   if successor_node
    node.save! # Now that we've updated the links on the predecessor and successor, it's safe to save node.

    node
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

  # Add node, which should be unsaved, to the node hierarchy, to be a new child
  # of self. It's added onto the end of self's set of children and given
  # a rank that reflects its being on the end.
  def add_child (node)
    Node.splice_in_node(self, last_child, node, nil)
  end


  # Add node, which should be unsaved, to the node hierarchy, to be a new sibling
  # of self that directly follows self in rank.
  # This entails patching up the predecessor / successor links, and
  # calculating the rank for the new node.
  def add_sibling (node)
    Node.splice_in_node(self.parent, self, node, self.successor)
  end


  # Remove self and children from the node hierarchy, patching up predecessor/successor links.
  def remove
    predecessor_node = self.predecessor
    successor_node   = self.successor
    predecessor_node.successor_id = (successor_node   ? successor_node.id   : nil) if predecessor_node
    successor_node.predecessor_id = (predecessor_node ? predecessor_node.id : nil) if successor_node

    remove_self_and_children # Need to remove self before the siblings, with their new (unique!) links, can be saved.

    predecessor_node.save! if predecessor_node
    successor_node.save! if successor_node
  end

  # Remove all your children from the hierarchy, and their children, recursively.
  def remove_self_and_children
    children.each do |node|
      node.destroy
    end
    destroy
  end

  def last_child
    children.order('rank desc').first
  end
end

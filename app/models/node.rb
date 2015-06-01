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


  # Cause node to be inserted into the node hierarchy at the position
  # specified by options. The options are considered in the following order,
  # and the first one that applies is used to determine the position:
  #    If option :predecessor is specified with value p,
  #    then p will be the predecessor of node.
  #
  #    If option :successor is specified with value s, then s will be the successor of node.
  #
  #    If option :parent is specified with value p, then node will be the first child of p,
  #    unless the option :last_child with value true is also specified.
  #
  # This method fixes all the predecessor and successor links, calculates the rank of node,
  # and causes node to be saved to the db if it was not already in the db, along with mods
  # to the sibling nodes on either side of it. If node was already in the db, its previous
  # relationship links are unhooked.
  #
  # The return value of this method is node.
  def self.splice_in_node (node, options)
    new_predecessor, new_successor, new_parent = self._get_splice_relations(options)
    node.save_if_new_else_unhook






    node.parent = _parent
    node.set_predecessor(_predecessor)
    node.set_successor(_successor)
    node.rank = node.calc_rank()
    node.save!
    node

    # Patch up parent and predecessor/successor links
    node.predecessor              = predecessor_node
    node.successor                = successor_node
    predecessor_node.successor_id = node.id if predecessor_node
    successor_node.predecessor_id = node.id if successor_node



    # Save the siblings on either side to the db first, to change their predecessor/successor links.
    # We can't save node again until this is done, because the siblings are already pointing to
    # the nodes that it wants to point to
    predecessor_node.save! if predecessor_node
    successor_node.save!   if successor_node
    node.save! # Now that we've updated the links on the predecessor and successor, it's safe to save node.

    node
  end

  # Internal function used to determine the new parent, predecessor, and successor of a node
  # about to be spliced into the node hierarchy. See splice_in_node() above.
  def self._get_splice_relations (options)
    _predecessor = options[:predecessor]
    _successor   = options[:successor]
    _parent      = options[:parent]
    _last_child  = options[:last_child]

    if _predecessor
      _parent = predecessor.parent
      _successor = predecessor.successor
    elsif _successor
      _parent = successor.parent
      _predecessor = successor.predecessor
    elsif _parent && !_last_child
      _predecessor = nil
      _successor = first_child
    elsif _parent && _last_child
      _predecessor = last_child
      _successor = nil
    else
      throw "One of the options :predecessor, :successor, :parent must point to an existing node"
    end

    return [_predecessor, _successor, _parent]
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

  def _set_predecessor (_predecessor)
    self.predecessor       = _predecessor
    _predecessor.successor = self if _predecessor
  end


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


  # Add node, which should be unsaved, to the node hierarchy, to be a new child
  # of self. It's added onto the beginning of self's set of children, unless last
  # is true, in which case it is added onto the end.
  def add_child (node, last = false)
    Node.splice_in_node(node, {parent:self, last_child:last})
  end

  # Add node to the node hierarchy to be the successor
  # of self. If node is already in the hiearchy, then its existing parent- and sibling-links
  # will be detached and re-hooked-up to fit with its new position.
  def add_successor (node)
    Node.splice_in_node(node, {predecessor:self})
  end

  # Add node to the node hierarchy to be the predecessor
  # of self. If node is already in the hiearchy, then its existing parent- and sibling-links
  # will be detached and re-hooked-up to fit with its new position.
  def add_predecessor (node)
    Node.splice_in_node(node, {successor:self})
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


  def first_child
    children.order('rank asc').first
  end
end

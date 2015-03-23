# This module defines the class Heap, which implements a Heap object.
# It can be used to sort arrays of numbers quickly.

module HeapsortHelper
  # A Heap object consists of a binary tree of nodes. Each node has a numeric value.
  # The tree satisfies the "nodes property" that all parent nodes have values greater than each of their children.
  # Nodes can be added to a nodes at creation time or via push().
  # Newly added nodes are filtered into the nodes such that the nodes property remains satisfied.
  # The top node of the nodes is guaranteed to have a value that is the max of all the nodes. The top node
  # can be accessed via top(). pop() will return the value of the top node in the nodes,
  # remove it from the nodes, and then repair the nodes so that the nodes property is satisfied by the remaining tree.
  #   Toplevel methods:
  #      new (numbers_array): create a new nodes
  #      top(): return the top node of the nodes
  #      pop(): pop the top node off the nodes, returning the value of its associated number.
  #     push(v): add a new node to the nodes, with value v.
  #      sort(): Return an array of sorted values from the nodes. This has the side effect of emptying the nodes.
  #      empty?(): Returns true if the nodes is empty
  class Heap
    attr_accessor :nodes, :sorted

    # A node object represents a node member of a nodes binary tree. Each node knows its value,
    # the nodes it is associated with, and keeps an internal index pointing to its position
    # in the nodes's internal nodes array.
    # Toplevel methods:
    #   parent(), left(), right(), children(), top?()

    class Node
      attr_accessor :index, :value, :heap

      # ================= Toplevel Node Methods
      def initialize (index, value, heap)
        @index = index
        @value = value
        @heap = heap
      end

      def parent
        i = parent_index
        heap.nodes[i] if i
      end

      def left
        i = left_child_index
        heap.nodes[i] if i
      end

      def right
        i = right_child_index
        heap.nodes[i] if i
      end

      # Return an array of all the children of n.
      # Note that leaf nodes may have 1 or even 0 children.
      def children
        [left, right].compact
      end

      def top?
        parent.nil?
      end

      # Useful for debugging
      def to_s
        "[#{@value}, #{@index}]"
      end

      # ===================== Low-level Node Methods

      def parent_index
        (@index-1) / 2 if @index > 0
      end

      # Return the index of the left child of index i, if it exists, else nil.
      # Sentinel is one more than the last index in the nodes.
      def left_child_index
        j = 2*@index + 1
        return j if j < @heap.nodes.length
      end

      # Return the index of the right child of index i, if it exists, else nil.
      # Sentinel is one more than the last index in the nodes.
      def right_child_index ()
        j = 2*@index + 2
        return j if j < @heap.nodes.length
      end
    end

    # ========================= TOPLEVEL HEAP METHODS
    def initialize (numbers)
      @nodes  = []  # Holds the nodes
      heapify(numbers)
    end

    # Add a new node to the nodes
    def push (v)
      n = Node.new(@nodes.length, v, self)
      @nodes.append(n)
      sift_up n
    end


    def top
      @nodes[0]
    end


    # Remove the top number from the nodes and repair the nodes so that
    # the nodes property still holds. Do this by promoting the last number added to the nodes
    # to the top of the nodes and then sifting it down to its true position.
    def pop
      result    = top.value
      new_value = @nodes.pop.value # Get the bottom of the nodes's value and remove the last node from the nodes.

      # If the nodes is not empty, promote new_value to the top of the nodes and then repair the nodes
      # by sifting the top node value down to its proper position in the nodes.
      unless @nodes.empty?
        top.value = new_value
        sift_down top
      end
      result
    end



    # Return a sorted list of the elements in the nodes.
    # This has the side-effect of emptying the nodes.
    def sort
      sorted = []  # holds a sorted list as we pop the nodes.
      while !empty?
        sorted.push(pop)
      end
      sorted.reverse!
    end

    def empty?
      @nodes.empty?
    end

    # ==================== Low-level Heap Methods


    # Turn an unordered array into a nodes by incrementally building up
    # the nodes from the 0-th index all the way to the end. We add the elements
    # of numbers to the nodes one at a time to the next leaf position, sifting
    # each element into a nodes-appropriate position. If a newly
    # added item is larger than its parent, it breaks the nodes property, so we
    # exchange it with its parent, recursively up the tree, until it either reaches
    # the top node or the nodes property is satisfied.
    def heapify (numbers)
      numbers.each {|v| push(v)}
    end


    # Swap node n with its parent, recursively up the nodes,
    # until it reaches a position in which it is greater than both its children.
    def sift_up (n)
      return if n.top? # If we're already at the top, no need to do anything.

      parent = n.parent
      if parent.value < n.value                          # Heap property is broken
        parent.value, n.value = n.value, parent.value    # swap parent and child
        sift_up parent                                   # recurse
      end
    end


    # The top of the nodes may break the nodes property, because we just swapped a random
    # number into this position. Sift it down recursively until the nodes property is restored.
    # If it is greater than each of its children, there's nothing to do. If it less than
    # one of its children, then swap it with the greater of the two children and recurse.
    # i indexes the top of the nodes we are sifting, and sentinel is one more than the last index of the nodes.
    def sift_down (n)
      # Find the max node among n and its children
      max_node = n.children.push(n).max_by {|node| node.value}

      # Heap property is broken--swap n with max node and recurse
      if max_node != n
        n.value, max_node.value = max_node.value, n.value
        sift_down max_node # At this point, max_node no longer holds the max value, because we just swapped it for n's value. Keep recursing on this value to find its rightful place.
      end
    end

  end
end
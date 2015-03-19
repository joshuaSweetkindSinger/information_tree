module HeapsortHelper
  class Heap
    attr_accessor :nodes, :sorted

    class Node
      attr_accessor :index, :value, :heap

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

      def top?
        parent.nil?
      end

      def parent_index
        (@index-1) / 2 if @index > 0
      end

      # Return the index of the left child of index i, if it exists, else nil.
      # Sentinel is one more than the last index in the heap.
      def left_child_index
        j = 2*@index + 1
        return j if j < @heap.nodes.length
      end

      # Return the index of the right child of index i, if it exists, else nil.
      # Sentinel is one more than the last index in the heap.
      def right_child_index ()
        j = 2*@index + 2
        return j if j < @heap.nodes.length
      end
    end


    def initialize (numbers)
      @nodes  = []  # Holds the heap
      heapify(numbers)
    end


    # Turn an unordered array into a heap by incrementally building up
    # the heap from the 0-th index all the way to the end. We add the elements
    # of numbers to the heap one at a time to the next leaf position, sifting
    # each element into a heap-appropriate position. If a newly
    # added item is larger than its parent, it breaks the heap property, so we
    # exchange it with its parent, recursively up the tree, until it either reaches
    # the top node or the heap property is satisfied.
    def heapify (numbers)
      numbers.each {|v| push(v)}
    end

    # Add a new node to the heap
    def push (v)
      n = Node.new(@nodes.length, v, self)
      @nodes.append(n)
      sift_up n
    end

    # Swap node n with its parent, recursively up the heap,
    # until it reaches a position in which it is greater than both its children.
    def sift_up (n)
      return if n.top? # If we're already at the top, no need to do anything.

      parent = n.parent
      if parent.value < n.value                          # Heap property is broken
        parent.value, n.value = n.value, parent.value    # swap parent and child
        sift_up parent                                   # recurse
      end
    end


    # Return a sorted list of the elements in the heap.
    # This has the side-effect of emptying the heap.
    def sort
      sorted = []  # holds a sorted list as we pop the heap.
      while !empty?
        sorted.unshift(pop)
      end
      sorted
    end

    def empty?
      @nodes.empty?
    end

    # Remove the top number from the heap and repair the heap so that
    # the heap property still holds. Do this by promoting the last number added to the heap
    # to the top of the heap and then sifting it down to its true position.
    def pop
      result          = @nodes[0].value  # Get the top of the heap's value
      new_value       = @nodes.pop.value # Get the bottom of the heap's value and remove the last node from the heap.

      # If the heap is not empty, promote new_value to the top of the heap and then repair the heap
      # by sifting the top node value down to its proper position in the heap.
      unless @nodes.empty?
        @nodes[0].value = new_value
        sift_down @nodes[0]
      end

      result
    end


    # The top of the heap may break the heap property, because we just swapped a random
    # number into this position. Sift it down recursively until the heap property is restored.
    # If it is greater than each of its children, there's nothing to do. If it less than
    # one of its children, then swap it with the greater of the two children and recurse.
    # i indexes the top of the heap we are sifting, and sentinel is one more than the last index of the heap.
    def sift_down (n)
      lchild = n.left
      rchild = n.right

      # Find the max node, handling possibly null children
      max_node = n
      if lchild && lchild.value > max_node.value
        max_node = lchild
      end

      if rchild && rchild.value > max_node.value
        max_node = rchild
      end

      # Heap property is broken--swap n with max node and recurse
      if max_node != n
        n.value, max_node.value = max_node.value, n.value
        sift_down max_node # At this point, max_node no longer holds the max value, because we just swapped it for n's value. Keep recursing on this value to find its rightful place.
      end
    end
  end
end
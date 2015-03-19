module HeapsortHelper
  def heapsort (numbers)
    heapify numbers # semi-order the numbers into a legitimate heap

    last = numbers.length - 1
    while last > 0
      numbers[0], numbers[last] = numbers[last], numbers[0] # swap max number to back
      sift_down numbers, 0, last
      last -= 1
    end
  end


  # Turn an unordered array into a heap by incrementally building up
  # the heap from the 0-th index all the way to the end. We add the elements
  # of the array to the heap one at a time to the next leaf position, sifting
  # each element into a heap-appropriate position. If a newly
  # added item is larger than its parent, it breaks the heap property, so we
  # exchange it with its parent, recursively up the tree, until it either reaches
  # the top node or the heap property is satisfied.
  def heapify (numbers)
    0.upto(numbers.length - 1) do |i|
      sift_up numbers, i
    end
  end


  # Swap the number at numbers[i] with its parent, recursively up the heap,
  # until the number reaches a position in which it is greater than both its children.
  def sift_up (numbers, i)
    return if i == 0 # If we're already at the top, no need to do anything.

    j = parent_index(i)
    if numbers[j] < numbers[i]   # Heap property is broken
      numbers[j], numbers[i] = numbers[i], numbers[j]    # swap parent and child
      sift_up numbers, j         # recurse
    end
  end


  def parent_index (i)
    (i-1) / 2
  end


  # The top of the heap may break the heap property, because we just swapped a random
  # number into this position. Sift it down recursively until the heap property is restored.
  # If it is greater than each of its children, there's nothing to do. If it less than
  # one of its children, then swap it with the greater of the two children and recurse.
  # i indexes the top of the heap we are sifting, and sentinel is one more than the last index of the heap.
  def sift_down (numbers, i, sentinel)
    j = left_child_index(i, sentinel)   # get left child index
    k = right_child_index(i, sentinel)  # get right child index

    # Find the max index, handling possibly null children
    max_index, max_val = i, numbers[i]
    if j && numbers[j] > max_val
      max_index, max_val = j, numbers[j]
    end

    if k && numbers[k] > max_val
      max_index, max_val = k, numbers[k]
    end

    # Heap property is broken--swap i with max index and recurse.
    if max_index != i
      numbers[i], numbers[max_index] = numbers[max_index], numbers[i]
      sift_down numbers, max_index, sentinel
    end
  end

  # Return the index of the left child of index i, if it exists, else nil.
  # Sentinel is one more than the last index in the heap.
  def left_child_index (i, sentinel)
    j = 2*i + 1
    return j if j < sentinel
  end

  # Return the index of the right child of index i, if it exists, else nil.
  # Sentinel is one more than the last index in the heap.
  def right_child_index (i, sentinel)
    j = 2*i + 2
    return j if j < sentinel
  end
end
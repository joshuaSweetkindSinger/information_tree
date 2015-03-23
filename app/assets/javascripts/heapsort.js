// ============================================== UI Elements

// ==================== Clear Input Button
var ClearInput = defCustomTag('clear-input')

ClearInput.prototype.onCreate = function() {
  var $this = $(this)
  $this.css('display', 'inline-block')
  $this.css('border', '1px solid black')
  $this.css('background', 'green')
  $this.click(function() {
    $("#" + $this.data('target')).val("")
  })
}

// ==================== Local Solve Button
var DoitLocally = defCustomTag('doit-locally')
DoitLocally.prototype.onCreate = function() {
  var $this = $(this)
  $this.css('display', 'inline-block')
  $this.css('border', '1px solid black')
  $this.css('background', 'yellow')
  $this.click(function() {this.doit() })
}

DoitLocally.prototype.doit = function() {
  // Maybe make results container in DOM if it doesn't already exist
  if ($('#results').length == 0) {
    var container = $("<div class='container'></div>")
    container.append($('<ul id="results"><li>Hello world</li></ul>'))
    $('body').append(container)
  }

  // Clear the result area of the last set of results.
  $('#results').children().remove()

  // Get comma-separated string of values from the input field.
  var numbers = $('#my-input').val().split(',').map(function (x) {return Number(x)})

  var heap = new Heap(numbers)
  var sorted_numbers = heap.sort()
  var html_bits = sorted_numbers.map(function (x) {
    return "<li>" + x + "</li>"
  })

  $('#results').append(html_bits.join(""))
}
// ==================================================== Core Heapsort
// ======================== Helper class Node
// ================= Node accessor methods: parent, left, right

function Node (i, v, heap) {
  this.index = i
  this.value = v
  this.heap = heap
}


// Return our parent node
Node.prototype.parent = function() {
  var i = this.parent_index(this.index)
  return (i >= 0) ? this.heap.nodes[i] : null
}

// Return our left child node
Node.prototype.left = function() {
  var i = this.left_child_index(this.index)
  return i < this.heap.nodes.length ? this.heap.nodes[i] : null
}

Node.prototype.right = function() {
  var i = this.right_child_index(this.index)
  return i < this.heap.nodes.length ? this.heap.nodes[i] : null
}

Node.prototype.is_top = function () {
  return this.index == 0
}

// Return an array containing all of the node's children. This could be an empty array.
// A node has up to 2 children.
Node.prototype.children = function () {
  result = []
  if (this.left()) {
    result.push(this.left())
  }
  if (this.right()) {
    result.push(this.right())
  }
  return result
}

Node.prototype.selfAndChildren = function() {
  var result = this.children()
  result.push(this)
  return result
}

// ================== Lower-level Node methods



// Return the index of the parent of the node at index i
Node.prototype.parent_index = function(i) {
  return i > 0 ? Math.floor((i-1) / 2) : null
}

// Return the index of the left child of the node at index i
Node.prototype.left_child_index = function(i) {
  return 2*i + 1 < this.heap.nodes.length ? 2*i + 1 : null
}

// Return the index of the right child of the node at index i
Node.prototype.right_child_index = function(i) {
  return 2*i + 2 < this.heap.nodes.length ? 2*i + 2 : null
}


// ======================================= Heap Class


// Implementation of a Heap object.
// Numbers should be an array with which to initialize the nodes.
function Heap(numbers) {
  // Initialize the nodes to be empty, then push each number into it in turn.
  this.nodes = []
  var me = this
  numbers.forEach(function (x) {
    me.push(x)
  })
}

// ==================================== Interface Methods
Heap.prototype.top = function() {
  return this.nodes[0]
}

Heap.prototype.is_empty = function() {
  return this.nodes.length == 0
}


// Push the number x on the nodes. We start by adding it to the end of the nodes
// as a leaf node, then we call sift_up to put it in its proper place in the nodes.
Heap.prototype.push = function(v) {
  var n = new Node(this.nodes.length, v, this)
  this.nodes.push(n)
  this.sift_up(n)
  return this
}


// Pop the top element off of nodes, returning its value, and then repair the nodes so that the nodes property still holds.
// We initiate the repair by promoting the last element value of nodes into the top position, then
// sifting it down to its proper place in nodes.
Heap.prototype.pop = function () {
  var top_node    = this.top()
  var bottom_node = this.nodes.pop() // Grab bottom of the nodes.
  var result      = top_node.value   // Save this to return when we're done.

  if (!this.is_empty()) {
    this.swap_node_values(top_node, bottom_node)
    this.sift_down(top_node)
  }

  return result
}


// Return a new, sorted array, using the nodes to do a fast sort.
// This has the side-effect of emptying the nodes.
Heap.prototype.sort = function() {
  var result = []
  while (!this.is_empty()) {
    result.push(this.pop())
  }
  return result
}

// ======================= Internal Methods

// Put the element at the specified index in its proper place in nodes, by comparing
// it with its parent. If it's smaller than the parent, we're done. If it's larger, swap values
// with the parent and recurse. Return the node at the final resting place for n's value.
Heap.prototype.sift_up = function (n) {
  if (n.is_top()) return n // We're at the top of nodes--nothing to do

  // Compare with the parent, and swap values if we're larger than parent, then recurse.
  var parent = n.parent()
  if (n.value > parent.value) {
    this.swap_node_values(n, parent)
    return this.sift_up(parent)
  } else {
    return n
  }
}

/*
 Repair the nodes by sifting down the node n until
 it finds its proper place in  nodes. If the element is greater than each of its children,
 we are done; otherwise, trade places with the larger child and recurse.
 */
Heap.prototype.sift_down = function(n) {
  // We need to find, among index and its children, which has the largest value.
  // Here we just initialize these variables. We don't yet know which is largest.
  var nodeAndChildren = n.selfAndChildren()
  var max_node = nodeAndChildren.reduce(function(n1, n2) { return n1.value > n2.value ? n1 : n2}) // Get the max node of node and its children.

  // The meat: If index is not the largest, trade places with largest and recurse.
  if (max_node != n) {
    this.swap_node_values(max_node, n)
    this.sift_down(max_node)
  }
}


Heap.prototype.swap_node_values = function(n1, n2) {
  var temp = n1.value
  n1.value = n2.value
  n2.value = temp
}



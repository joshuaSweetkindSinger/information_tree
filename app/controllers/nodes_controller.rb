class NodesController < ApplicationController

  # ============================= Standard Crud
  # GET /nodes
  # GET /nodes.json
  # GET /nodes.json?ids=[id1,id2,...,idn]
  def index
    if !params[:ids]
      @objects = Node.limit(100) # TODO: Add paging
    else
      @objects = Node.find(params[:ids])
      @objects << Basket.basket if !params[:basket].empty?
    end


    respond_to do |format|
      format.html # index.html.erb
      format.json { render json: @objects }
    end
  end


  # GET /nodes/1
  # GET /nodes/1.json
  def show
    @obj = Node.find(params[:id])

    respond_to do |format|
      format.html # show.html.erb
      format.json { render json: @obj }
    end
  end


  # GET /nodes/new
  # GET /nodes/new.json
  def new
    @obj = Node.new

    respond_to do |format|
      format.html # new.html.erb
      format.json { render json: @obj }
    end
  end


  # GET /nodes/1/edit
  def edit
    @obj = Node.find(params[:id])
  end


  # POST /nodes
  # POST /nodes.json
  # Valid attributes to set for a node are :content, :type_id, :width, :height.
  # New nodes are created "in limbo", without parent, predecessor, or successor links.
  def create
    @obj = Node.new(params[:node])

    respond_to do |format|
      if @obj.save
        format.html { redirect_to @obj, notice: 'Node was successfully created.' }
        format.json { render json: @obj, status: :created, location: @obj }
      else
        format.html { render action: "new" }
        format.json { render json: @obj.errors, status: :unprocessable_entity }
      end
    end
  end

  # PUT /nodes/1
  # PUT /nodes/1.json
  def update
    @obj = Node.find(params[:id])

    respond_to do |format|
      if @obj.update_attributes(params[:node])
        format.html { redirect_to @obj, notice: 'Node was successfully updated.' }
        format.json { head :no_content }
      else
        format.html { render action: "edit" }
        format.json { render json: @obj.errors, status: :unprocessable_entity }
      end
    end
  end


  # DELETE /nodes/1
  # DELETE /nodes/1.json
  def destroy
    @obj = Node.find(params[:id])
    @obj.destroy

    respond_to do |format|
      format.html { redirect_to :back}
      format.json { head :no_content }
    end
  end

  # ======================================== Controller Actions beyond basic crud

  # GET /nodes/roots
  # Return an array of all root nodes: those that have no parent.
  def roots
    @objects = Node.roots
    respond_to do |format|
      format.html
      format.json {render json: @objects}
    end
  end

  # GET /nodes/top
  def top
    @obj = Node.top
    respond_to do |format|
      format.html {render 'show'}
      format.json {render json: @obj}
    end
  end

  # GET /nodes/basket
  def basket
    @obj = Node.basket
    respond_to do |format|
      format.html {render 'show'}
      format.json {render json: @obj}
    end
  end

  # DELETE /nodes/basket
  # This deletes the contents of the basket node (its children).
  def empty_basket
    Basket.basket.empty
    respond_to do |format|
      format.json {render json:{success: true}}
    end
  end

  # GET /nodes/:id/children
  def children
    @obj      = Node.find(params[:id])

    respond_to do |format|
      format.html
      format.json {render json: @obj.children.order(:rank)}
    end
  end

  # PUT /nodes/:id/insert_child
  # Insert the node params[:node][:id] as a new child of params[:id]
  def insert_child
    insert_node('insert_child')
  end

  # PUT /nodes/:id/insert_successor
  # Insert the node params[:node][:id] as a new successor of params[:id]
  def insert_successor
    insert_node('insert_successor')
  end

  # PUT /nodes/:id/insert_predecessor
  # Insert the node params[:node][:id] as a new predecessor of params[:id]
  def insert_predecessor
    insert_node('insert_predecessor')
  end

  # POST /nodes/:id/add_child
  def add_child
    @obj = Node.find(params[:id])
    new_node = Node.new(content: 'New node')
    if new_node.save
      @obj.insert_child(new_node)
    end
    render 'show'
  end

  # POST /nodes/:id/add_successor
  def add_successor
    @obj = Node.find(params[:id])
    new_node = Node.new(content: 'New node')
    if new_node.save
      @obj.insert_successor(new_node)
      @obj = new_node
    end
    render 'show'
  end

  # POST /nodes/:id/add_predecessor
  def add_predecessor
    @obj = Node.find(params[:id])
    new_node = Node.new(content: 'New node')
    if new_node.save
      @obj.insert_predecessor(new_node)
      @obj = new_node
    end
    render 'show'
  end

  # PUT /nodes/:id/paste_child
  # Paste the top of the basket as the first child of params[:id]
  def paste_child
    @obj = Node.find(params[:id])
    node = Basket.basket.first_child

    if node
      @obj.insert_child(node)
    end

    render 'show'
  end

  # PUT /nodes/:id/paste_successor
  # Paste the top of the basket as the successor of params[:id]
  def paste_successor
    @obj = Node.find(params[:id])
    node = Basket.basket.first_child

    if node
      @obj.insert_successor(node)
      @obj = node
    end

    render 'show'
  end


  # PUT /nodes/:id/paste_predecessor
  # Paste the top of the basket as the predecessor of params[:id]
  def paste_predecessor
    @obj = Node.find(params[:id])
    node = Basket.basket.first_child

    if node
      @obj.insert_predecessor(node)
      @obj = node
    end

    render 'show'
  end

  # PUT /nodes/:id/set_attributes
  # Set one or more attributes of the object whose id is params[:id].
  # The attributes and their values are passed in as a sub-hash on params[:node], e.g.
  # params = {id: 123, node: {content: "Beautiful Sky", width:200, height:100, type_id: 1}}
  # NOTE: This does not allow you to set attributes that affect the hierarchy, e.g., parent_id, rank.
  # TODO: This is really just the update method. Should merge this with update() once tested.
  def set_attributes
    @obj = Node.find(params[:id]) # Find existing node in db.

    # Node wasn't found -- send back an error.
    if (!@obj)
      return render(json: {error: "Node with id #{params[:id]} could not be found in the db."})
    end

    # Set all settable attribute values on node from those specified in params.
    attribute_params = params[:node].select do |k, v|
      %w(content type_id width height).include?(k)
    end

    respond_to do |format|
      if @obj.update_attributes(attribute_params)
        format.html { redirect_to @obj, notice: 'Node was successfully updated.' }
        format.json { render json: @obj}
      else
        format.html { render action: "edit" }
        format.json { render json: @obj.errors, status: :unprocessable_entity }
      end
    end
  end


  # Remove self from the node hierarchy, patching up predecessor/successor links.
  # This moves the node and its children under the "Basket" node. They're not really deleted.
  # PUT /nodes/:id/put_in_basket
  def put_in_basket
    node = Node.find(params[:id])
    @obj = node.parent # We'll show the parent node, since we're about to put current node in basket.

    # Don't put a top-level node in the basket. (It might be okay to put some toplevel nodes
    # in the basket, but if we put the "top" node in the basket, I think we're screwed.)
    if @obj
      node.put_in_basket()
    else
      @obj = node # If not put in basket, then just re-show this node.
    end

    respond_to do |format|
      format.html { render 'show' }
      format.json { head :no_content }
    end
  end

  # Destroy an empty node. An empty node neither has content nor children.
  def destroy_empty
    @obj = Node.find(params[:id])
    @obj.destroy_empty
    respond_to do |format|
      format.html { redirect_to nodes_url }
      format.json { head :no_content }
    end
  end

  # Repair the children of this node by re-assigning their predecessor/successor links from scratch.
  def repair_children
    @obj = Node.find(params[:id])
    @obj.repair_children
    respond_to do |format|
      format.html {redirect_to nodes_url}
      format.json {render json: @obj}
    end
  end


  def test_me
    respond_to do |format|
      format.html {render inline: "Returning html!"}
      format.js {render js: 'alert("this is a test!");', content_type: 'application/javascript'}
    end
  end


  # GET /nodes/:id/recursive/:max_depth
  # Render the node with id params[:id], and its children, and their children, etc.
  # Stop at a max limit of a certain number of nodes to prevent crashing when the scale is too large.
  def render_recursively
    @obj = Node.find(params[:id])
    max_depth = params[:max_depth].to_f if params[:max_depth]

    respond_to do |format|
      format.html {render inline: NodeRepToHtml::convert(NodeRep.new(@obj, max_depth))}
      format.json {render json: NodeRep.new(@obj, max_depth)}
    end

  end



  # An admin function: produce a table of broken nodes, or return an array of those nodes if
  # the response format is json.
  def show_broken
    @objects = Node.find_broken
    respond_to do |format|
      format.html
      format.json {render json: @objects}
    end
  end

  # Show a form that allows the user to specify a json file for uploading new nodes to the information tree.
  def show_import_form
  end

  # POST /nodes/import
  # POST /nodes/import.json
  # Create an entire sub-tree by importing a json structure representing the root of the sub-tree.
  def import
    @obj = Node.create_sub_tree JSON.parse(File.read(params[:file_to_upload].tempfile.path), symbolize_names: true)

    respond_to do |format|
      format.html { redirect_to @obj, notice: 'Node was successfully created.' }
      format.json { render json: @obj, status: :created, location: @obj }
    end
  end

  # GET /nodes/find?keywords=<keyword>+<keyword>+...
  def find
    match_phrase = ''
    sep = ''
    params[:keywords].split.each do |keyword|
      match_phrase += sep + "content like '%#{keyword}%'"
      sep = ' and '
    end
    @matches = Node.where(match_phrase).order('updated_at desc')
  end

  # ============================================= HELPERS
  private

  # Insert an existing node into the node
  # hierarchy as the child, successor, or predecessor of the node with id params[:id].
  # The relationship is determined by add_mode: one of 'insert_child', 'insert_successor', 'insert_predecessor'.
  # Specify the id of the node-to-insert with params[:node][:id].
  # For json format, return the inserted node as a json object.
  def insert_node (insert_mode)
    reference_node = Node.find(params[:id])
    if !reference_node
      render_reference_node_error
      return
    end

    node_to_insert = Node.find(params[:node][:id])
    if !node_to_insert
      render_node_to_insert_error
      return
    end

    reference_node.send(insert_mode, node_to_insert)

    respond_to do |format|
      format.json { render json: node_to_insert, status: :created, location: node_to_insert }
    end
  end


  def render_reference_node_error
      render(
        json: {error: "at_node with id #{id} not found"},
        status: :not_found
      )
  end


  def render_node_to_insert_error
      render(
        json: {error: "Unable to find node from ref",
               ref: params[:node]},
        status: :not_found
      )
  end
end

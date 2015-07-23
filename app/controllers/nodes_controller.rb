class NodesController < ApplicationController

  # ============================= Standard Crud
  # GET /nodes
  # GET /nodes.json
  def index
    @objects = Node.all

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
    @obj.parent_id = params[:parent]
    @obj.rank      = params[:rank]

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
  def create
    @obj = Node.new(params[:node])

    respond_to do |format|
      if @obj.save
        format.html { redirect_to interactive_nodes_path, notice: 'Node was successfully created.' }
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
      format.html { redirect_to nodes_url }
      format.json { head :no_content }
    end
  end

  # ======================================== Controller Actions beyond basic crud
  def interactive
    @obj = Top.top
  end


  # /nodes/top
  def top
    @obj = Top.top
    respond_to do |format|
      format.html {render 'show'}
      format.json {render json: @obj}
    end
  end


  def children
    @obj      = Node.find(params[:id])
    @children = @obj.children.order(:rank)

    respond_to do |format|
      format.html
      format.json {render json: @children}
    end
  end


  def add_child
    add_node('add_child')
  end

  def add_successor
    add_node('add_successor')
  end

  def add_predecessor
    add_node('add_predecessor')
  end

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
  # This moves the node and its children under the "Trash" node. They're not really deleted.
  # DELETE /nodes/:id/remove
  def trash
    @obj = Node.find(params[:id])
    @obj.trash() if @obj # TODO: Should render an error here if the node was not found

    respond_to do |format|
      format.html { redirect_to nodes_url }
      format.json { head :no_content }
    end
  end


  # Make back up of the entire information tree.
  def back_up
    Node.back_up
    render js: 'alert("backup saved")'
  end

  def test_me
    respond_to do |format|
      format.html {render inline: "Returning html!"}
      format.js {render js: 'alert("this is a test!");', content_type: 'application/javascript'}
    end
  end

  # ============================================= HELPERS
  private

  # Create a new node, or use an existing one, and insert it into the node
  # hierarchy as the child, successor, or predecessor of the node with id params[:id].
  # The relationship is determined by add_mode: one of 'add_child', 'add_successor', 'add_predecessor'.
  # To create a new node, specify its contents within params[:node][:content].
  # To use an existing node, specify its id with params[:node][:id].
  # For json format, return the child node as a json object.
  def add_node (add_mode)
    reference_node = get_reference_node
    node_to_attach = get_node_to_attach if reference_node
    return unless reference_node && node_to_attach

    reference_node.send(add_mode, node_to_attach)

    respond_to do |format|
      format.json { render json: node_to_attach, status: :created, location: node_to_attach }
    end
  end

  # Find the reference node, which is the node with id params[:id]
  # Render an error if it is not found.
  # This is a helper function for the get_reference_node_and_node_to_attach method.
  def get_reference_node
    reference_node = Node.find(params[:id])

    unless reference_node
      render(
        json: {error: "at_node with id #{id} not found"},
        status: :not_found
      )
    end

    reference_node
  end


  # Find or create the node_to_attach, which is the node specified by params[:node].
  # If params[:node][:id] is specified, the node must exist: find it; otherwise render
  # an error. If params[:node][:id] is not specified, create the node with attributes as
  # specified by params[:node].
  # This is a helper function for the get_reference_node_and_node_to_attach method.
  def get_node_to_attach
    node_to_attach = if params[:node][:id]
                       Node.find(params[:node][:id])
                     else
                       Node.new(params[:node])
                     end

    unless node_to_attach
      render(
        json: {error: "Unable to find or create node from spec",
               spec: params[:node]},
        status: :not_found
      )
    end

    node_to_attach
  end


end

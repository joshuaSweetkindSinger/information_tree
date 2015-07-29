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
    @obj = Node.new(params[:node] || Node.DEFAULT_SPEC)

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


  # GET /nodes/top
  def get_top
    @obj = Top.top
    respond_to do |format|
      format.html {render 'show'}
      format.json {render json: @obj}
    end
  end

  # GET /nodes/trash
  def get_trash
    @obj = Trash.trash
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


  def insert_child
    insert_node('insert_child')
  end

  def insert_successor
    insert_node('insert_successor')
  end

  def insert_predecessor
    insert_node('insert_predecessor')
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

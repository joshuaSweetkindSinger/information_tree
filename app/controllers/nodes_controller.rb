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
    @obj = Node.top # Get specified node, or top node if none specified.
  end

  # /nodes/top
  def top
    @obj = Node.top
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

  # Create a new child text node, or insert an existing one, and make its parent be the one with id params[:id].
  # A new node is spec'd in params[:node]. If an node child, then params[:node][:id] references it.
  # For json format, return the newly created node as a json object.
  def add_child
    parent = Node.find(params[:id])
    return render(json: {error: "Parent with id #{id} not found"}) unless parent

    @obj = parent.add_child(Node.new(params[:node]))

    respond_to do |format|
      format.html { redirect_to interactive_nodes_path, notice: 'Node was successfully created.' }
      format.json { render json: @obj, status: :created, location: @obj }
    end
  end


  # Create a new sibling text node, or insert an existing one, and make its predecessor be the one with id params[:id].
  # A new node is spec'd in params[:node]. If an existing node, then params[:node][:id] references it.
  # For json format, return the newly created node as a json object.
  def add_successor
    node = Node.find(params[:id])
    return render(json: {error: "Node with id #{id} not found"}) unless node

    @obj = node.add_successor(Node.new(params[:node]))

    respond_to do |format|
      format.html { redirect_to interactive_nodes_path, notice: 'Node was successfully created.' }
      format.json { render json: @obj, status: :created, location: @obj }
    end
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
end

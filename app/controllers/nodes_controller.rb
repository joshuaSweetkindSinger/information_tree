class NodesController < ApplicationController

  # ============================= Standard Crud
  # GET /nodes
  # GET /nodes.json
  def index
    @nodes = Node.all

    respond_to do |format|
      format.html # index.html.erb
      format.json { render json: @nodes }
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
    @node = Node.new
    @node.parent_id = params[:parent]
    @node.rank      = params[:rank]

    respond_to do |format|
      format.html # new.html.erb
      format.json { render json: @node }
    end
  end

  # GET /nodes/1/edit
  def edit
    @node = Node.find(params[:id])
  end

  # POST /nodes
  # POST /nodes.json
  def create
    @node = Node.new(params[:node])

    respond_to do |format|
      if @node.save
        format.html { redirect_to interactive_nodes_path, notice: 'Node was successfully created.' }
        format.json { render json: @node, status: :created, location: @node }
      else
        format.html { render action: "new" }
        format.json { render json: @node.errors, status: :unprocessable_entity }
      end
    end
  end

  # PUT /nodes/1
  # PUT /nodes/1.json
  def update
    @node = Node.find(params[:id])

    respond_to do |format|
      if @node.update_attributes(params[:node])
        format.html { redirect_to @node, notice: 'Node was successfully updated.' }
        format.json { head :no_content }
      else
        format.html { render action: "edit" }
        format.json { render json: @node.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /nodes/1
  # DELETE /nodes/1.json
  def destroy
    @node = Node.find(params[:id])
    @node.destroy

    respond_to do |format|
      format.html { redirect_to nodes_url }
      format.json { head :no_content }
    end
  end

  # ======================================== Controller Actions beyond basic crud
  def interactive
    @obj = Node.find(params[:id] || 1) # Get specified node, or top node if none specified.
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

  # Create a child text node whose parent is the one with id params[:id].
  # For json format, return the newly created node as a json object.
  def create_child
    parent = Node.find(params[:id])
    return render(json: {error: "Parent with id #{id} not found"}) unless parent

    @obj = parent.add_child(Node.new(params[:node]))

    respond_to do |format|
      format.html { redirect_to interactive_nodes_path, notice: 'Node was successfully created.' }
      format.json { render json: @obj, status: :created, location: @obj }
    end
  end


  # Create a sibling text node whose predecessor sibling is the one with id params[:id].
  # For json format, return the newly created node as a json object.
  def create_sibling
    node = Node.find(params[:id])
    return render(json: {error: "Node with id #{id} not found"}) unless node

    @obj = node.add_sibling(Node.new(params[:node]))

    respond_to do |format|
      format.html { redirect_to interactive_nodes_path, notice: 'Node was successfully created.' }
      format.json { render json: @obj, status: :created, location: @obj }
    end
  end

  # Set one or more attributes of the object whose id is params[:id].
  # The attributes and their values are passed in as a sub-hash on params[:node], e.g.
  # params = {id: 123, node: {content: "Beautiful Sky", rank: 2}}
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
      %w(content type_id).include?(k)
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
  # TODO: This is really just destroy(). Merge these two someday.
  # /nodes/:id/remove
  def remove
    @obj = Node.find(params[:id])
    # TODO: Should render an error here if the node was not found
    @obj.remove() if @obj

    respond_to do |format|
      format.html { redirect_to nodes_url }
      format.json { head :no_content }
    end
  end
end

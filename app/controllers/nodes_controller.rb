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

  def create_child
    node = params[:node]
    node[:parent_id] = params[:id]
    @obj = Node.new(node)

    puts "***** create_child: Created child from this json: #{node}"

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
end

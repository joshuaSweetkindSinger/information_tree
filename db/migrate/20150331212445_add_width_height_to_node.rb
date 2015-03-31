class AddWidthHeightToNode < ActiveRecord::Migration
  def change
    add_column :nodes, :width, :float
    add_column :nodes, :height, :float
  end
end

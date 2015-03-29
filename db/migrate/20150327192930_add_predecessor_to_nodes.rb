class AddPredecessorToNodes < ActiveRecord::Migration
  def change
    add_column :nodes, :predecessor_id, :integer
    add_index :nodes, :predecessor_id, unique: true

    add_column :nodes, :successor_id, :integer
    add_index :nodes, :successor_id, unique: true

  end
end

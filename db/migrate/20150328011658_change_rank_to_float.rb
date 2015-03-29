class ChangeRankToFloat < ActiveRecord::Migration
  def up
    change_column :nodes, :rank, :float
  end

  def down
    change_column :nodes, :rank, :integer
  end
end

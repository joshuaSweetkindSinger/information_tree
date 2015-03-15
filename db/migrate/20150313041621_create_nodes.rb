class CreateNodes < ActiveRecord::Migration
  def change
    create_table :nodes do |t|
      t.integer :type_id
      t.integer :parent_id
      t.integer :rank
      t.text :content

      t.timestamps
    end
  end
end

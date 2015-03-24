class Node < ActiveRecord::Base
  # TODO -- put these in the database instead
  BULLET = 1 # type_id of this value indicates a bullet item.
  PARAGRAPH = 2 # type_id of this value indicates a paragraph item.

  attr_accessible :content, :parent_id, :rank, :type_id
  belongs_to :parent, class_name: 'Node'
  has_many :children, class_name: 'Node', foreign_key: :parent_id

  def self.top
    where('parent_id is null').order(:id).first
  end


end

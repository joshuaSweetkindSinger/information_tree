class Top < Node
  def self.top
    result = where("type_id = #{TOP_TYPE_ID}").first
    result || _make_top_node
  end

  def self._make_top_node
    result = Top.new(content:'Top', rank:0, width:40, height:20)
    result.type_id = TOP_TYPE_ID
    result.save!
    result
    end
end
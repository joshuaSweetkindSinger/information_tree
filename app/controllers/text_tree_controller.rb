class TextTreeController < ApplicationController
  def text_tree
    render 'text_tree/text_tree', layout: 'text_tree'
  end
end
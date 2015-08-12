class InformationTreePageController < ApplicationController
  def information_tree_page
    render 'information_tree_page/information_tree_page', layout: 'information_tree_layout'
  end
end
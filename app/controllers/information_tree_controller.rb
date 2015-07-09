class InformationTreeController < ApplicationController
  def information_tree
    render 'information_tree/information_tree', layout: 'information_tree'
  end
end
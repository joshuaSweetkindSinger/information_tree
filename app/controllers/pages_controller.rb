class PagesController < ApplicationController
  def index
    render "pages/index"
  end
  def page
    render "pages/#{params[:area]}/#{params[:topic]}"
  end
end

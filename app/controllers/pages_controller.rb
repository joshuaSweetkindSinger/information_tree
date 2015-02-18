class PagesController < ApplicationController
  def page
    name = params[:name] || 'home'
    render "pages/#{name}"
  end
end

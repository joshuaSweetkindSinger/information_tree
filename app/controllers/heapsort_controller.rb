class HeapsortController < ApplicationController
  include HeapsortHelper

  # Present a form allowing the user to enter a list of numbers to be sorted
  def new
  end

  # Sort the comma-separated list of numbers in params[:number_list] and present the results
  def doit
    number_list = params[:number_list].split(',').collect {|s| s.to_f}
    @heap = Heap.new(number_list)
    @sorted = @heap.sort
  end


end
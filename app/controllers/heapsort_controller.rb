class HeapsortController < ApplicationController
  include HeapsortHelper

  # Present a form allowing the user to enter a list of numbers to be sorted
  def new
    @input = params[:input] || ""
  end

  # Sort the comma-separated list of numbers in params[:number_list] and present the results
  def doit
    @errors = []
    @input = params[:input]

    # Check input for non-numeric entries.
    numbers = @input.split(',').collect do |s|
      begin
        Float(s)
      rescue
        @errors.push("#{s} is not a number")
      end
    end

    # Input is valid--sort it and show results
    if @errors.empty?
      @sorted = Heap.new(numbers).sort
      render 'doit'

    # Input is invalid--re-render input form.
    else
      render 'new'
    end
  end


end
JssNotes::Application.routes.draw do

  resources :nodes do
    collection do
      get :interactive
      get :top, to: :get_top
      get :trash, to: :get_trash
      post :back_up
      get :test_me
    end

    member do
      get    :children        # route is /nodes/:id/children
      put    :insert_child       # route is /nodes/:id/insert_child
      put    :insert_successor   # route is /nodes/:id/insert_successor
      put    :insert_predecessor # route is /nodes/:id/insert_predecessor
      put    :set_attributes  # route is /nodes/:id/set_attributes
      delete :trash           # route is /nodes/:id/trash
    end
  end

  root to: 'information_tree#information_tree'
  match '/pages', via: :get, to: 'pages#index'
  match '/page(/:area(/:topic))', via: :get, to: 'pages#page', defaults: {topic: 'index'}
  match '/information_tree', via: :get, to: 'information_tree#information_tree'
  match 'heapsort/new', via: :get, to: 'heapsort#new', as: :new_heapsort
  match 'heapsort/doit', via: :get, to: 'heapsort#doit', as: :do_heapsort


  # The priority is based upon order of creation:
  # first created -> highest priority.

  # Sample of regular route:
  #   match 'products/:id' => 'catalog#view'
  # Keep in mind you can assign values other than :controller and :action

  # Sample of named route:
  #   match 'products/:id/purchase' => 'catalog#purchase', :as => :purchase
  # This route can be invoked with purchase_url(:id => product.id)

  # Sample resource route (maps HTTP verbs to controller actions automatically):
  #   resources :products

  # Sample resource route with options:
  #   resources :products do
  #     member do
  #       get 'short'
  #       post 'toggle'
  #     end
  #
  #     collection do
  #       get 'sold'
  #     end
  #   end

  # Sample resource route with sub-resources:
  #   resources :products do
  #     resources :comments, :sales
  #     resource :seller
  #   end

  # Sample resource route with more complex sub-resources
  #   resources :products do
  #     resources :comments
  #     resources :sales do
  #       get 'recent', :on => :collection
  #     end
  #   end

  # Sample resource route within a namespace:
  #   namespace :admin do
  #     # Directs /admin/products/* to Admin::ProductsController
  #     # (app/controllers/admin/products_controller.rb)
  #     resources :products
  #   end

  # You can have the root of your site routed with "root"
  # just remember to delete public/index.html.
  # root :to => 'welcome#index'

  # See how all your routes lay out with "rake routes"

  # This is a legacy wild controller route that's not recommended for RESTful applications.
  # Note: This route will make all actions in every controller accessible via GET requests.
  # match ':controller(/:action(/:id))(.:format)'
end

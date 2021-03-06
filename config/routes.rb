JssNotes::Application.routes.draw do

  resources :nodes do
    collection do
      get :roots                       # /nodes/roots
      get :basket                      # /nodes/basket
      get :show_broken                 # /nodes/show_broken_nodes
      get :test_me
      get :import, to: :show_import_form
      get :top                         # /nodes/top
      get :find                        # /nodes/find -- Find all nodes whose content matches specified keywords in the query string.
      get :find_form                   # /nodes/find_form

      post :import

      delete :basket, to: :empty_basket  # /nodes/basket -> NodesController.empty_basket()
    end

    member do
      get    :children           # route is /nodes/:id/children
      post   :add_child          # route is /nodes/:id/add_child
      post   :add_successor      # route is /nodes/:id/add_successor
      post   :add_predecessor    # route is /nodes/:id/add_predecessor
      put    :insert_child       # route is /nodes/:id/insert_child
      put    :insert_successor   # route is /nodes/:id/insert_successor
      put    :insert_predecessor # route is /nodes/:id/insert_predecessor
      put    :set_attributes     # route is /nodes/:id/set_attributes
      put    :put_in_basket      # route is /nodes/:id/put_in_basket
      put    :paste_child        # route is /nodes/:id/paste_child
      put    :paste_successor    # route is /nodes/:id/paste_successor
      put    :paste_predecessor  # route is /nodes/:id/paste_predecessor
      put    :repair_children    # route is /nodes/:id/repair_children
      delete :destroy_empty      # route is /nodes/:id/destroy_empty
    end
  end

  get '/', to: redirect('/information-tree')
  match '/information-tree', via: :get, to: 'information_tree_page#information_tree_page'
  match '/nodes/:id/recursive/(:max_depth)', via: :get, to: 'nodes#render_recursively'


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

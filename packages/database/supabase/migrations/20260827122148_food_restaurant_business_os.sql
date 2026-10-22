-- Food & Restaurant OS uses existing operational modules. Recipe metadata is
-- tenant-owned configuration; inventory remains governed by immutable movements.

insert into public.business_os_templates (
  key,name,description,industry_code,version,manifest,status,category,minimum_plan,icon
) values (
  'food-restaurant-os',
  'Food & Restaurant OS',
  'POS, menu catalog, ingredient inventory, customers, expenses, purchasing, employees, recipes, and wastage visibility for food businesses.',
  'food-restaurant',
  1,
  '{}',
  'published',
  'food-service',
  'growth',
  'utensils'
)
on conflict (key) do nothing;

insert into public.business_os_template_versions (
  template_id,version,definition,change_summary,status,published_at
)
select
  template.id,
  1,
  $definition$
  {
    "terminology": {
      "product":"Menu Item",
      "products":"Menu Items",
      "inventory":"Ingredient Inventory",
      "customer":"Customer",
      "customers":"Customers",
      "employee":"Team Member",
      "employees":"Team Members",
      "purchase_order":"Supplier Order",
      "purchase_orders":"Supplier Orders"
    },
    "modules": [
      {"key":"sales","config":{"default_tax_rate":12}},
      {"key":"product_catalog","config":{"default_unit":"piece","default_tax_rate":12}},
      {"key":"inventory","config":{"allow_negative_stock":false,"low_stock_threshold":5}},
      {"key":"crm","config":{}},
      {"key":"expenses","config":{"approval_threshold":0}},
      {"key":"pos","config":{"receipt_footer":"Salamat po!"}},
      {"key":"purchasing","config":{}},
      {"key":"employees","config":{"employee_number_prefix":"TEAM"}}
    ],
    "objects": [
      {
        "key":"recipe",
        "singularLabel":"Recipe",
        "pluralLabel":"Recipes",
        "description":"Configurable preparation definition for a menu item. This metadata does not replace the Product Catalog or Inventory ledger.",
        "fields":[
          {"key":"recipe_code","label":"Recipe Code","dataType":"text","required":true,"unique":true,"sortOrder":0,"config":{"placeholder":"REC-001","helpText":"Stable reference used by recipe ingredients.","options":[],"validation":{"maxLength":40},"visibility":"visible","readOnly":false}},
          {"key":"name","label":"Recipe Name","dataType":"text","required":true,"unique":false,"sortOrder":1,"config":{"options":[],"validation":{"maxLength":160},"visibility":"visible","readOnly":false}},
          {"key":"menu_item_sku","label":"Menu Item SKU","dataType":"text","required":true,"unique":false,"sortOrder":2,"config":{"helpText":"References an existing Product Catalog SKU without copying the menu item.","options":[],"validation":{"maxLength":80},"visibility":"visible","readOnly":false}},
          {"key":"yield_quantity","label":"Yield Quantity","dataType":"decimal","required":true,"unique":false,"sortOrder":3,"config":{"defaultValue":1,"options":[],"validation":{"minimum":0.0001},"visibility":"visible","readOnly":false}},
          {"key":"yield_unit","label":"Yield Unit","dataType":"select","required":true,"unique":false,"sortOrder":4,"config":{"defaultValue":"serving","options":[{"value":"serving","label":"Serving"},{"value":"piece","label":"Piece"},{"value":"batch","label":"Batch"},{"value":"tray","label":"Tray"}],"validation":{},"visibility":"visible","readOnly":false}},
          {"key":"instructions","label":"Preparation Notes","dataType":"textarea","required":false,"unique":false,"sortOrder":5,"config":{"options":[],"validation":{"maxLength":5000},"visibility":"visible","readOnly":false}},
          {"key":"status","label":"Status","dataType":"status","required":true,"unique":false,"sortOrder":6,"config":{"defaultValue":"draft","options":[{"value":"draft","label":"Draft"},{"value":"active","label":"Active"},{"value":"inactive","label":"Inactive"}],"validation":{},"visibility":"visible","readOnly":false}}
        ],
        "forms":[
          {"key":"recipe_form","name":"Recipe Form","description":"Define recipe identity, yield, and preparation notes.","mode":"create","sections":[{"key":"recipe_details","title":"Recipe Details","description":"Link the recipe to an existing menu item SKU.","columns":2,"fieldKeys":["recipe_code","name","menu_item_sku","yield_quantity","yield_unit","status"]},{"key":"preparation","title":"Preparation","description":"Optional preparation guidance; not a kitchen display ticket.","columns":1,"fieldKeys":["instructions"]}]}
        ],
        "views":[
          {"key":"active_recipes","name":"Active Recipes","description":"Active menu recipes.","viewType":"table","selectedColumns":["recipe_code","name","menu_item_sku","yield_quantity","yield_unit","status"],"filters":{"logic":"all","filters":[{"fieldKey":"status","operator":"equals","value":"active"}]},"configuration":{"sorting":[{"fieldKey":"name","direction":"asc"}],"savedFilters":[],"search":{"enabled":true,"fieldKeys":["recipe_code","name","menu_item_sku"],"placeholder":"Search recipes"},"pagination":{"pageSize":25},"branchFiltering":{"enabled":false,"required":false}}}
        ]
      },
      {
        "key":"recipe_ingredient",
        "singularLabel":"Recipe Ingredient",
        "pluralLabel":"Recipe Ingredients",
        "description":"Ingredient quantity metadata for a recipe. Actual stock changes continue through immutable Inventory movements.",
        "fields":[
          {"key":"recipe_code","label":"Recipe Code","dataType":"text","required":true,"unique":false,"sortOrder":0,"config":{"helpText":"Matches an existing Recipe Code.","options":[],"validation":{"maxLength":40},"visibility":"visible","readOnly":false}},
          {"key":"ingredient_sku","label":"Ingredient SKU","dataType":"text","required":true,"unique":false,"sortOrder":1,"config":{"helpText":"References an existing inventory Product Catalog SKU.","options":[],"validation":{"maxLength":80},"visibility":"visible","readOnly":false}},
          {"key":"quantity","label":"Quantity per Yield","dataType":"decimal","required":true,"unique":false,"sortOrder":2,"config":{"options":[],"validation":{"minimum":0.0001},"visibility":"visible","readOnly":false}},
          {"key":"unit","label":"Unit","dataType":"select","required":true,"unique":false,"sortOrder":3,"config":{"options":[{"value":"piece","label":"Piece"},{"value":"gram","label":"Gram"},{"value":"kg","label":"Kilogram"},{"value":"milliliter","label":"Milliliter"},{"value":"liter","label":"Liter"},{"value":"pack","label":"Pack"}],"validation":{},"visibility":"visible","readOnly":false}},
          {"key":"wastage_allowance","label":"Wastage Allowance (%)","dataType":"percentage","required":false,"unique":false,"sortOrder":4,"config":{"defaultValue":0,"options":[],"validation":{"minimum":0,"maximum":100},"visibility":"visible","readOnly":false}},
          {"key":"consumption_stage","label":"Consumption Stage","dataType":"select","required":true,"unique":false,"sortOrder":5,"config":{"defaultValue":"manual","helpText":"Architecture placeholder only; automatic recipe consumption is not enabled by this template.","options":[{"value":"manual","label":"Manual"},{"value":"on_sale","label":"On Completed Sale"},{"value":"on_production","label":"On Production"}],"validation":{},"visibility":"visible","readOnly":false}},
          {"key":"status","label":"Status","dataType":"status","required":true,"unique":false,"sortOrder":6,"config":{"defaultValue":"active","options":[{"value":"active","label":"Active"},{"value":"inactive","label":"Inactive"}],"validation":{},"visibility":"visible","readOnly":false}}
        ],
        "forms":[
          {"key":"recipe_ingredient_form","name":"Recipe Ingredient Form","description":"Associate ingredient quantities with a recipe reference.","mode":"create","sections":[{"key":"ingredient_details","title":"Ingredient Details","description":"References existing recipe and inventory SKUs.","columns":2,"fieldKeys":["recipe_code","ingredient_sku","quantity","unit","wastage_allowance","consumption_stage","status"]}]}
        ],
        "views":[
          {"key":"recipe_ingredients","name":"Recipe Ingredients","description":"Ingredient requirements grouped by recipe reference.","viewType":"table","selectedColumns":["recipe_code","ingredient_sku","quantity","unit","wastage_allowance","consumption_stage","status"],"filters":{"logic":"all","filters":[{"fieldKey":"status","operator":"equals","value":"active"}]},"configuration":{"sorting":[{"fieldKey":"recipe_code","direction":"asc"},{"fieldKey":"ingredient_sku","direction":"asc"}],"savedFilters":[],"search":{"enabled":true,"fieldKeys":["recipe_code","ingredient_sku"],"placeholder":"Search recipe ingredients"},"pagination":{"pageSize":50},"branchFiltering":{"enabled":false,"required":false}}}
        ]
      }
    ],
    "workflows": [],
    "permissions": [
      {"roleKey":"manager","permissionKeys":["metadata.read","record.read","record.create","record.update"]}
    ],
    "dashboards": [
      {
        "key":"food_restaurant_overview",
        "name":"Food & Restaurant Overview",
        "description":"Daily restaurant sales, transactions, ticket size, menu performance, inventory warnings, expenses, and wastage.",
        "layoutConfig":{"columns":12,"widgets":[
          {"key":"today_sales","reportKey":"restaurant_today_sales","title":"Today's Sales","visualization":"metric","x":0,"y":0,"w":3,"h":2},
          {"key":"transactions","reportKey":"restaurant_transactions","title":"Transactions","visualization":"metric","x":3,"y":0,"w":3,"h":2},
          {"key":"average_ticket","reportKey":"restaurant_average_ticket","title":"Average Ticket","visualization":"metric","x":6,"y":0,"w":3,"h":2},
          {"key":"expenses","reportKey":"restaurant_expenses","title":"Expenses","visualization":"metric","x":9,"y":0,"w":3,"h":2},
          {"key":"top_menu_items","reportKey":"top_menu_items","title":"Top Menu Items","visualization":"bar","x":0,"y":2,"w":6,"h":4},
          {"key":"food_inventory_warnings","reportKey":"food_inventory_warnings","title":"Food Inventory Warnings","visualization":"table","x":6,"y":2,"w":6,"h":4},
          {"key":"wastage","reportKey":"restaurant_wastage","title":"Wastage","visualization":"table","x":0,"y":6,"w":12,"h":4}
        ]}
      }
    ],
    "reports": [
      {"key":"restaurant_today_sales","name":"Today's Sales","description":"Completed POS sales for the current business day.","queryConfig":{"provider":"core_report","reportType":"sales_summary","datePreset":"today","statuses":["completed"]},"visualizationConfig":{"type":"metric","format":"currency","currency":"PHP"}},
      {"key":"restaurant_transactions","name":"Transactions","description":"Completed transaction count today.","queryConfig":{"provider":"core_report","reportType":"sales_transaction_count","datePreset":"today","statuses":["completed"]},"visualizationConfig":{"type":"metric","format":"number"}},
      {"key":"restaurant_average_ticket","name":"Average Ticket","description":"Average completed transaction value today.","queryConfig":{"provider":"core_report","reportType":"sales_average_ticket","datePreset":"today","statuses":["completed"]},"visualizationConfig":{"type":"metric","format":"currency","currency":"PHP"}},
      {"key":"top_menu_items","name":"Top Menu Items","description":"Best-selling Product Catalog menu items by completed quantity.","queryConfig":{"provider":"core_report","reportType":"top_products","datePreset":"today","metric":"quantity","statuses":["completed"],"limit":10},"visualizationConfig":{"type":"bar","format":"number"}},
      {"key":"food_inventory_warnings","name":"Food Inventory Warnings","description":"Ingredient stock at or below configured reorder levels.","queryConfig":{"provider":"core_report","reportType":"inventory_low_stock","thresholdSource":"inventory_configuration"},"visualizationConfig":{"type":"table","pageSize":10}},
      {"key":"restaurant_expenses","name":"Expenses","description":"Restaurant expenses for the current business day.","queryConfig":{"provider":"core_report","reportType":"expense_summary","datePreset":"today","statuses":["draft","pending","approved","paid"]},"visualizationConfig":{"type":"metric","format":"currency","currency":"PHP"}},
      {"key":"restaurant_wastage","name":"Wastage","description":"Immutable inventory movements recorded with the existing wastage movement type.","queryConfig":{"provider":"core_report","reportType":"inventory_movements","movementTypes":["wastage"],"datePreset":"today"},"visualizationConfig":{"type":"table","pageSize":10}}
    ],
    "settings": {
      "locale":"en-PH",
      "dateFormat":"MM/dd/yyyy",
      "weekStartsOn":1,
      "fiscalYearStartMonth":1,
      "restaurantOperations": {
        "menuItemSource":"product_catalog",
        "ingredientInventorySource":"inventory",
        "recipeObjectKey":"recipe",
        "recipeIngredientObjectKey":"recipe_ingredient",
        "ingredientConsumption":{"mode":"manual","futureModes":["on_sale","on_production"],"stockLedger":"immutable_movements"},
        "wastage":{"movementType":"wastage","source":"inventory"},
        "kitchenDisplay":{"enabled":false,"implementationStatus":"not_implemented"}
      }
    }
  }
  $definition$::jsonb,
  'Initial Food & Restaurant OS with recipe metadata and core-backed restaurant operations',
  'published',
  now()
from public.business_os_templates template
where template.key='food-restaurant-os'
on conflict (template_id,version) do nothing;

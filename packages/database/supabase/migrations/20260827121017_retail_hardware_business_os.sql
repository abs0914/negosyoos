-- Retail & Hardware OS is configuration only. Core modules retain ownership of
-- sales, inventory, approvals, purchasing, receivables, and delivery behavior.

update public.business_os_templates
set name = 'Retail & Hardware OS',
    description = 'Counter sales, stock, credit customers, purchasing, quotations, receivables, expenses, and delivery for Philippine retail and hardware businesses.',
    industry_code = 'retail-hardware',
    category = 'retail',
    minimum_plan = 'growth',
    icon = 'warehouse',
    updated_at = now()
where key = 'retail-store-os';

insert into public.business_os_template_versions (
  template_id,
  version,
  definition,
  change_summary,
  status,
  published_at
)
select
  template.id,
  2,
  $definition$
  {
    "terminology": {
      "contractor": "Contractor",
      "contractors": "Contractors",
      "credit_customer": "Credit Customer",
      "credit_customers": "Credit Customers",
      "quotation": "Sales Quotation",
      "quotations": "Sales Quotations",
      "delivery": "Delivery Order",
      "deliveries": "Delivery Orders"
    },
    "modules": [
      {"key":"sales","config":{"default_tax_rate":12}},
      {"key":"product_catalog","config":{"default_unit":"piece","default_tax_rate":12}},
      {"key":"inventory","config":{"allow_negative_stock":false,"low_stock_threshold":5}},
      {"key":"crm","config":{}},
      {"key":"expenses","config":{"approval_threshold":0}},
      {"key":"pos","config":{"receipt_footer":"Salamat po!"}},
      {"key":"purchasing","config":{}},
      {"key":"quotations","config":{"validity_days":30,"discount_approval_percentage":10,"discount_approver_role":"manager"}},
      {"key":"invoicing","config":{"payment_terms_days":30}},
      {"key":"delivery","config":{"require_proof_of_delivery":true,"default_courier_provider":"internal"}}
    ],
    "objects": [],
    "workflows": [
      {
        "key": "quotation_discount_manager_approval",
        "name": "Discount above 10% requires manager approval",
        "description": "Visual policy definition bound to the quotation module's existing discount approval configuration. It is not independently executed, preventing duplicate approval requests.",
        "trigger": {"type":"manual"},
        "conditions": {"logic":"all","conditions":[{"fieldKey":"discount_percentage","operator":"greater_than","value":10}]},
        "actions": [{"key":"request_manager_approval","name":"Request manager approval","type":"request_approval","continueOnFailure":false,"category":"discount","approverRoleKey":"manager","title":"Approve sales quotation discount","message":"Review a sales quotation discount above 10%."}],
        "retryPolicy": {"maxAttempts":3,"backoffSeconds":60},
        "status": "disabled",
        "policyBinding": {
          "moduleKey": "quotations",
          "thresholdConfigKey": "discount_approval_percentage",
          "approverConfigKey": "discount_approver_role",
          "executionOwner": "quotation_module"
        }
      }
    ],
    "permissions": [],
    "dashboards": [
      {
        "key": "retail_hardware_overview",
        "name": "Retail & Hardware Overview",
        "description": "Daily sales, margin, stock, receivables, quotations, deliveries, and product performance.",
        "layoutConfig": {
          "columns": 12,
          "widgets": [
            {"key":"today_sales","reportKey":"today_sales","title":"Today's Sales","visualization":"metric","x":0,"y":0,"w":3,"h":2},
            {"key":"gross_margin","reportKey":"gross_margin","title":"Gross Margin","visualization":"metric","x":3,"y":0,"w":3,"h":2},
            {"key":"inventory_value","reportKey":"inventory_value","title":"Inventory Value","visualization":"metric","x":6,"y":0,"w":3,"h":2},
            {"key":"receivables","reportKey":"receivables","title":"Receivables","visualization":"metric","x":9,"y":0,"w":3,"h":2},
            {"key":"low_stock","reportKey":"low_stock","title":"Low Stock","visualization":"table","x":0,"y":2,"w":6,"h":4},
            {"key":"pending_quotations","reportKey":"pending_quotations","title":"Pending Sales Quotations","visualization":"table","x":6,"y":2,"w":3,"h":4},
            {"key":"pending_deliveries","reportKey":"pending_deliveries","title":"Pending Delivery Orders","visualization":"table","x":9,"y":2,"w":3,"h":4},
            {"key":"top_products","reportKey":"top_products","title":"Top Products","visualization":"bar","x":0,"y":6,"w":12,"h":4}
          ]
        }
      }
    ],
    "reports": [
      {
        "key":"today_sales",
        "name":"Today's Sales",
        "description":"Completed sales for the current business day.",
        "queryConfig":{"provider":"core_report","reportType":"sales_summary","datePreset":"today","statuses":["completed"]},
        "visualizationConfig":{"type":"metric","format":"currency","currency":"PHP"}
      },
      {
        "key":"gross_margin",
        "name":"Gross Margin",
        "description":"Revenue less recorded cost for completed sales today.",
        "queryConfig":{"provider":"core_report","reportType":"sales_gross_margin","datePreset":"today","statuses":["completed"]},
        "visualizationConfig":{"type":"metric","format":"currency","currency":"PHP"}
      },
      {
        "key":"low_stock",
        "name":"Low Stock",
        "description":"Products at or below their configured reorder level.",
        "queryConfig":{"provider":"core_report","reportType":"inventory_low_stock","thresholdSource":"inventory_configuration"},
        "visualizationConfig":{"type":"table","pageSize":10}
      },
      {
        "key":"inventory_value",
        "name":"Inventory Value",
        "description":"Current stock valuation from immutable movements and safely materialized balances.",
        "queryConfig":{"provider":"core_report","reportType":"inventory_value","valuationMethod":"configured"},
        "visualizationConfig":{"type":"metric","format":"currency","currency":"PHP"}
      },
      {
        "key":"receivables",
        "name":"Receivables",
        "description":"Open customer receivables from issued invoices.",
        "queryConfig":{"provider":"core_report","reportType":"receivables_summary","statuses":["issued","partially_paid","overdue"]},
        "visualizationConfig":{"type":"metric","format":"currency","currency":"PHP"}
      },
      {
        "key":"pending_quotations",
        "name":"Pending Sales Quotations",
        "description":"Draft and sent sales quotations awaiting an outcome.",
        "queryConfig":{"provider":"core_report","reportType":"quotation_pipeline","statuses":["draft","sent"]},
        "visualizationConfig":{"type":"table","pageSize":10}
      },
      {
        "key":"pending_deliveries",
        "name":"Pending Delivery Orders",
        "description":"Delivery orders not yet delivered, failed, or cancelled.",
        "queryConfig":{"provider":"core_report","reportType":"delivery_pipeline","statuses":["pending","scheduled","assigned","out_for_delivery"]},
        "visualizationConfig":{"type":"table","pageSize":10}
      },
      {
        "key":"top_products",
        "name":"Top Products",
        "description":"Best-selling products by completed quantity for the selected period.",
        "queryConfig":{"provider":"core_report","reportType":"top_products","metric":"quantity","statuses":["completed"],"limit":10},
        "visualizationConfig":{"type":"bar","format":"number"}
      }
    ],
    "settings": {
      "locale":"en-PH",
      "dateFormat":"MM/dd/yyyy",
      "weekStartsOn":1,
      "fiscalYearStartMonth":1
    }
  }
  $definition$::jsonb,
  'Retail & Hardware configuration with core module bindings, operating dashboard, terminology, and discount approval policy',
  'published',
  now()
from public.business_os_templates template
where template.key = 'retail-store-os'
on conflict (template_id, version) do nothing;

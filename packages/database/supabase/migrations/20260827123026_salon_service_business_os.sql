-- Salon & Service OS is the second published version of the stable service
-- template identity. All operational behavior remains in existing modules.

update public.business_os_templates
set name='Salon & Service OS',
    description='Client relationships, bookings, service tickets, sales, services and retail products, staff, rewards, and expenses for salons and service businesses.',
    industry_code='salon-service',
    category='services',
    minimum_plan='pro',
    icon='scissors',
    updated_at=now()
where key='service-business-os';

insert into public.business_os_template_versions(
  template_id,version,definition,change_summary,status,published_at
)
select
  template.id,
  2,
  $definition$
  {
    "terminology": {
      "customer":"Client",
      "customers":"Clients",
      "appointment":"Booking",
      "appointments":"Bookings",
      "job_order":"Service Ticket",
      "job_orders":"Service Tickets",
      "product":"Service & Retail Item",
      "products":"Services & Retail Items",
      "employee":"Staff Member",
      "employees":"Staff",
      "loyalty_points":"Reward Points",
      "sale":"Service Sale",
      "sales":"Service Sales"
    },
    "modules": [
      {"key":"sales","config":{"default_tax_rate":12}},
      {"key":"product_catalog","config":{"default_unit":"piece","default_tax_rate":12}},
      {"key":"inventory","config":{"allow_negative_stock":false,"low_stock_threshold":0}},
      {"key":"crm","config":{}},
      {"key":"expenses","config":{"approval_threshold":0}},
      {"key":"employees","config":{"employee_number_prefix":"STAFF"}},
      {"key":"appointments","config":{"slot_minutes":30,"prevent_staff_conflicts":true,"prevent_customer_conflicts":false}},
      {"key":"job_orders","config":{"singular_label":"Service Ticket","plural_label":"Service Tickets","consume_inventory":false,"consumption_trigger":"manual"}},
      {"key":"loyalty","config":{"points_label":"Reward Points","automatic_sale_awards":true}}
    ],
    "objects": [],
    "workflows": [],
    "permissions": [],
    "dashboards": [
      {
        "key":"salon_service_overview",
        "name":"Salon & Service Overview",
        "description":"Today's bookings, revenue, completed services, staff utilization, client behavior, retention, and sales.",
        "layoutConfig":{"columns":12,"widgets":[
          {"key":"today_appointments","reportKey":"today_appointments","title":"Today's Bookings","visualization":"metric","x":0,"y":0,"w":3,"h":2},
          {"key":"expected_revenue","reportKey":"expected_revenue","title":"Expected Revenue","visualization":"metric","x":3,"y":0,"w":3,"h":2},
          {"key":"completed_services","reportKey":"completed_services","title":"Completed Services","visualization":"metric","x":6,"y":0,"w":3,"h":2},
          {"key":"sales","reportKey":"salon_sales","title":"Sales","visualization":"metric","x":9,"y":0,"w":3,"h":2},
          {"key":"staff_utilization","reportKey":"staff_utilization","title":"Staff Utilization","visualization":"bar","x":0,"y":2,"w":6,"h":4},
          {"key":"repeat_customers","reportKey":"repeat_customers","title":"Repeat Clients","visualization":"metric","x":6,"y":2,"w":3,"h":4},
          {"key":"customer_retention","reportKey":"customer_retention","title":"Client Retention","visualization":"metric","x":9,"y":2,"w":3,"h":4}
        ]}
      }
    ],
    "reports": [
      {"key":"today_appointments","name":"Today's Bookings","description":"Bookings scheduled for the current business day.","queryConfig":{"provider":"core_report","reportType":"appointment_count","datePreset":"today","statuses":["scheduled","confirmed","arrived","in_progress","completed"]},"visualizationConfig":{"type":"metric","format":"number"}},
      {"key":"expected_revenue","name":"Expected Revenue","description":"Expected service revenue from today's non-cancelled bookings using Product Catalog prices.","queryConfig":{"provider":"core_report","reportType":"appointment_expected_revenue","datePreset":"today","statuses":["scheduled","confirmed","arrived","in_progress","completed"],"priceSource":"product_catalog"},"visualizationConfig":{"type":"metric","format":"currency","currency":"PHP"}},
      {"key":"completed_services","name":"Completed Services","description":"Services completed today from booking and service-ticket activity.","queryConfig":{"provider":"core_report","reportType":"completed_services","datePreset":"today","appointmentStatuses":["completed"],"jobOrderStatuses":["completed","released"]},"visualizationConfig":{"type":"metric","format":"number"}},
      {"key":"staff_utilization","name":"Staff Utilization","description":"Booked service minutes compared with available staff schedule minutes.","queryConfig":{"provider":"core_report","reportType":"appointment_staff_utilization","datePreset":"today","staffSource":"employees"},"visualizationConfig":{"type":"bar","format":"percentage"}},
      {"key":"repeat_customers","name":"Repeat Clients","description":"Clients with more than one completed visit in the selected period.","queryConfig":{"provider":"core_report","reportType":"crm_repeat_customers","periodPreset":"rolling_90_days","minimumVisits":2},"visualizationConfig":{"type":"metric","format":"number"}},
      {"key":"customer_retention","name":"Client Retention","description":"Returning clients as a percentage of active clients in the selected period.","queryConfig":{"provider":"core_report","reportType":"crm_customer_retention","periodPreset":"rolling_90_days"},"visualizationConfig":{"type":"metric","format":"percentage"}},
      {"key":"salon_sales","name":"Sales","description":"Completed service and retail sales today.","queryConfig":{"provider":"core_report","reportType":"sales_summary","datePreset":"today","statuses":["completed"]},"visualizationConfig":{"type":"metric","format":"currency","currency":"PHP"}}
    ],
    "settings": {
      "locale":"en-PH",
      "dateFormat":"MM/dd/yyyy",
      "weekStartsOn":1,
      "fiscalYearStartMonth":1,
      "salonServiceOperations": {
        "primaryScheduleSource":"appointments",
        "serviceCatalogSource":"product_catalog",
        "staffSource":"employees",
        "customerSource":"crm",
        "serviceTicketSource":"job_orders",
        "inventorySupport":{"enabledAsJobOrderDependency":true,"automaticConsumption":false}
      }
    }
  }
  $definition$::jsonb,
  'Salon & Service configuration with bookings, service tickets, staff, loyalty, and operating dashboard',
  'published',
  now()
from public.business_os_templates template
where template.key='service-business-os'
on conflict(template_id,version) do nothing;

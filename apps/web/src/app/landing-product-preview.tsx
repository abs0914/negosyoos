"use client";

import { useState } from "react";
import { Icon } from "@negosyo-os/ui";

const steps = [
  { title: "Spot the shortage", description: "An inventory alert brings a low-stock item to your attention.", icon: "inventory" },
  { title: "Review the item", description: "Check the quantity on hand and the reorder level before deciding what to buy.", icon: "search" },
  { title: "Prepare the reorder", description: "Create a draft purchase order for review before placing it with your supplier.", icon: "purchasing" },
] as const;

export function LandingProductPreview() {
  const [active, setActive] = useState(0);

  function selectStep(index: number) {
    setActive(index);
    document.getElementById(`workflow-tab-${index}`)?.focus();
  }

  return (
    <div className="workflow-demo">
      <div className="workflow-tabs" role="tablist" aria-label="Sample restocking workflow" onKeyDown={(event) => {
        const directions: Record<string, number> = { ArrowRight: (active + 1) % steps.length, ArrowLeft: (active + steps.length - 1) % steps.length, Home: 0, End: steps.length - 1 };
        const index = directions[event.key];
        if (index !== undefined) { event.preventDefault(); selectStep(index); }
      }}>
        {steps.map((step, index) => (
          <button type="button" role="tab" id={`workflow-tab-${index}`} aria-controls={`workflow-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} key={step.title} onClick={() => setActive(index)}>
            <span className="workflow-step-number">0{index + 1}</span><span><strong>{step.title}</strong><span className="workflow-step-description">{step.description}</span></span><Icon name="chevron-right" size={18} />
          </button>
        ))}
      </div>
      <div className="workflow-stage">
        <div className="workflow-stage-header"><span><Icon name="business" size={17} /> Sampaguita Home Supply</span><span>Interactive example</span></div>
        {steps.map((step, index) => (
          <div role="tabpanel" id={`workflow-panel-${index}`} aria-labelledby={`workflow-tab-${index}`} hidden={active !== index} tabIndex={0} key={step.title} className="workflow-panel">
            <div className="workflow-panel-content">
              <p className="design-label"><Icon name={step.icon} size={16} /> {index === 2 ? "Purchasing / Draft order" : "Inventory / Main branch"}</p>
              <h3>{index === 0 ? "Time to check your shelves." : index === 1 ? "A closer look at your stock." : "Ready for your review."}</h3>
              {index === 0 ? <div className="stock-alert"><span className="stock-status">Low stock</span><h4>Interior paint · White · 4L</h4><div className="stock-quantities"><div><strong>2</strong><span>cans on hand</span></div><div><strong>10</strong><span>reorder level</span></div></div><p>Stock has fallen below the level set for this item.</p></div> : null}
              {index === 1 ? <dl className="stock-details"><div><dt>Item</dt><dd>Interior paint · White · 4L</dd></div><div><dt>Location</dt><dd>Main branch</dd></div><div><dt>On hand</dt><dd>2 cans</dd></div><div><dt>Reorder level</dt><dd>10 cans</dd></div><div><dt>Example order quantity</dt><dd>12 cans</dd></div></dl> : null}
              {index === 2 ? <div className="purchase-draft"><div><span className="draft-stamp">DRAFT</span><span>Example purchase order</span></div><h4>Interior paint · White · 4L</h4><dl><div><dt>Quantity</dt><dd>12 cans</dd></div><div><dt>Example unit cost</dt><dd>₱650</dd></div><div className="draft-total"><dt>Item subtotal</dt><dd>₱7,800</dd></div></dl><p><Icon name="approvals" size={17} /> Review the supplier, price, and quantity before placing the order.</p></div> : null}
              <div className="workflow-panel-bottom"><p>{index === 2 ? "The owner decides what happens next." : "Select the next step to continue the example."}</p>{index < 2 ? <button className="site-button" type="button" onClick={() => selectStep(index + 1)}>{index === 0 ? "Review this item" : "See draft order"}<Icon name="chevron-right" size={16} /></button> : <button className="site-text-link" type="button" onClick={() => selectStep(0)}>Replay example <span aria-hidden="true">↺</span></button>}</div>
            </div>
          </div>
        ))}
        <p className="workflow-disclaimer">Illustrative data and workflow. Exploring this example creates no business records.</p>
      </div>
    </div>
  );
}

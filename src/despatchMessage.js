/* Returns & exchanges wording for the "ready to despatch" WhatsApp message — one version per shop.
   Used by SalesPanel.jsx and DispatchPanel.jsx so both send exactly the same text.
   To change a policy (numbers, charges, wording) edit it here, once. */

const RULE = "━━━━━━━━━━━━━━━━━━";

const COMMON_TOP = (contact) => `*↩️ RETURNS & EXCHANGES*

• Please inform us **within 2 days** if you wish to return the item. Requests made later will be difficult to approve.
• All return requests must be made via our WhatsApp number ${contact}. All other forms of request may not be accepted.
• Return shipping and any associated charges are the liability of the buyer.
• You can return the item for a **full refund** if it is damaged or was received in poor condition.`;

const POLICIES = {
  "ros-selections": `${COMMON_TOP("**+44 77 47 814 888**")}
• All other returns are refundable after deducting a small charge of **£2.99**, as we deliver the item free of charge.
• If you prefer an **exchange**, no deductions will be made and we will deliver the exchange item **free of charge** too. Exchange items are not returnable.`,

  "ros-hairlines": `${COMMON_TOP("**+44 77 47 814 888** / **+91 889 1757 889**")}
• All other returns are refundable after deducting a service charge, based on the item value:
   – Under £100: **£5** deduction
   – £100 to £200: **£10** deduction
   – Over £200: **£20** deduction
• If you prefer an **exchange**, no deductions will be made and we will credit your account with the original item cost towards the exchange item. The customer bears the **shipping cost of the exchanged item**.`,

  "ros-india": `${COMMON_TOP("**+91 889 1757 889** (or call **+91 77 47 814 888**)")}
• All other returns are refundable after deducting a service charge, based on the item value:
   – Under ₹10,000: **₹250** deduction
   – ₹10,000 to ₹20,000: **₹500** deduction
   – ₹20,000 to ₹30,000: **₹1,000** deduction
   – Over ₹30,000: **₹1,500** deduction
• If you prefer an **exchange**, no deductions will be made and we will credit your account with the original item cost towards the exchange item.`,
};

/* The whole section, including the separator line that follows it. Returns "" for an unknown shop. */
export const returnPolicySection = (shopId) => {
  const body = POLICIES[shopId];
  return body ? `${body}\n\n${RULE}\n\n` : "";
};

/* Returns & exchanges wording for the "ready to despatch" WhatsApp message — one version per shop.
   Used by SalesPanel.jsx and DispatchPanel.jsx so both send exactly the same text.
   To change a policy (numbers, charges, wording) edit it here, once. */

const RULE = "━━━━━━━━━━━━━━━━━━";

const COMMON_TOP = (contact) => `*↩️ RETURNS & EXCHANGES*

• Please inform us **within 2 days** if you wish to return the item. Requests made later will be difficult to approve.
• All return requests must be made via our WhatsApp number ${contact}. All other forms of request may not be accepted.
• Return shipping and any associated charges are the liability of the buyer.
• You can return the item for a **full refund** if the item is damaged or we sent you an incorrect item.`;

const POLICIES = {
  "ros-selections": `${COMMON_TOP("**+44 77 47 814 888**")}
• All other returns are refundable after deducting a small charge of **£2.99**, as we deliver the item free of charge.
• If you prefer an **exchange**, no deductions will be made and we will deliver the exchange item **free of charge** too. Exchange items are not returnable.`,

  // ROS Hairlines has its own approved returns wording (plain lines, no bullets) — it does not use COMMON_TOP.
  "ros-hairlines": `*↩️ RETURNS & EXCHANGES*
Please inform us within 2 days of receiving your parcel if you wish to return the item. Requests made after this period may be difficult to approve.
All return requests must be submitted via our official WhatsApp numbers: +44 77 47 814 888 / +91 889 1757 889. Requests made through any other channel may not be accepted.
Return shipping costs and any associated charges are the responsibility of the buyer.
Original shipping charges are non-refundable, regardless of the reason for return, except where otherwise required by applicable law.
You are eligible for a full refund of the item cost if the item arrives damaged or an incorrect item has been sent.
For all other returns, a service charge will be deducted from the original item cost before the refund is processed, as follows:
Item value under £100: Five pound deduction.
Item value between £100 and £200: Ten pound deduction.
Item value over £200: Twenty pound deduction.

Exchanges: If you prefer an exchange, no service charge will be deducted. The full original item cost will be credited towards your exchange item. However, the customer is responsible for the shipping cost of the exchanged item.
Thank you for your understanding and cooperation.`,

  "ros-india": `${COMMON_TOP("**+91 889 1757 889** (or call **+91 77 47 814 888**)")}
• All other returns are refundable after deducting a service charge, based on the item value:
   – Under ₹10,000: **₹250** deduction
   – ₹10,000 to ₹20,000: **₹500** deduction
   – ₹20,000 to ₹30,000: **₹1,000** deduction
   – Over ₹30,000: **₹1,500** deduction
• If you prefer an **exchange**, no deductions will be made and we will credit your account with the original item cost towards the exchange item.`,
};

/* The whole section, including the separator line that follows it. Returns "" for an unknown shop. */
const normShop = (id) => (String(id || "").startsWith("ros-india") ? "ros-india" : id);   // staff see India as "ros-india-staff"

export const returnPolicySection = (shopId) => {
  const body = POLICIES[normShop(shopId)];
  return body ? `${body}\n\n${RULE}\n\n` : "";
};

/* "Please check your delivery address" section (text + the separator line after it).
   Left out for ROS India — pass any other shop id to get it. */
const ADDRESS_CHECK = `*🔎 IMPORTANT — PLEASE CHECK YOUR DELIVERY ADDRESS*

Please **carefully check the address shown on the label** and contact us as soon as possible if you notice any incorrect or missing information.

Delivery issue resulting from incorrect or incomplete information in the confirmed address will be the responsibility of the recipient.


This is why we strongly recommend checking the address label carefully **before or immediately after dispatch notification**, so that any genuine error can be brought to our attention at the earliest opportunity.

━━━━━━━━━━━━━━━━━━

`;
export const addressCheckSection = (shopId) => (normShop(shopId) === "ros-india" ? "" : ADDRESS_CHECK);

/* Sits right under the tracking details in the "ready to despatch" message (all shops) so the customer sees the
   inspect-on-arrival / 2-day notification notice near the top, before the long policy text. Starts with the
   "monitor the tracking" line and ends with the closing sentence; the separator after the tracking block follows it. */
const INSPECT_LIST = {
  default: `• Size and fitting
• Colour and overall appearance
• Fabric quality and condition
• Any damage, defects or discrepancies`,
  "ros-hairlines": `• Size and fitting
• Colour and overall appearance
• Quality and condition
• Any damage or defects`,
};
export const inspectionNoticeSection = (shopId) => `We kindly recommend monitoring the tracking updates until your parcel has been successfully delivered.

${RULE}

*⚠️ IMPORTANT – UPON RECEIPT OF YOUR PARCEL*

We kindly request that you inspect your item carefully upon arrival, checking the following:

${INSPECT_LIST[normShop(shopId)] || INSPECT_LIST.default}

*⚠️ Please note* that it is essential to notify us **within 2 days** of receiving your parcel if you have any concerns or wish to initiate a return. This 2-day notification period is very important, and requests received after this period may not be accepted, even though returns policy allows you 14 days from the date of delivery to return the item.

We therefore strongly recommend inspecting your item upon arrival and notifying us promptly if you have any concerns or wish to arrange a return.

Your prompt inspection and notification will help us ensure that any concerns are addressed efficiently.`;

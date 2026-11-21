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
const normShop = (id) => (String(id || "").startsWith("ros-india") ? "ros-india" : id);   // staff see India as "ros-india-staff"

export const returnPolicySection = (shopId) => {
  const body = POLICIES[normShop(shopId)];
  return body ? `${body}\n\n${RULE}\n\n` : "";
};

/* "Please check your delivery address" section (text + the separator line after it).
   Left out for ROS India — pass any other shop id to get it. */
const ADDRESS_CHECK = `*🔎 IMPORTANT — PLEASE CHECK YOUR DELIVERY ADDRESS*

**Before every dispatch, we provide the recipient with the tracking details and a photo of the address label attached to the parcel.**

Please **carefully check the address shown on the label** and contact us as soon as possible if you notice any incorrect or missing information.

⚠️ **Once the address details have been checked and confirmed, any subsequent delivery issue resulting from incorrect or incomplete information in the confirmed address will be the responsibility of the recipient.**

This is why we strongly recommend checking the address label carefully **before or immediately after dispatch notification**, so that any genuine error can be brought to our attention at the earliest opportunity.

━━━━━━━━━━━━━━━━━━

`;
export const addressCheckSection = (shopId) => (normShop(shopId) === "ros-india" ? "" : ADDRESS_CHECK);

/* Sits right under the tracking details in the "ready to despatch" message (all shops) so the customer sees the
   inspect-on-arrival / 2-day return notice at the top, before the long policy text. Replaces the old single
   "keep an eye on the tracking updates" line. No separator — the one after the tracking block follows it. */
export const inspectionNoticeSection = () => `We kindly recommend monitoring the tracking updates until your parcel has been successfully delivered.

*⚠️ IMPORTANT – UPON RECEIPT OF YOUR PARCEL*

We kindly request that you inspect your item carefully upon arrival, checking the following:

• Size and fitting
• Colour and overall appearance
• Fabric quality and condition
• Any damage, defects or discrepancies

If you wish to return the item for any reason, please inform us **within 2 days** of receiving your parcel so that we can advise you on the next steps.

Your prompt inspection and notification will help us ensure that any concerns are addressed efficiently.`;

/* Top of the "ready to despatch" message (all shops), straight after the greeting: the 2-day notification rule,
   so it is the first thing the customer reads before the long tracking / policy text. */
export const twoDayNoticeSection = () => `*⚠️ Please note* that it is essential to notify us **within 2 days** of receiving your parcel if you have any concerns or wish to initiate a return. This 2-day notification period is very important, and requests received after this period may not be accepted, even though our standard returns policy allows you 14 days from the date of delivery to return the item.

We therefore strongly recommend inspecting your item upon arrival and notifying us promptly if you have any concerns or wish to arrange a return.`;

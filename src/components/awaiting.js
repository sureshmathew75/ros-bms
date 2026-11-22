/* "Awaiting Details" — a bank payment the admin has recorded (who paid, how much, which account) before anyone knows
   who the customer is or what they bought. Staff add the customer / items later from Sales → "Add details".
   It is just a tag on the sale, so no database change is needed. */
export const AWAITING_TAG = "Awaiting Details";
export const isAwaitingDetails = (s) => !!s && String(s.tag || "").split(",").map((t) => t.trim()).includes(AWAITING_TAG);

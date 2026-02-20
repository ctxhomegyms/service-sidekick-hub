
## Full Twilio Compliance Strategy

This is a complete audit and remediation plan. After reviewing every edge function, the inbound webhook handler, the consent model, the SMS terms page, and all frontend consent flows, here is a prioritized list of everything needed to be fully compliant with Twilio's policies, the TCPA, and A2P 10DLC carrier requirements.

---

### Current State Summary

What is already in place and working:
- HMAC-SHA1 webhook signature validation on all inbound webhooks
- `sms_consent` boolean + `sms_consent_date` timestamp on every customer record
- The `send-sms` edge function blocks messages to customers without consent
- A public SMS Terms page exists at `/sms-terms`
- Consent is collected in the customer creation form and pickup request form
- The dashboard has an SMS compliance widget showing consent rates
- Idempotency checks on inbound SMS and voice webhooks

---

### Critical Gaps Found (Must Fix)

#### GAP 1: STOP/HELP/START Keywords Are Not Handled

**The Problem:**
When a customer replies `STOP` to any outbound SMS, Twilio automatically blocks future messages to that number. However, the inbound `twilio-webhook` function currently saves the `STOP` text as a regular conversation message and never updates the customer's `sms_consent` to `false` in the database. This means:
- The UI still shows the customer as consented
- Staff could manually attempt to re-send (which Twilio would silently reject)
- A2P 10DLC compliance requires you to honor opt-outs programmatically

Similarly, `HELP` must generate an auto-reply with business name, contact info, and opt-out instructions, and `START` must re-enable consent.

**Fix Required:**
- In `twilio-webhook/index.ts`: detect `STOP`, `HELP`, `START`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT` keywords before saving the message
- On `STOP` → set `sms_consent = false` on the matching customer record + send TCPA-required opt-out confirmation reply
- On `HELP` → auto-reply with business name, support contact, and `Reply STOP to opt out`
- On `START` → set `sms_consent = true` + send resubscription confirmation

---

#### GAP 2: Appointment Reminder Function Does NOT Check SMS Consent

**The Problem:**
`send-appointment-reminders/index.ts` fetches customers and sends SMS but **never checks `sms_consent`**. It only checks notification preference toggles (`sms_reminder_24h`, `sms_reminder_1h`). A customer whose `sms_consent = false` can still receive reminders if those preference flags are on. This is a TCPA violation.

**Fix Required:**
- Add `sms_consent` to the customer select in the reminder function
- Gate all SMS sends behind `customer.sms_consent === true`
- If consent is false, skip SMS entirely regardless of notification preferences

---

#### GAP 3: Missed-Call Auto-Reply Does NOT Check SMS Consent

**The Problem:**
`twilio-call-status/index.ts` sends auto-reply SMS on missed calls via the auto-reply settings. It uses the `from` phone number directly without first looking up whether that customer has given SMS consent. This bypasses the consent gate entirely.

**Fix Required:**
- In `twilio-call-status/index.ts`: before sending auto-reply, look up the customer by phone number and check `sms_consent`
- Only send if `sms_consent === true` OR if the `allowUnknownRecipient` exemption is explicitly justified (missed-call auto-replies are borderline — Twilio allows a single informational response to a number that just called you, but it must still be documented)

---

#### GAP 4: Voicemail Notification SMS Does NOT Check SMS Consent

**The Problem:**
`twilio-voicemail-handler/index.ts` sends an SMS notification to `voicemail_settings.notification_sms` when a voicemail arrives. This recipient is an internal phone number (likely a staff member), not a customer — so consent rules are different. However, the current code routes this through `send-sms` which will block it unless that number exists as a customer with consent. This will cause voicemail alerts to silently fail.

**Fix Required:**
- Internal staff notification SMS should use `allowUnknownRecipient: true` explicitly in the call to `send-sms`, since it is an operational system message to a staff member, not a marketing/customer message
- Add a comment explaining the exemption for auditability

---

#### GAP 5: IVR SMS Reply Action Does NOT Check SMS Consent

**The Problem:**
`twilio-voice-gather/index.ts` has an `sms_reply` action type. When a caller presses a digit to receive an SMS with information, the function sends the SMS via `send-sms` without verifying consent. A caller who presses "1 for our address" may not have opted in.

**Fix Required:**
- This is actually a gray area under TCPA: a user-initiated request during an active phone call can be considered implicit consent for that specific informational message
- The safest fix is: look up the customer's `sms_consent` first; if they have consent, send normally; if not, check `allowUnknownRecipient` with a documented audit note
- Alternatively, for IVR-initiated SMS only, use `allowUnknownRecipient: true` with a comment explaining the caller explicitly pressed a button requesting the message (keyword: "express written consent equivalent")

---

#### GAP 6: SMS Terms Page Has Hardcoded Business Info

**The Problem:**
The `/sms-terms` page hardcodes "FixAGym Field" as the business name and `support@fixagym.com` as the contact email. If this application is used by multiple service businesses, or if the business name changes, the compliance page will be inaccurate — which is a carrier verification problem.

**Fix Required:**
- Pull business name and contact email from `company_settings` table dynamically, or
- Add a settings field specifically for "SMS Compliance Contact Email" that populates the terms page

---

#### GAP 7: No Opt-Out Confirmation Message Text in UI

**The Problem:**
When a customer replies STOP (after Gap 1 is fixed), they will receive a confirmation message. The text of that confirmation is currently hardcoded in the edge function. TCPA requires it state: the program name, that they have been unsubscribed, and that no further messages will be sent. There is no UI to configure or view this.

**Fix Required:**
- Add the STOP confirmation message as a configurable field in the Notification Templates settings (the `NotificationTemplatesManager` already exists)
- Add HELP response text as a configurable field too

---

#### GAP 8: Consent Language on Customer Creation Forms Is Weak

**The Problem:**
In `src/pages/Customers.tsx` and `src/components/jobs/CustomerSelector.tsx`, the SMS consent checkbox is labeled simply "SMS Consent" with minimal explanatory text. TCPA requires that consent collection include:
1. What types of messages they will receive
2. That message/data rates may apply
3. How to opt out (STOP)
4. A link to your SMS terms

**Fix Required:**
- Expand the consent checkbox label to include this disclosure language
- Add a link to `/sms-terms` inline next to the checkbox

---

### Non-Critical Improvements (Recommended)

#### IMPROVEMENT A: Opt-Out Status Indicator on Customer Detail Page

Currently there is no visual indicator on the customer detail page showing whether a customer has replied STOP or had consent revoked via inbound webhook. The `sms_consent` field exists in the database but the detail page does not clearly display a "Opted Out" badge if consent was revoked after initial collection.

**Fix:**
- Add a prominent "SMS Opted Out" badge on the customer detail page when `sms_consent === false` and a `sms_consent_date` exists (indicating they previously consented but then opted out)

---

#### IMPROVEMENT B: SMS Consent Audit Trail

Currently, when a customer's `sms_consent` changes (either via STOP reply or staff action), there is no log of who/what changed it and when. `sms_consent_date` only tracks the opt-in date, not revocation.

**Fix:**
- Add a `sms_consent_history` table or reuse the `job_activities` pattern to log consent changes with timestamp, reason (`staff_updated`, `stop_keyword`, `start_keyword`), and old/new values

---

#### IMPROVEMENT C: Resend Sender Domain

The `send-notification` and `send-review-request` edge functions send email from `onboarding@resend.dev`, which is the Resend sandbox domain. Emails from this address will likely land in spam and cannot be used in production. 

**Fix:**
- Set up a verified domain in Resend (e.g., `no-reply@fixagym.com`)
- Update the `from` field in both email functions
- Add the verified domain as a configurable company setting

---

### Implementation Plan

| Priority | Gap | Risk Level | Effort |
|----------|-----|-----------|--------|
| 1 | STOP/HELP/START keyword handling in inbound webhook | Critical - TCPA violation | Medium |
| 2 | Add `sms_consent` check to appointment reminders | Critical - TCPA violation | Small |
| 3 | Add `sms_consent` check to missed-call auto-reply | Critical - TCPA violation | Small |
| 4 | Fix voicemail SMS notification routing | High - silent failures | Small |
| 5 | Fix IVR SMS reply consent handling | Medium - gray area | Small |
| 6 | Strengthen consent disclosure language on forms | High - carrier verification | Small |
| 7 | Configurable STOP/HELP response text | Medium | Small |
| 8 | SMS Terms page — dynamic business info | Medium | Small |
| A | Opted-out badge on customer detail | Low | Small |
| B | Consent audit trail | Low | Medium |
| C | Resend production sender domain | Medium | Small |

---

### Files to Create/Modify

| File | Action | Reason |
|------|--------|--------|
| `supabase/functions/twilio-webhook/index.ts` | Modify | Add STOP/HELP/START keyword detection and response |
| `supabase/functions/send-appointment-reminders/index.ts` | Modify | Add `sms_consent` check before sending |
| `supabase/functions/twilio-call-status/index.ts` | Modify | Add consent check for auto-reply |
| `supabase/functions/twilio-voicemail-handler/index.ts` | Modify | Fix `allowUnknownRecipient` for staff notification |
| `supabase/functions/twilio-voice-gather/index.ts` | Modify | Add `allowUnknownRecipient` with audit comment for IVR SMS |
| `src/pages/Customers.tsx` | Modify | Strengthen consent disclosure language + link |
| `src/components/jobs/CustomerSelector.tsx` | Modify | Same consent disclosure update |
| `src/components/settings/NotificationTemplatesManager.tsx` | Modify | Add STOP/HELP message configuration |
| `public/sms-terms/index.html` | Modify | Pull business name dynamically or document update process |
| `src/pages/CustomerDetail.tsx` | Modify | Add opted-out badge |


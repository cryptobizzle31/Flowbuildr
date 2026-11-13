# Website enquiry form handler

`enquiry.php` (in the site root, next to `index.html`) replaces the GoHighLevel webhook. Each genuine book-a-call submission is written into Attio as a person, a company where we can match one, an entry on the **Website enquiries** list (`website_enquiries`), and a note. The pop-up still shows its inline “Request received” panel. There is no thank-you page.

This `docs/` folder is documentation only. It is blocked by `.htaccess` and is not part of the public site. Do not put a filled-in config file in the repository or in `public_html`.

## Deploy

1. **Put the token in private config, outside the web root.** Copy `docs/attio-config.example.php` to `attio-config.php` in the directory above `public_html` (on Hostinger, the folder that contains `public_html`). `enquiry.php` loads config in this order:
   - the `ATTIO_CONFIG_PATH` environment variable, when it is set
   - `dirname(__DIR__) . '/attio-config.php'` (the folder above `public_html`)
   - `dirname(__DIR__, 2) . '/attio-config.php'`
   Create a workspace API key in Attio → Workspace settings → Developers, with scopes: `record_permission:read-write`, `object_configuration:read`, `list_entry:read-write`, `list_configuration:read`, `note:read-write`. Paste the token into the server copy and leave `list_slug` as `website_enquiries`. File mode `0600` if you can. If no config file is found, the handler logs that and returns `{ "ok": false }` without writing to Attio.
2. **`enquiry.php` deploys with the site** to `public_html/enquiry.php`. Do not also upload a copy of the config next to it.
3. **Front end.** `assets/site.js` posts the existing fields plus the `company_website` honeypot to `/enquiry.php`. The inline “Request received” panel still shows straight away. The `generate_lead` gtag event fires only when the HTTP response is ok.
4. **Run one live dummy test** from a unique address such as `test-enquiry-YYYYMMDD@example.com`. Confirm in Attio: person upserted, company linked when the email is a work domain or a business name was given, list entry at **New enquiry** with source **Website form**, and a note that includes the message and `Source: Website: book a call`.
5. **Delete the test record** (person, any test company, list entry and notes) in the Attio UI. Do not use a real customer email for this test.

## Payload

The handler accepts `POST` JSON (form-encoded is a fallback) with: `first_name`, `last_name`, `email`, `phone`, `business_name`, `message`, `source`, plus the honeypot `company_website` (must be empty). Name in Attio is first + last. Responses are always JSON: `{ "ok": true }` or `{ "ok": false }`. CORS is allowed only from `https://flowbuildr.co.uk` and `https://www.flowbuildr.co.uk`; `OPTIONS` preflight is handled. Same-origin posts from the live site are the expected case.

## Attio list attributes

The **Website enquiries** list (`website_enquiries`, parent: people) already exists. If Stage and Source are not on the list yet, add them in the Attio UI before relying on those fields:

1. Open **Website enquiries**.
2. Add a **Status** attribute titled **Stage**, API slug `stage`, statuses in order: **New enquiry**, **Contacted**, **Call booked**, **Proposal sent**, **Won**, **Lost**.
3. Add a **Select** attribute titled **Source**, API slug `source`, options: **Website form**, **Referral**, **Other**.

Until those exist, the handler still upserts the person, list entry and note, but cannot set stage or source (that failure is logged, not shown to the visitor).

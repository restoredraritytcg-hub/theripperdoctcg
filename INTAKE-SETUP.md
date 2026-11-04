# Owner intake page + automatic quotes (intake-v1)

The same tools Restored Rarity has, built into the shared template for **PH Restoration Lab**, **RipperDoc TCG** and **PH Collectibles HTX**:

- **Automatic quote on every order.** It's in the new-order email (the total is in the subject line), on the Sheet, and at the top of each order on the intake page.
- **Your discount.** Type `10%` or `15` (for $15 off). It comes off after any referral discount and can't take the total below $0.
- **Price override per card**, for custom prices.
- **Before and after photos and intake notes for each card**, uploaded from a phone at the bench.
- **Change a card's status** from the order view (the Cards list) or from that card's own page. It works exactly like changing Status on the Sheet: the customer gets that stage's email, with an optional note, and the history, overall order status and quote all update.
- **Customers and Cards views.** **Customers** lists everyone who has ordered (grouped by email or phone) with repeat-customer and open-order counts; each customer's page shows their contact details, every order, every card and their quoted total. **Cards** lists every card across all orders, filterable by stage and searchable by card, service, customer or reference.
- **Website tab: edit the site without the Sheet.** Open or pause submissions, run the announcement bar, show, hide and reorder sections, change prices and turnaround times, add, edit and delete shows and news posts, and upload, title, reorder and hide gallery photos. Changes go live within about a minute. It saves to the same Site tabs, so the Sheet still works too.
- **A private page** (`intake.html`), protected by a PIN and not linked from the site. Customers never see quotes or discounts.

## How quotes are worked out
- Prices come from the site's **Site Prices** tab, the same one the website reads. Change a price there and future quotes use it. To re-quote existing orders, use the menu: **Recalculate all quotes**.
- **RipperDoc:** service × speed (Priority / Expedited / Standard), plus the slab cracking and microscope add-ons at their "with another service" price. "Slab cracking only" and slab polishing use their own prices.
- **PH Restoration Lab:** the four service prices. A valid referral code takes 10% off.
- **PH Collectibles:** has no Site Prices tab, so it uses the price shown on the order form. "Starting at" prices are flagged to confirm after assessment.
- Anything that doesn't match is flagged in **Quote Notes**, and on the intake page as "Quote needs a look". Fix it with a **Price Override**.
- The quote updates itself when you change a card's **Service**, set its **Status** to Cancelled (cancelled cards aren't charged), change its **Price Override**, or change the order's **Your Discount**.

## New Sheet columns (added by setup)
- **Items, O–T:** Quote · Quote Breakdown · **Price Override** · Before Photos · After Photos · Intake Notes
- **Submissions, O–T:** Quote Subtotal · Referral Discount · **Your Discount (10% or 15)** · Your Discount ($) · Quote Total · Quote Notes

Bold columns are the ones you type in. The rest fill in automatically.

## Put it live (per site)
1. **Code.gs:** in the site's Apps Script, paste the new `Code.gs` over everything. It already includes the Site Gallery change, so this one paste covers both updates.
   - Set `INTAKE_PIN` to a PIN of 4+ characters. Leave it blank to keep the page off.
   - For PH Collectibles, also set `SITE_URL`.
2. Save, then **Run setup**. This adds the new columns and quotes every existing order.
3. **Deploy → Manage deployments → pencil → New version → Deploy.** The address stays the same.
4. **intake.html:** check its CONFIG at the top:
   - **PH Restoration Lab:** already filled in with the live backend address and Cloudinary details.
   - **RipperDoc and PH Collectibles:** paste the same `/exec` URL and Cloudinary cloud and preset that the website uses.

   Upload it to the site's GitHub repo next to `index.html`, as `intake.html`. The page lives at `https://<site>/intake.html`.
5. **Test it:**
   - Submit a test order on the site. The new-order email subject should end with the quote.
   - Open `/intake.html`, enter the PIN, and open the order.
   - Type `10%` and click Apply, add a before photo, and type a note.
   - Check that all of it shows up on the Sheet, then delete the test rows.

## Good to know
- The page locks for 10 minutes after 8 wrong PINs. To change the PIN, edit `INTAKE_PIN`, then deploy a new version.
- Photos go to Cloudinary under `intake/<reference>`.
- The site's `index.html` doesn't change for this update.

## Put the intake page on your phone's home screen
It opens full screen with its own icon, like an app.

- **iPhone (Safari):** open `https://<your site>/intake.html` → tap **Share** (square with an arrow) → **Add to Home Screen** → **Add**. (On iOS 26 and later, tap the **⋯** menu first if Share isn't visible.)
- **Android (Chrome):** open the same address → tap **⋮** (top right) → **Add to Home screen** (or **Install app**) → **Add**.

Tick **Remember me on this phone** when you sign in so you don't retype the PIN each time. **Sign out** (top right) makes the phone forget it. Changing the PIN in Code.gs signs every phone out.

Upload `intake-icon.png` and `intake.webmanifest` next to `intake.html` so the home-screen icon and name show correctly.

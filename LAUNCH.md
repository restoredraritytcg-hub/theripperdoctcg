# RipperDoc TCG — complete launch checklist

Covers everything built so far: the website (rd-v5), backend, automatic quotes, the owner intake portal, the Site Gallery, and connecting RipperDoc to your client portal. Same setup as PH Restoration Lab.

**Files in this package**
- `website/index.html`: the site
- `website/intake.html`: RipperDoc's private owner portal
- `google-apps-script/Code.gs`: the backend
- `docs/ripperdoc-email-logo.png`: logo for emails
- `docs/WEBSITE-SETTINGS-GUIDE.md` and `docs/INTAKE-SETUP.md`: guides for the owner

Search each file for `TODO` to find every value still to fill in.

---

## 0. Get from RipperDoc first
- [ ] The **Gmail account** that will own the Sheet and send customer emails
- [ ] Contact email, phone, Instagram handle, and any Linktree or Whatnot links
- [ ] **Domain** (bought already, or which one to buy)
- [ ] A **PIN** for their intake portal (4+ characters)
- [ ] **Terms:**
  - effective date (launch day)
  - their state and county for §30
  - confirm the 30-day redo window, 7-day claims window, $5/card/month storage after 30 days, and 90-day abandonment

## 1. Cloudinary (photo uploads), in RipperDoc's account
1. Sign up for a free account with RipperDoc's email. Copy the **cloud name** from the dashboard.
2. Go to **Settings → Upload → Upload presets → Add upload preset**.
3. Set *Signing mode* to **Unsigned**. Leave *Folder* blank, because the site and portal choose their own folders. Save, then copy the **preset name**.

## 2. Google Sheet + Apps Script, in RipperDoc's Google account
1. Open a **private window** signed in only as RipperDoc's Google account. Create a blank Sheet called *RipperDoc TCG — Submissions*.
2. Go to **Extensions → Apps Script**, delete the starter code, and paste all of `Code.gs`.
3. In `CONFIG` set:
   - `SITE_URL`: `'https://<domain>'` (no slash at the end)
   - `OWNER_EMAIL`: RipperDoc's email
   - `INTAKE_PIN`: their PIN
4. **Save.** Pick **setup** in the function menu and click **Run**. To approve: *Review permissions → Advanced → Go to (unsafe) → Allow*.
5. Reload the Sheet. Check that the **RipperDoc TCG** menu appears and these tabs exist:
   - Submissions
   - Items
   - Item Status History
   - Referral Codes
   - Reviews
   - Site Settings, Site Sections, Site Prices, Site Shows, Site News, Site Gallery
6. Go to **Deploy → New deployment →** gear icon → **Web app**. Set *Execute as* to **Me** and *Who has access* to **Anyone**. Deploy, then copy the URL ending in **`/exec`**.

## 3. Fill in the website — `website/index.html` (CONFIG at the top)
- [ ] `backend.endpoint`: the `/exec` URL
- [ ] `backend.cloudinaryCloud` and `backend.cloudinaryPreset`
- [ ] `contact`:
  - `email`
  - `phone` (`+1XXXXXXXXXX`) and `phoneDisplay`
  - `social.handle` and `social.url`, and set `social.show: true`
  - any `links`
- [ ] `terms.effectiveDate`. Also update the TODO comment above `terms` and the §30 wording if they want their state and county named.
- [ ] `build:` is already `rd-v5`. Bump it (rd-v6, …) whenever you change the file later.

## 4. Fill in the intake portal — `website/intake.html` (CONFIG at the top)
- [ ] `endpoint`, `cloudinaryCloud` and `cloudinaryPreset`, the same three values as the site

## 5. GitHub Pages (restoredraritytcg-hub)
1. Create a new **public** repo, e.g. `ripperdoc-tcg`.
2. Upload:
   - `index.html`
   - `intake.html`
   - `ripperdoc-email-logo.png`
   - `intake-icon.png` and `intake.webmanifest` (home-screen icon for the intake portal)
   - a file named **`CNAME`** containing only the domain, e.g. `ripperdoctcg.com`

   Commit.
3. Go to **Settings → Pages** and set *Source* to *Deploy from a branch*, `main` / `(root)`. Save.
4. Enter the domain under *Custom domain*. Once the DNS check passes, tick **Enforce HTTPS** (the certificate can take up to an hour).

## 6. Domain DNS (Namecheap → Domain List → Manage → Advanced DNS)
Delete the parking records, then add:

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | restoredraritytcg-hub.github.io. |

## 7. Finish the backend
1. In Apps Script, set `EMAIL_LOGO_URL: 'https://<domain>/ripperdoc-email-logo.png'`. Check that `SITE_URL` is right, then Save.
2. Go to **Deploy → Manage deployments → pencil → Version: New version → Deploy**. The `/exec` URL stays the same.
3. **Open the live site once.** This fills Site Sections and Site Prices, and quotes read their prices from Site Prices.

## 8. Test everything (use your own email as the customer)
- [ ] Sheet menu → **Send me a test email** arrives
- [ ] **Submit 2 test cards** with front and back photos:
  - one on Card Refresh — Priority with slab cracking
  - one on Minor Repair — Standard
  - rows appear in **Submissions** and **Items**
  - photos appear in Cloudinary
  - the customer confirmation arrives
  - the owner email's subject ends with **"— quote $90.00"** (Card Refresh Priority $40 + slab cracking $10 + Minor Repair Standard $40)
- [ ] **Track** with the reference number and email shows both cards
- [ ] **Intake portal** at `https://<domain>/intake.html`:
  - a wrong PIN is refused
  - the right PIN shows the order and its quote
  - type `10%` and click **Apply**, and the total drops
  - add a before photo and a note
  - change card 1's status from the **Cards** list, and the customer email arrives with your note
  - open card 2 on its own page and change its status there
- [ ] Changing a **Status** directly on the Items tab also emails the customer
- [ ] **Review:** leave one, set *Approved* to **YES**, and it shows on the site
- [ ] **Site Settings:** untick *Accepting submissions* and the form pauses. Tick it again.
- [ ] **Phone check:** site, form, photo upload, Terms scroll and intake portal all work
- [ ] **Clean up:** delete the test rows (Submissions, Items, Item Status History, Reviews) and the test photos in Cloudinary

## 9. Connect RipperDoc to your client portal
1. RipperDoc shares their Google Sheet with **your** Gmail as an **Editor**.
2. On your portal Sheet's **Clients** tab, add a row:
   - `ripperdoc`
   - RipperDoc TCG, with the contact name and email
   - `https://<domain>`
   - their Sheet URL
   - `clients/ripperdoc-tcg/index.html`
3. Run **Client Portal → Create client links**, then **Check access to client Sheets**. RipperDoc should say *OK*.
4. Send them their link from the **Portal link** column.

## 10. Hand-off to RipperDoc
- Send them:
  - their **site URL**
  - their **intake portal** URL (`/intake.html`) and PIN
  - their **client portal** link
  - `WEBSITE-SETTINGS-GUIDE.md` and `INTAKE-SETUP.md`
- Show them the daily routine:
  1. A new-order email arrives with a quote.
  2. Open the order in the intake portal.
  3. Add before photos.
  4. Write a note to the customer, then set the status to **Assessment** (this tells the customer they can send the card in).
  5. Work through the stages from the Cards list.
  6. Add after photos.
  7. Set **Ready for Return**.
- **Later changes:**
  - Website: edit only the CONFIG block of `index.html`, bump `build:`, and re-upload.
  - `Code.gs`: any edit needs **Manage deployments → New version**.
  - Prices: change them on the **Site Prices** tab and they update the site and future quotes. Run **Recalculate all quotes** to re-price existing orders.

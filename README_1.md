# RipperDoc TCG — website (build rd-v5)

**Start with LAUNCH.md** — the complete step-by-step to get RipperDoc online.

Built on the same template as Restored Rarity and PH Restoration Lab, styled from RipperDoc's price sheets, mascot and logo.

## Changelog
- **rd-v5 (Nov 2, 2026)** — Grading submission (PSA, CGC, BGS, TAG): $15 first card + $5 each after on its own, $5 per card as an add-on; site adds missing Site Prices rows; owner portal **New submission** with service dropdown + add-on checkboxes.
- **Oct 29, 2026 (backend 2026-10-29b)** — automatic quotes from Site Prices, your discount, price overrides, and the PIN-protected owner page `intake.html` (before/after photos + intake notes). Paste Code.gs (set INTAKE_PIN) → Run setup → New version; upload intake.html. See docs/INTAKE-SETUP.md.
- **rd-v4 (Oct 29, 2026)** — Site Gallery tab (Code.gs + index.html) so the client portal can publish gallery photos. Update both: paste Code.gs → Run setup → New version; upload index.html.
- **rd-v3 (Oct 24, 2026)** — Terms updated from the Oct 23 restoration notes: §7 adds PSA's published policy on restored/cleaned cards (with links) and the duty to check current grading rules; §8 adds transparency about restoration when submitting to a grader; §18 lists what intake identification and inspection record; new §19 "How We Work on Your Card" (individual assessment, consistent environment, foil handling, staged heat work). Former §19–30 are now §20–31; cross-references updated.
- **rd-v2** — initial build.

## Files
| File | Where it goes |
|---|---|
| website/index.html | GitHub repo for RipperDoc — upload as-is |
| website/intake.html | Same repo, next to index.html — private owner page (PIN in Code.gs `INTAKE_PIN`) |
| google-apps-script/Code.gs | Apps Script editor attached to RipperDoc's Google Sheet → run `setup`, then Deploy → Web app (Execute as Me, Anyone) |
| ripperdoc-email-logo.png | Optional: upload to the repo and set `EMAIL_LOGO_URL` in Code.gs |
| WEBSITE-SETTINGS-GUIDE.md | Give to the owner: how to use the Sheet tabs |
| favicon.png | Spare copy — already embedded in the HTML |

The HTML is self-contained (logo, mascot, banner and all artwork embedded).

## Website Settings (owner-editable, no code)
`setup()` adds six tabs to the Sheet — **Site Settings, Site Sections, Site Prices, Site Shows, Site News, Site Gallery**. After deploying, open the live site once: it fills Site Sections and Site Prices with the site's defaults. From then on the owner can pause submissions, run an announcement bar, show/hide and reorder sections, edit prices and turnaround text, add show dates and post news. Changes appear within about a minute (menu → *Refresh the website now* for instant). Hand the owner **WEBSITE-SETTINGS-GUIDE.md**. Add `?nocms` to the URL to view the site without the Sheet's settings.

## Still needed from RipperDoc (search the file for TODO)
- Contact: email, phone, Instagram handle (and any Linktree / Whatnot links) → `contact` in index.html
- Domain → add a `CNAME` file in the repo + `SITE_URL` in Code.gs
- Owner email → `OWNER_EMAIL` in Code.gs
- Intake PIN → `INTAKE_PIN` in Code.gs; backend + Cloudinary values → CONFIG in intake.html
- Backend: Apps Script `/exec` URL, Cloudinary cloud name + unsigned preset → `backend` in index.html
- Terms: effective date; the state/county in Section 30; confirm 30-day redo window, 7-day claims window, $5/card/month storage after 30 days, 90-day abandonment
- Optional: show dates (`events`), recent card photos (`gallery`), referral codes (`pricing.referral.enabled`)

## What's on the site
Hero banner · "Meet RipperDoc" game-style profile card (INFO / PROCESS / CARE / RESULTS tabs) · What we do · Pricing (Card Refresh, Minor Repair, Full Restoration × Priority / Expedited / Standard, add-ons, assessments, service guide, turnaround + bulk notes, price estimator) · Delivery options (mail, personal delivery, Uber drop-off, local/event hand-off) · Submission form with photo uploads and 31-section Terms · Tracking · More than card restoration · Reviews · FAQ · Contact.

## Template engine additions (reusable for future clients)
Multiple add-ons, turnaround-speed pricing, any number of delivery options, generic feature blocks (`CONFIG.blocks`), game-style profile section (`CONFIG.dex`), third accent font, two-tone headings, stacked hero, light-theme "brush" variant.

# How to update your website (no code needed)

> **Easiest way:** open your private owner page (`yoursite.com/intake.html`), enter your PIN, and use the **Website** tab. It has switches and forms for everything below, including photo uploads for the gallery. This guide covers doing the same things directly in the Google Sheet.

Everything below happens in **your Google Sheet** — the same one where your submissions arrive. Make a change, wait about a minute (or use the menu **[Your business] → Refresh the website now**), then reload your website.

> Only edit the columns described here. Columns marked **"don't change"** connect the Sheet to the website.

---

## Site Settings tab

| Setting | What to put in **Value** |
|---|---|
| **Accepting submissions** | ☑ ticked = the submission form is open. Untick to pause it (vacation, backlog). New submissions are also refused while it's unticked. |
| **Paused message** | What visitors see instead of the form, e.g. *Back from vacation Jan 2!* |
| **Show announcement bar** | ☑ tick to show a bar across the top of every page. |
| **Announcement text** | e.g. *Holiday turnaround: submissions after Dec 15 return in January.* |
| **Announcement link** | Optional. A full link (`https://…`) or a part of your page, like `#pricing`. |
| **News section heading** | The title of your News section (default: *News & coming soon*). |

## Site Sections tab — show, hide and reorder

Each row is one section of your page.

- **Show on site** — untick to hide a section, tick to show it.
- **Order** — lower numbers appear higher on the page. To move FAQ right under the top banner, give it a number between the banner's and the next section's (e.g. 15).
- Some sections start unticked (for example *events* or *gallery*) — tick them when you're ready to use them.
- The **News** section appears automatically once you publish a post (below), and hides itself when there are none.

## Site Prices tab

- Change the number in **Price ($)** and the website updates everywhere — price cards, the price estimate and the submission form.
- **Turnaround** (where shown) is the text displayed next to that price, e.g. *5–7 business days*.
- Don't rename the **Service** or **Option** columns — that's how the website matches each price. Leave a price blank to keep the website's original price.

## Site Shows tab — events and card shows

One row per event: **Start date**, optional **End date**, **Event name**, **Location**, **Time / notes**, optional **Link**. Past events disappear on their own. Make sure the *events* section is ticked on the Site Sections tab.

## Site News tab — news & coming soon

Use it for new services, holiday hours, giveaways, show announcements — anything.

| Column | |
|---|---|
| **Show on site** | ☑ tick to publish, untick to hide (handy for drafts). |
| **Date** | Optional. Shown above the title. |
| **Title** / **Message** | Your post. Line breaks are kept. |
| **Button text** / **Button link** | Optional button, e.g. *See pricing* → `#pricing`, or a full `https://` link. |

## Site Gallery tab — photos of your work

One row per photo: tick **Show on site**, give it an **Order** (lower numbers appear first), a **Title**, an optional **Subtitle / set** and **Tag**, and a **Photo URL**. For a before-and-after pair, put the photos in **Before photo URL** and **After photo URL** instead. These photos appear ahead of the site's built-in gallery photos. Make sure the *gallery* section is ticked on the Site Sections tab. (Photos sent through your client portal are added here for you.)

---

**Changes not showing?** Use **Refresh the website now** in the Sheet's menu, then reload the page. If something looks wrong, just change it back — edits here never affect past submissions or tracking.

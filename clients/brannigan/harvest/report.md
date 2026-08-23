# Harvest report — Brannigan Heating & Air Conditioning

**Source:** http://localhost:8781/  
**Harvested:** Sun, 23 Aug 2026 00:31:42 GMT  
**Pages read:** 6 of 7 discovered  
**Data transferred:** 12.7 KB over 18 requests

## Profile completeness

```
████████████████░░░░ 82% complete
```

Biggest gaps, highest impact first:

| Field | Weight | Why it matters |
| --- | --- | --- |
| Short description | 6 | 1–2 sentences, used for meta description and cards. |
| Value propositions | 5 | Three or four reasons to choose them. |
| Tagline | 4 | Six to ten words. What they do and for whom. |
| Service area | 4 | Towns/regions served — big local SEO win. |
| Category | 3 | e.g. "HVAC contractor", "family dentist". Drives schema.org type. |
| Year founded | 2 | Powers "Serving the area since ____". |

## The case for a rebuild

Findings from the existing site — safe to put in front of the owner:

- Built on **Microsoft FrontPage**.
- Mobile friendly: **no**
- Secure (HTTPS) throughout: **no**
- Structured data for Google: **no**
- 2 of 6 images have no alt text

| Issue | Pages affected |
| --- | --- |
| No viewport meta tag — the page does not adapt to phones. | 6 |
| Served over HTTP, so browsers show a "Not secure" warning. | 6 |
| No meta description — Google invents its own snippet. | 6 |
| No structured data (schema.org) — no rich results in Google. | 6 |
| 1 of 2 images have no alt text (accessibility + SEO). | 2 |
| Page title is 69 characters and gets truncated in search results. | 1 |
| 3 table(s) used for page layout — a pre-2010 technique. | 1 |
| Uses deprecated <font>/<center>/<marquee> tags. | 1 |

## What we found

| Item | Result |
| --- | --- |
| Business name | Brannigan Heating & Air Conditioning |
| Phone | (217) 555-0142 |
| Email | service@branniganheating.com |
| Address | 1425 North Grand Avenue East, Suite B, Springfield, IL 62702 |
| Opening hours | 7 days |
| Services | 6 |
| Testimonials | 4 |
| FAQs | 4 |
| Team members | 3 |
| Images downloaded | 5 |
| schema.org blocks | 0 |

### Services detected

- **Air Conditioning Repair** — Fast diagnosis and repair for every major brand of central air conditioner. Most repairs completed same day, and we stock the common parts on every truck.
- **Furnace Repair & Replacement** — From emergency no-heat calls to planned high-efficiency furnace replacement, with financing available on new equipment.
- **Heat Pump Installation** — Energy efficient heat pump systems sized correctly for your home, including ductless mini split installation.
- **Preventive Maintenance Plans** — Twice yearly tune ups that keep your equipment under warranty and catch small problems before they become expensive ones.
- **Indoor Air Quality** — Whole home humidifiers, air purifiers, UV lamps and duct cleaning to help with allergies and dust.
- **Commercial HVAC** — Rooftop units, service contracts and planned replacement for small commercial buildings in the Springfield area.

### Brand

- Primary: `#1f3a93` · Secondary: `#c41e3a` · Accent: _none_
- Full palette: #1f3a93, #c41e3a, #eeeeee, #333333, #666666, #444444, #cccccc
- Fonts: heading `Georgia`, body `Georgia`
- Logo: http://localhost:8781/img/logo.gif

### Social profiles

| Network | Status | URL | Notes |
| --- | --- | --- | --- |
| Facebook | unreachable | https://www.facebook.com/branniganheating | Could not fetch (HTTP 403). |
| Instagram | unreachable | https://www.instagram.com/branniganheating | Could not fetch (HTTP 403). |
| Yelp | unreachable | https://www.yelp.com/biz/brannigan-heating-springfield | Could not fetch (HTTP 403). |

> **Manual step required.** These networks refuse anonymous requests, so nothing was invented for them:
>
> - **Facebook** — Open https://www.facebook.com/branniganheating while signed in and copy: the bio/about text, the 6–10 best photos, any recent posts worth featuring, and the review score if there is one.
> - **Instagram** — Open https://www.instagram.com/branniganheating while signed in and copy: the bio/about text, the 6–10 best photos, any recent posts worth featuring, and the review score if there is one.
> - **Yelp** — Open https://www.yelp.com/biz/brannigan-heating-springfield while signed in and copy: the bio/about text, the 6–10 best photos, any recent posts worth featuring, and the review score if there is one.

## Pages read

| Page | Type | Title |
| --- | --- | --- |
| http://localhost:8781/ | home | Brannigan Heating & Air Conditioning - Springfield IL HVAC C |
| http://localhost:8781/about.html | about | About Us - Brannigan Heating |
| http://localhost:8781/services.html | services | Our Services - Brannigan Heating & Air |
| http://localhost:8781/contact.html | contact | Contact Us - Brannigan Heating |
| http://localhost:8781/testimonials.html | testimonials | Testimonials - Brannigan Heating |
| http://localhost:8781/gallery.html | gallery | Photo Gallery - Brannigan Heating |

<details><summary>1 URL(s) skipped</summary>

- `http://localhost:8781/index.html` — duplicate of an already-crawled page

</details>

## Quality warnings

- ⚠️ Hero headline starts with "Welcome to" — replace it with a benefit-led line.

## Next step

```bash
avo brief brannigan     # write the enrichment brief for a Claude Code session
avo build brannigan --theme meridian --all-themes
```

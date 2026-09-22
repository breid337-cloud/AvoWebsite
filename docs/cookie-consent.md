# Cookie consent

Set `site.analytics.ga4` and the build ships a consent banner automatically. No
other configuration is needed.

```jsonc
"site": {
  "analytics": { "ga4": "G-XXXXXXX" },
  "consent": { "enabled": true, "policyUrl": "/privacy/" }
}
```

## What it actually does

The important part is what is *not* in the HTML. When consent applies, the
`gtag.js` tag is **not emitted at all**. The measurement id ships as inert JSON:

```html
<script type="application/json" id="avo-consent">{"ga4":"G-XXXXXXX","policyUrl":""}</script>
```

`site.js` injects the real script only after the visitor presses Accept. Decline,
ignore the banner, or browse with JavaScript off, and the request to Google is
never made and no cookie is ever set.

This matters legally. UK PECR and the GDPR require consent *before* non-essential
cookies are set, so the common pattern — load the tag, then show a banner
announcing it — does not comply. The test in `test/pipeline.test.js` asserts the
tag is absent from the markup, so that cannot regress unnoticed.

## What is and is not gated

| Setting | Banner? | Why |
| --- | --- | --- |
| `analytics.ga4` set | yes | sets cookies |
| `analytics.plausible` set | no | Plausible is cookieless; gating it would cost analytics for no privacy gain |
| both set | yes | Plausible still loads immediately; only GA4 waits |
| nothing set | no | nothing to consent to |
| `consent.enabled: false` | no | the tag ships inline and the owner carries the responsibility |

`consentRequired(profile)` in `src/profile/schema.js` is the single source of
truth, shared by the renderer, the footer and the tests so they cannot disagree.

## Choices, and changing them

Accept and Decline are the same size, side by side, one tap each. Regulators
treat a refusal that is harder than acceptance as no consent at all, so keep them
comparable if you restyle the banner — the test checks the markup, not the CSS.

The choice is stored in `localStorage` under `avo-consent` as `granted` or
`denied`. Storage can throw in private browsing; that is caught, and the only
consequence is being asked again next visit.

Withdrawing must be as easy as consenting, so the footer carries a **Cookie
settings** control. Anything with `data-consent="manage"` clears the stored
choice and reopens the banner, so you can put one in a privacy policy page too.

## Before you rely on it

- **Set `consent.policyUrl`.** Without it the banner has no link to a privacy
  policy, which a consent notice is normally expected to carry. Nothing generates
  that page for you.
- **The banner covers part of the viewport** until answered — about 25% at
  320px, 14% at 1440px.
- **This is not legal advice.** It withholds the tag until consent and lets a
  visitor change their mind, which is the mechanical part. Whether your notice
  says enough about what you collect is your call.

## Legal pages

`content.legal` carries prose pages that sit outside the main nav — a privacy
policy, terms, a cookie policy. Each becomes a real, indexable page at
`/<slug>/`, linked from the footer of every page and listed in `sitemap.xml`.

```jsonc
"legal": [
  {
    "slug": "privacy",
    "title": "Privacy policy",
    "updated": "22 September 2026",
    "sections": [
      { "heading": "Who we are", "body": ["First paragraph.", "Second."] }
    ]
  }
]
```

`body` accepts a string or an array of strings. Pages with no title or no
sections are dropped by the normaliser rather than shipped empty.

Point the banner at one with `site.consent.policyUrl`. A site-relative value is
resolved per page, so `"privacy/"` becomes `../../privacy/` on a page two levels
deep; an absolute URL is passed through untouched. A test covers both, because
a bare relative href in the banner resolves under whatever page it renders on.

The renderer is deliberately dumb: it prints the headings and paragraphs it is
given and nothing else. What a legal page says is the client's to write.

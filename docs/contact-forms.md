# Contact forms on a static site

Static hosting has no server, so the enquiry form has to post somewhere else.
Set `site.form` in the client profile.

## Formspree — works on any host

```json
"form": { "provider": "formspree", "action": "https://formspree.io/f/xxxxxxxx", "method": "POST" }
```

Submits over `fetch`, so the visitor gets an inline success message instead of a
page navigation. Free tier covers a typical small business.

## Netlify Forms — only on Netlify

```json
"form": { "provider": "netlify", "action": "", "method": "POST" }
```

Adds `data-netlify="true"` and the hidden `form-name` field Netlify needs.

## Your own endpoint

```json
"form": { "provider": "custom-ajax", "action": "https://api.example.com/lead", "method": "POST" }
```

`custom-ajax` posts with `fetch` and expects a 2xx. Use `"custom"` instead for a
normal form POST with a full page navigation.

## PHP mailer — classic cPanel hosting

Drop a `contact.php` next to the built files and point at it:

```json
"form": { "provider": "custom", "action": "contact.php", "method": "POST" }
```

## No endpoint

The form degrades to a `mailto:` link and the build warns:

```
! The contact form falls back to a mailto: link (service@example.com).
  Set site.form.action to a real endpoint before launch.
```

`mailto:` forms lose a large share of enquiries. Do not ship a client this way.

## Spam

Every generated form includes a hidden `_gotcha` honeypot field, which Formspree
and most endpoints respect automatically. For heavier protection add a captcha at
the endpoint rather than in the page.

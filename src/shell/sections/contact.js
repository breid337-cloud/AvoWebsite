import { escapeHtml } from '../../util/text.js';
import { attrs, section, sectionHeader, button } from '../components.js';
import { icon } from '../icons.js';
import { telHref, formatPhone, formatAddress } from '../../profile/normalize.js';
import { DAYS } from '../../profile/schema.js';

/**
 * Contact details plus an enquiry form.
 *
 * Static hosting has no server, so the form posts to whatever endpoint the
 * profile configures (Formspree, Netlify Forms, a PHP mailer). With no endpoint
 * set we render a mailto form and say so in the build warnings rather than
 * shipping a form that silently drops leads.
 */
export function renderContact(ctx, config = {}) {
  const { profile, link } = ctx;
  const address = formatAddress(profile.contact.address);
  const form = profile.site.form ?? {};
  const compact = !!config.compact;

  const details = `<ul class="contact-list">
${profile.contact.phone ? `  <li><span class="contact-list__icon">${icon('phone')}</span><div><span class="contact-list__label">Phone</span><a class="contact-list__value" href="tel:${escapeHtml(telHref(profile.contact.phone))}" data-cta="contact-phone">${escapeHtml(formatPhone(profile.contact.phone))}</a></div></li>` : ''}
${profile.contact.email ? `  <li><span class="contact-list__icon">${icon('mail')}</span><div><span class="contact-list__label">Email</span><a class="contact-list__value" href="mailto:${escapeHtml(profile.contact.email)}">${escapeHtml(profile.contact.email)}</a></div></li>` : ''}
${address ? `  <li><span class="contact-list__icon">${icon('pin')}</span><div><span class="contact-list__label">Address</span><address class="contact-list__value">${escapeHtml(address)}</address>${profile.contact.mapsUrl ? `<a class="contact-list__link" href="${escapeHtml(profile.contact.mapsUrl)}" target="_blank" rel="noopener">Get directions</a>` : ''}</div></li>` : ''}
${profile.contact.hours.length ? `  <li><span class="contact-list__icon">${icon('clock')}</span><div><span class="contact-list__label">Hours</span>
    <table class="hours hours--inline"><tbody>
${DAYS.filter((d) => profile.contact.hours.some((h) => h.day === d)).map((day) => {
    const e = profile.contact.hours.find((h) => h.day === day);
    return `      <tr${e.closed ? ' class="is-closed"' : ''}><th scope="row">${day.charAt(0).toUpperCase() + day.slice(1, 3)}</th><td>${escapeHtml(e.closed ? (e.note || 'Closed') : `${e.open} – ${e.close}`)}</td></tr>`;
  }).join('\n')}
    </tbody></table></div></li>` : ''}
</ul>`;

  const provider = form.provider ?? 'none';
  // Netlify Forms posts back to the page's own URL, so an empty action is
  // correct there — falling back to mailto: would break the submission.
  const selfPosting = provider === 'netlify';
  const action = form.action || (selfPosting || !profile.contact.email ? '' : `mailto:${profile.contact.email}`);
  const isMailto = action.startsWith('mailto:');

  const formHtml = `<form class="contact-form"${attrs({
    action: action || null,
    method: isMailto ? 'post' : (form.method || 'POST'),
    enctype: isMailto ? 'text/plain' : null,
    'data-form-provider': provider,
    'data-netlify': provider === 'netlify' ? 'true' : null,
    name: provider === 'netlify' ? 'contact' : null,
    novalidate: true,
  })}>
  ${provider === 'netlify' ? '<input type="hidden" name="form-name" value="contact">' : ''}
  <p class="visually-hidden" aria-hidden="true">
    <label>Leave this field empty<input name="_gotcha" tabindex="-1" autocomplete="off"></label>
  </p>
  <div class="field-row">
    <p class="field">
      <label for="cf-name">Your name <span aria-hidden="true">*</span></label>
      <input id="cf-name" name="name" type="text" autocomplete="name" required>
      <span class="field__error" data-error-for="cf-name" hidden></span>
    </p>
    <p class="field">
      <label for="cf-phone">Phone</label>
      <input id="cf-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel">
    </p>
  </div>
  <p class="field">
    <label for="cf-email">Email <span aria-hidden="true">*</span></label>
    <input id="cf-email" name="email" type="email" autocomplete="email" required>
    <span class="field__error" data-error-for="cf-email" hidden></span>
  </p>
  ${profile.services.length ? `<p class="field">
    <label for="cf-service">What do you need?</label>
    <select id="cf-service" name="service">
      <option value="">Please choose…</option>
${profile.services.map((s) => `      <option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('\n')}
      <option value="Something else">Something else</option>
    </select>
  </p>` : ''}
  <p class="field">
    <label for="cf-message">Message <span aria-hidden="true">*</span></label>
    <textarea id="cf-message" name="message" rows="5" required></textarea>
    <span class="field__error" data-error-for="cf-message" hidden></span>
  </p>
  <div class="contact-form__foot">
    <button class="btn btn--primary" type="submit">Send enquiry</button>
    <p class="contact-form__note">We reply to every enquiry, usually the same working day.</p>
  </div>
  <p class="form-status" role="status" aria-live="polite" data-form-status hidden></p>
</form>`;

  const head = sectionHeader({
    eyebrow: compact ? 'Get in touch' : null,
    title: config.heading ?? (compact ? 'Request a quote' : 'Contact us'),
    intro: config.intro,
    id: 'contact-title',
  });

  const map = profile.contact.geo?.lat && profile.contact.geo?.lng
    ? `<div class="contact__map">
  <a class="contact__map-link" href="https://www.openstreetmap.org/?mlat=${profile.contact.geo.lat}&amp;mlon=${profile.contact.geo.lng}#map=16/${profile.contact.geo.lat}/${profile.contact.geo.lng}" target="_blank" rel="noopener">
    ${icon('pin')} View on the map
  </a>
</div>`
    : '';

  return section({
    id: 'contact',
    className: 'contact',
    tone: compact ? 'surface' : null,
    labelledBy: 'contact-title',
    children: `${head}
<div class="contact__grid">
  <div class="contact__details">
    ${details}
    ${map}
  </div>
  <div class="contact__form">
    ${formHtml}
  </div>
</div>`,
  });
}

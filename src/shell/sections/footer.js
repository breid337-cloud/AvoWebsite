import { escapeHtml } from '../../util/text.js';
import { brandLogo } from '../components.js';
import { icon, brandIcon } from '../icons.js';
import { telHref, formatPhone, formatAddress } from '../../profile/normalize.js';
import { SOCIAL_NETWORKS, DAYS } from '../../profile/schema.js';

export function renderFooter(ctx) {
  const { profile, nav, link, asset, buildInfo } = ctx;
  const year = new Date().getFullYear();
  const name = profile.business.name;
  const address = formatAddress(profile.contact.address);

  const socialLinks = SOCIAL_NETWORKS.filter((n) => profile.social[n.key])
    .map((n) => `<li><a href="${escapeHtml(profile.social[n.key])}" target="_blank" rel="noopener me" aria-label="${escapeHtml(name)} on ${n.label}">${brandIcon(n.icon)}</a></li>`)
    .join('');

  const hours = profile.contact.hours.length
    ? `<div class="footer__col">
  <h2 class="footer__heading">Opening hours</h2>
  <table class="hours">
    <tbody>
${DAYS.filter((d) => profile.contact.hours.some((h) => h.day === d)).map((day) => {
      const entry = profile.contact.hours.find((h) => h.day === day);
      const label = day.charAt(0).toUpperCase() + day.slice(1);
      const value = entry.closed ? (entry.note || 'Closed') : `${entry.open} – ${entry.close}`;
      return `      <tr${entry.closed ? ' class="is-closed"' : ''}><th scope="row">${label}</th><td>${escapeHtml(value)}</td></tr>`;
    }).join('\n')}
    </tbody>
  </table>
  ${profile.contact.hoursNote ? `<p class="footer__note">${escapeHtml(profile.contact.hoursNote)}</p>` : ''}
</div>`
    : '';

  return `<footer class="site-footer">
  <div class="container site-footer__inner">
    <div class="footer__col footer__col--brand">
      <a class="brand brand--footer" href="${link('')}">${
        brandLogo(profile, asset)
      }</a>
      ${profile.business.tagline ? `<p class="footer__tagline">${escapeHtml(profile.business.tagline)}</p>` : ''}
      ${socialLinks ? `<ul class="social">${socialLinks}</ul>` : ''}
    </div>

    <div class="footer__col">
      <h2 class="footer__heading">Contact</h2>
      <ul class="footer__list">
        ${profile.contact.phone ? `<li>${icon('phone')}<a href="tel:${escapeHtml(telHref(profile.contact.phone))}" data-cta="footer-phone">${escapeHtml(formatPhone(profile.contact.phone))}</a></li>` : ''}
        ${profile.contact.email ? `<li>${icon('mail')}<a href="mailto:${escapeHtml(profile.contact.email)}">${escapeHtml(profile.contact.email)}</a></li>` : ''}
        ${address ? `<li>${icon('pin')}<address>${escapeHtml(address)}</address></li>` : ''}
      </ul>
    </div>

    <div class="footer__col">
      <h2 class="footer__heading">Site</h2>
      <ul class="footer__list footer__list--plain">
${nav.map((item) => `        <li><a href="${item.href}">${escapeHtml(item.label)}</a></li>`).join('\n')}
      </ul>
    </div>

    ${hours}
  </div>

  <div class="container site-footer__legal">
    <p>&copy; ${year} ${escapeHtml(profile.business.legalName || name)}. All rights reserved.</p>
    ${profile.business.serviceArea.length ? `<p class="footer__areas">Serving ${escapeHtml(profile.business.serviceArea.join(', '))}</p>` : ''}
    ${profile.business.licenses.length ? `<p class="footer__licence">${escapeHtml(profile.business.licenses.join(' · '))}</p>` : ''}
  </div>
</footer>`;
}

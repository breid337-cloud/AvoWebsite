import { qsa, rawText } from '../../util/html.js';
import { squash } from '../../util/text.js';
import { DAYS } from '../../profile/schema.js';

const LOCAL_BUSINESS_TYPES = /^(LocalBusiness|Organization|Corporation|Store|Restaurant|Dentist|Physician|MedicalBusiness|HomeAndConstructionBusiness|Plumber|Electrician|HVACBusiness|RoofingContractor|GeneralContractor|Locksmith|MovingCompany|AutoRepair|AutomotiveBusiness|BeautySalon|HairSalon|DaySpa|HealthAndBeautyBusiness|ProfessionalService|LegalService|Attorney|AccountingService|InsuranceAgency|RealEstateAgent|ChildCare|Veterinary|VeterinaryCare|FoodEstablishment|Bakery|Cafe|BarOrPub|EntertainmentBusiness|SportsActivityLocation|ExerciseGym|Landscaper|PestControl|CleaningService|SelfStorage|FinancialService|TravelAgency|Florist|Photographer|PetStore|GardenStore|HardwareStore|FurnitureStore|ClothingStore|JewelryStore|ShoeStore|SportingGoodsStore|LiquorStore|GroceryStore|ConvenienceStore|Pharmacy|Optician|NailSalon|TattooParlor|Notary|EmploymentAgency|Electrician)$/i;

const DAY_MAP = {
  monday: 'monday', mo: 'monday', mon: 'monday',
  tuesday: 'tuesday', tu: 'tuesday', tue: 'tuesday', tues: 'tuesday',
  wednesday: 'wednesday', we: 'wednesday', wed: 'wednesday',
  thursday: 'thursday', th: 'thursday', thu: 'thursday', thur: 'thursday', thurs: 'thursday',
  friday: 'friday', fr: 'friday', fri: 'friday',
  saturday: 'saturday', sa: 'saturday', sat: 'saturday',
  sunday: 'sunday', su: 'sunday', sun: 'sunday',
  publicholidays: 'holiday',
};

/** Pull every JSON-LD object out of a document, flattening @graph and arrays. */
export function collectJsonLd(doc) {
  const out = [];
  for (const script of qsa(doc, 'script[type="application/ld+json"]')) {
    const raw = rawText(script).trim();
    if (!raw) continue;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Some CMS plugins emit trailing commas or stray HTML comments.
      try {
        parsed = JSON.parse(raw.replace(/<!--[\s\S]*?-->/g, '').replace(/,\s*([}\]])/g, '$1'));
      } catch {
        continue;
      }
    }
    flatten(parsed, out);
  }
  return out;
}

function flatten(node, out, depth = 0) {
  if (!node || depth > 6) return;
  if (Array.isArray(node)) {
    for (const item of node) flatten(item, out, depth + 1);
    return;
  }
  if (typeof node !== 'object') return;
  if (Array.isArray(node['@graph'])) {
    for (const item of node['@graph']) flatten(item, out, depth + 1);
  }
  if (node['@type']) out.push(node);
  // Nested entities worth surfacing on their own (reviews, sub-organisations).
  for (const key of ['review', 'reviews', 'makesOffer', 'hasOfferCatalog', 'itemListElement', 'subOrganization', 'employee', 'member']) {
    if (node[key]) flatten(node[key], out, depth + 1);
  }
}

const typesOf = (node) => (Array.isArray(node['@type']) ? node['@type'] : [node['@type']]).filter(Boolean).map(String);
const hasType = (node, re) => typesOf(node).some((t) => re.test(t.replace(/^https?:\/\/schema\.org\//, '')));
const val = (v) => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return squash(String(v));
  if (Array.isArray(v)) return val(v[0]);
  if (typeof v === 'object') return val(v.name ?? v['@value'] ?? v.url ?? v.text ?? '');
  return '';
};
const urlOf = (v) => {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return urlOf(v[0]);
  if (typeof v === 'object') return String(v.url ?? v.contentUrl ?? v['@id'] ?? '').trim();
  return '';
};
const list = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** Map JSON-LD nodes onto a partial BusinessProfile. */
export function jsonLdToProfile(nodes) {
  const patch = { business: {}, contact: { address: {}, geo: {} }, brand: {}, social: {}, services: [], faqs: [], testimonials: [], team: [] };
  let found = false;

  const business = nodes.find((n) => hasType(n, LOCAL_BUSINESS_TYPES));
  if (business) {
    found = true;
    patch.business.name = val(business.name ?? business.legalName);
    patch.business.legalName = val(business.legalName);
    patch.business.description = val(business.description);
    patch.business.category = val(business.additionalType) || typesOf(business).find((t) => !/^(LocalBusiness|Organization)$/i.test(t)) || '';
    patch.business.priceRange = val(business.priceRange);
    patch.business.founded = (val(business.foundingDate) || '').slice(0, 4);
    patch.business.serviceArea = list(business.areaServed).map(val).filter(Boolean);

    patch.contact.phone = val(business.telephone);
    patch.contact.email = val(business.email).replace(/^mailto:/i, '');

    const address = list(business.address)[0];
    if (address && typeof address === 'object') {
      patch.contact.address = {
        street: val(address.streetAddress),
        city: val(address.addressLocality),
        region: val(address.addressRegion),
        postalCode: val(address.postalCode),
        country: val(address.addressCountry),
      };
    } else if (typeof address === 'string') {
      patch.contact.address = { street: squash(address) };
    }

    const geo = list(business.geo)[0];
    if (geo && typeof geo === 'object') {
      const lat = Number(geo.latitude);
      const lng = Number(geo.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) patch.contact.geo = { lat, lng };
    }

    patch.contact.hours = parseOpeningHours(business);

    const logo = urlOf(business.logo);
    if (logo) patch.brand.logo = logo;

    for (const same of list(business.sameAs).map(urlOf).filter(Boolean)) {
      patch.social[`_url_${Object.keys(patch.social).length}`] = same;
    }
  }

  // Services / offers
  for (const node of nodes) {
    if (hasType(node, /^(Service|Product|Offer)$/i)) {
      const name = val(node.name ?? node.itemOffered);
      if (!name) continue;
      patch.services.push({
        name,
        summary: val(node.description),
        price: val(node.price ?? node.priceSpecification),
        image: urlOf(node.image),
      });
      found = true;
    }
    if (hasType(node, /^ListItem$/i) && node.item) {
      const name = val(node.item);
      if (name && node.item?.['@type'] && /Service|Product/i.test(String(node.item['@type']))) {
        patch.services.push({ name, summary: val(node.item.description), image: urlOf(node.item.image) });
      }
    }
  }

  // FAQs
  for (const node of nodes) {
    if (!hasType(node, /^FAQPage$/i)) continue;
    for (const q of list(node.mainEntity)) {
      const question = val(q?.name ?? q?.question);
      const answer = squash(stripTags(val(q?.acceptedAnswer?.text ?? q?.acceptedAnswer)));
      if (question && answer) { patch.faqs.push({ question, answer }); found = true; }
    }
  }
  for (const node of nodes) {
    if (!hasType(node, /^Question$/i)) continue;
    const question = val(node.name);
    const answer = squash(stripTags(val(node.acceptedAnswer?.text ?? node.acceptedAnswer)));
    if (question && answer) { patch.faqs.push({ question, answer }); found = true; }
  }

  // Reviews
  for (const node of nodes) {
    if (!hasType(node, /^Review$/i)) continue;
    const quote = squash(stripTags(val(node.reviewBody ?? node.description)));
    if (!quote) continue;
    patch.testimonials.push({
      quote,
      author: val(node.author),
      rating: Number(node.reviewRating?.ratingValue) || null,
      date: val(node.datePublished),
      source: 'schema.org markup',
    });
    found = true;
  }

  // People
  for (const node of nodes) {
    if (!hasType(node, /^Person$/i)) continue;
    const name = val(node.name);
    if (!name) continue;
    patch.team.push({ name, role: val(node.jobTitle), photo: urlOf(node.image), bio: val(node.description) });
    found = true;
  }

  return found ? patch : null;
}

function stripTags(str) {
  return String(str ?? '').replace(/<[^>]+>/g, ' ');
}

function parseOpeningHours(business) {
  const out = [];
  for (const spec of list(business.openingHoursSpecification)) {
    if (!spec || typeof spec !== 'object') continue;
    const days = list(spec.dayOfWeek).map((d) => normalizeDay(val(d))).filter(Boolean);
    const opens = val(spec.opens);
    const closes = val(spec.closes);
    for (const day of days) {
      out.push({ day, open: to12h(opens), close: to12h(closes), closed: !opens || opens === closes });
    }
  }
  // The older string form: "Mo-Fr 09:00-17:00"
  for (const entry of list(business.openingHours)) {
    const text = val(entry);
    const m = /^([A-Za-z]{2,9})\s*(?:-\s*([A-Za-z]{2,9}))?\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(text.trim());
    if (!m) continue;
    const start = normalizeDay(m[1]);
    const end = m[2] ? normalizeDay(m[2]) : start;
    if (!start) continue;
    for (const day of dayRange(start, end)) {
      out.push({ day, open: to12h(m[3]), close: to12h(m[4]), closed: false });
    }
  }
  return out;
}

function normalizeDay(value) {
  const key = String(value).replace(/^https?:\/\/schema\.org\//, '').toLowerCase().replace(/[^a-z]/g, '');
  return DAY_MAP[key] ?? null;
}

function dayRange(start, end) {
  const si = DAYS.indexOf(start);
  const ei = DAYS.indexOf(end);
  if (si === -1) return [];
  if (ei === -1 || ei === si) return [start];
  const out = [];
  for (let i = si; ; i = (i + 1) % 7) {
    out.push(DAYS[i]);
    if (i === ei) break;
    if (out.length > 7) break;
  }
  return out;
}

/** "17:00" -> "5:00 PM"; leaves already-formatted values alone. */
export function to12h(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value ?? '').trim());
  if (!m) return squash(value ?? '');
  let hour = Number(m[1]);
  const minute = m[2];
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${period}`;
}

// ===== Crossref 连接器（免费、无 Key、题录质量高）=====
import { getJSON, withMailto } from '../net/http.js';

function mapItem(it, query) {
  const authors = (it.author || []).map((a) => {
    const given = a.given || '';
    const family = a.family || '';
    return family ? (family + (given ? ', ' + given : '')) : (a.name || '');
  }).filter(Boolean);

  const year = (it.issued && it['issued']['date-parts'] && it['issued']['date-parts'][0] &&
    it['issued']['date-parts'][0][0]) || '';

  const venue = Array.isArray(it['container-title']) ? (it['container-title'][0] || '') : '';

  return {
    title: Array.isArray(it.title) ? (it.title[0] || '') : (it.title || ''),
    authors,
    year,
    doi: it.DOI || '',
    venue,
    type: it.type || '',
    citedBy: it['is-referenced-by-count'] || 0,
    abstract: (it.abstract || '').replace(/<[^>]+>/g, '').slice(0, 1600),
    url: it.URL || (it.DOI ? 'https://doi.org/' + it.DOI : ''),
    pdfUrl: '',
    relevance: 0.55,
    source: 'crossref',
    query
  };
}

export async function searchCrossref(query, opts = {}) {
  const rows = opts.perPage || 20;
  const params = new URLSearchParams({
    'query.bibliographic': query,
    rows: String(rows),
    select: 'DOI,title,author,issued,container-title,abstract,is-referenced-by-count,URL,type'
  });
  if (opts.fromYear) params.set('filter', 'from-pub-date:' + opts.fromYear + '-01-01');

  const url = withMailto('https://api.crossref.org/works?' + params.toString());
  const json = await getJSON(url, { force: opts.force });
  const items = (json.message && json.message.items) || [];
  return items.map((it) => mapItem(it, query));
}

export async function getCrossrefByDoi(doi) {
  if (!doi) return null;
  try {
    const url = withMailto('https://api.crossref.org/works/' + encodeURIComponent(doi));
    const json = await getJSON(url);
    return mapItem(json.message, '');
  } catch (e) {
    return null;
  }
}

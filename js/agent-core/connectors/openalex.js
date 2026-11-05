// ===== OpenAlex 连接器（免费、无 Key、支持 CORS）=====
import { getJSON, withMailto } from '../net/http.js';

// 把 OpenAlex 的倒排索引还原成摘要
function rebuildAbstract(inv) {
  if (!inv) return '';
  const pairs = [];
  for (const word in inv) {
    for (const pos of inv[word]) pairs.push([pos, word]);
  }
  pairs.sort((a, b) => a[0] - b[0]);
  return pairs.map((p) => p[1]).join(' ');
}

function mapWork(w, query) {
  const authors = (w.authorships || [])
    .map((a) => a.author && a.author.display_name)
    .filter(Boolean);
  const venue = w.primary_location && w.primary_location.source
    ? w.primary_location.source.display_name : '';
  const pdfUrl = w.best_oa_location && w.best_oa_location.pdf_url;
  return {
    title: w.title || w.display_name || '',
    authors,
    year: w.publication_year || '',
    doi: (w.doi || '').replace('https://doi.org/', ''),
    venue,
    type: w.type || '',
    citedBy: w.cited_by_count || 0,
    abstract: rebuildAbstract(w.abstract_inverted_index).slice(0, 1600),
    url: w.doi ? 'https://doi.org/' + (w.doi || '').replace('https://doi.org/', '') : (w.id || ''),
    pdfUrl: pdfUrl || '',
    relevance: w.relevance_score ? Math.min(1, w.relevance_score) : 0.55,
    source: 'openalex',
    query
  };
}

export async function searchOpenAlex(query, opts = {}) {
  const perPage = opts.perPage || 20;
  const fromYear = opts.fromYear;
  const params = new URLSearchParams({
    search: query,
    'per-page': String(perPage),
    sort: opts.sort || 'relevance_score:desc'
  });
  if (fromYear) params.set('filter', 'from_publication_date:' + fromYear + '-01-01');

  const url = withMailto('https://api.openalex.org/works?' + params.toString());
  const json = await getJSON(url, { force: opts.force });
  return (json.results || []).map((w) => mapWork(w, query));
}

// 按 DOI 精取单篇（补全摘要）
export async function getWorkByDoi(doi) {
  if (!doi) return null;
  const url = withMailto('https://api.openalex.org/works/https://doi.org/' + encodeURIComponent(doi));
  try {
    const w = await getJSON(url);
    return mapWork(w, '');
  } catch (e) {
    return null;
  }
}

// ===== Semantic Scholar 连接器（免费额度，未认证约 2 请求/秒）=====
import { getJSON } from '../net/http.js';
import { getConfig } from '../config.js';

const FIELDS = 'title,abstract,year,authors,venue,externalIds,citationCount,openAccessPdf,url,publicationTypes';

function mapPaper(p, query) {
  const ext = p.externalIds || {};
  return {
    title: p.title || '',
    authors: (p.authors || []).map((a) => a.name).filter(Boolean),
    year: p.year || '',
    doi: ext.DOI || '',
    venue: p.venue || '',
    type: (p.publicationTypes || [])[0] || '',
    citedBy: p.citationCount || 0,
    abstract: (p.abstract || '').slice(0, 1600),
    url: p.url || (ext.DOI ? 'https://doi.org/' + ext.DOI : ''),
    pdfUrl: (p.openAccessPdf && p.openAccessPdf.url) || '',
    relevance: 0.6,
    source: 'semanticscholar',
    query
  };
}

export async function searchSemanticScholar(query, opts = {}) {
  const limit = opts.perPage || 20;
  const params = new URLSearchParams({ query, limit: String(limit), fields: FIELDS });
  if (opts.fromYear) params.set('year', opts.fromYear + '-');

  const url = 'https://api.semanticscholar.org/graph/v1/paper/search?' + params.toString();
  const key = getConfig().scholar.s2Key;
  const json = await getJSON(url, { force: opts.force, headers: key ? { 'x-api-key': key } : {} });
  const data = (json && json.data) || [];
  return data.map((p) => mapPaper(p, query));
}

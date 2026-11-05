// ===== 中文文献来源（合规方案）=====
// 说明：知网（CNKI）、万方、维普、国家哲学社会科学文献中心均无公开检索 API，
// 且站点条款禁止程序化抓取。这里不做爬取，只生成规范检索链接供一键打开，
// 由用户在自己的登录态下取用，检索产物再回到工作台入库。

export const CNKI_HOSTS = {
  cnki: 'https://kns.cnki.net/kns8s/defaultresult/index',
  wanfang: 'https://s.wanfangdata.com.cn/paper',
  ncpssd: 'https://www.ncpssd.cn/search/index.html'
};

export function buildCnkiUrl(query, opts = {}) {
  const params = new URLSearchParams();
  params.set('kw', query);
  if (opts.field) params.set('korder', opts.field); // TI 篇名 / KY 关键词 / AB 摘要
  return CNKI_HOSTS.cnki + '?' + params.toString();
}

export function buildWanfangUrl(query) {
  return CNKI_HOSTS.wanfang + '?' + new URLSearchParams({ q: query }).toString();
}

export function buildNcpssdUrl(query) {
  return CNKI_HOSTS.ncpssd + '?' + new URLSearchParams({ searchWord: query }).toString();
}

/** 生成一组可直接点开的检索链接（用于 UI） */
export function buildChineseSourceLinks(query) {
  return [
    { name: '知网 CNKI', url: buildCnkiUrl(query), note: '需登录后取用，避免批量抓取' },
    { name: '万方数据', url: buildWanfangUrl(query), note: '需登录' },
    { name: '国家哲学社会科学文献中心', url: buildNcpssdUrl(query), note: '免费注册，社科文献齐全' }
  ];
}

/**
 * 中文检索式构造：把自然语言主题转成 CNKI 高级检索表达式
 * 供用户直接粘贴到知网高级检索框
 */
export function buildCnkiExpression(concepts) {
  const groups = (concepts || []).filter((g) => g && g.length);
  if (!groups.length) return '';
  return groups
    .map((g) => '(' + g.map((w) => 'SU="' + w + '"').join(' + ') + ')')
    .join(' * ');
}

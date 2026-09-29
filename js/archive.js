/* ============================================================
 * 国安学术工作台 - 存档库模块
 * 包含: ArchiveStore(数据层) / 存档库页面 / 文章详情 / 更新中心
 * 依赖: app.js (全局函数 toast/navigate/saveData 等), ECharts
 * ============================================================ */

(function () {
  'use strict';

  // ===== 配置 =====
  const INDEX_URL = 'data/index.json?v=' + Date.now();
  const ARTICLES_BASE = 'data/articles/';
  const DB_URL = 'data/archive.db?v=' + Date.now();

  // 评价维度定义（与后端一致）
  const EVAL_DIMENSIONS = [
    { key: 'D1', name: '选题价值', weight: 12 },
    { key: 'D2', name: '学术创新', weight: 15 },
    { key: 'D3', name: '理论贡献', weight: 12 },
    { key: 'D4', name: '方法严谨', weight: 12 },
    { key: 'D5', name: '论证逻辑', weight: 10 },
    { key: 'D6', name: '证据质量', weight: 10 },
    { key: 'D7', name: '前沿把握', weight: 8 },
    { key: 'D8', name: '学术规范', weight: 5 },
    { key: 'D9', name: '政策价值', weight: 10 },
    { key: 'D10', name: '写作表达', weight: 6 },
  ];

  // ===== 统一 HTTP 请求（超时+重试+降级）=====
  window.httpGetJson = async function (url, opts = {}) {
    const timeout = opts.timeout || 10000;
    const retries = opts.retries !== undefined ? opts.retries : 2;
    const label = opts.label || '数据';
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } catch (e) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        if (opts.fallback !== undefined) return opts.fallback;
        if (typeof toast === 'function') toast(label + '加载失败：' + (e.message || e) + '，请检查网络后重试');
        throw e;
      }
    }
  };

  // ===== ArchiveStore 数据层 =====
  const ArchiveStore = {
    _index: null,
    _db: null,
    _dbLoading: false,
    _articleCache: {},

    async getIndex(force) {
      if (this._index && !force) return this._index;
      try {
        this._index = await window.httpGetJson(INDEX_URL, {
          label: '存档索引', fallback: { items: [], journals: [], categories: [], total: 0, updated_at: '' }
        });
      } catch (e) {
        this._index = { items: [], journals: [], categories: [], total: 0, updated_at: '' };
      }
      return this._index;
    },

    async getArticle(id) {
      if (this._articleCache[id]) return this._articleCache[id];
      // 先从 index 找 crawl_date
      const idx = await this.getIndex();
      const item = idx.items.find(i => i.id === id);
      if (!item) return null;
      const date = item.crawl_date;
      try {
        const data = await window.httpGetJson(ARTICLES_BASE + date + '/' + id + '.json', {
          label: '文章详情', timeout: 15000, fallback: null
        });
        if (data) {
          this._articleCache[id] = data;
          return data;
        }
      } catch (e) { }
      // 降级：用 index 中的元数据
      return { article: item, analysis: null, evaluation: null };
    },

    async search(filters) {
      const idx = await this.getIndex();
      let items = [...idx.items];
      const f = filters || {};

      if (f.keyword) {
        const kw = f.keyword.toLowerCase();
        items = items.filter(i =>
          (i.title || '').toLowerCase().includes(kw) ||
          (i.authors || '').toLowerCase().includes(kw) ||
          (i.keywords || []).some(k => k.toLowerCase().includes(kw))
        );
      }
      if (f.journals && f.journals.length) {
        items = items.filter(i => f.journals.includes(i.journal));
      }
      if (f.categories && f.categories.length) {
        items = items.filter(i => f.categories.includes(i.category));
      }
      if (f.grade) {
        items = items.filter(i => i.grade === f.grade);
      }
      if (f.minScore !== undefined && f.minScore !== null) {
        items = items.filter(i => i.total_score !== null && i.total_score !== undefined && i.total_score >= f.minScore);
      }
      if (f.author) {
        const a = f.author.toLowerCase();
        items = items.filter(i => (i.authors || '').toLowerCase().includes(a));
      }
      if (f.dateFrom) {
        items = items.filter(i => i.crawl_date >= f.dateFrom);
      }
      if (f.dateTo) {
        items = items.filter(i => i.crawl_date <= f.dateTo);
      }

      // 排序
      const sort = f.sort || 'date_desc';
      if (sort === 'date_desc') items.sort((a, b) => (b.crawl_date || '').localeCompare(a.crawl_date || ''));
      else if (sort === 'date_asc') items.sort((a, b) => (a.crawl_date || '').localeCompare(b.crawl_date || ''));
      else if (sort === 'score_desc') items.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
      else if (sort === 'score_asc') items.sort((a, b) => (a.total_score || 0) - (b.total_score || 0));
      else if (sort === 'recommend_desc') items.sort((a, b) => (b.recommend_level || 0) - (a.recommend_level || 0));

      const total = items.length;
      const page = f.page || 1;
      const pageSize = f.pageSize || 20;
      const paged = items.slice((page - 1) * pageSize, page * pageSize);
      return { items: paged, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    },

    async getStats() {
      const idx = await this.getIndex();
      const items = idx.items;
      const byJournal = {};
      const byCategory = {};
      const byDate = {};
      const scoreDist = { S: 0, A: 0, B: 0, C: 0, unrated: 0 };
      let totalScore = 0, scored = 0;

      items.forEach(i => {
        byJournal[i.journal || '未知'] = (byJournal[i.journal || '未知'] || 0) + 1;
        byCategory[i.category || '未分类'] = (byCategory[i.category || '未分类'] || 0) + 1;
        byDate[i.crawl_date] = (byDate[i.crawl_date] || 0) + 1;
        if (i.grade) scoreDist[i.grade] = (scoreDist[i.grade] || 0) + 1;
        else scoreDist.unrated++;
        if (i.total_score !== null && i.total_score !== undefined) { totalScore += i.total_score; scored++; }
      });

      return {
        total: items.length,
        byJournal, byCategory, byDate, scoreDist,
        avgScore: scored ? (totalScore / scored).toFixed(1) : 0,
        updatedAt: idx.updated_at || '',
        journals: idx.journals || [],
        categories: idx.categories || [],
      };
    },

    clearCache() {
      this._index = null;
      this._articleCache = {};
    }
  };

  window.ArchiveStore = ArchiveStore;

  // ===== 灰度 ECharts 主题 =====
  const GRAY_COLORS = ['#000000', '#333333', '#555555', '#777777', '#999999', '#bbbbbb', '#d4d4d4', '#e8e8e8'];

  function renderGrayRadar(containerId, dimensionScores) {
    const el = document.getElementById(containerId);
    if (!el || typeof echarts === 'undefined') return;
    const chart = echarts.init(el);
    const indicator = EVAL_DIMENSIONS.map(d => ({
      name: d.name, max: 10,
      axisName: { color: '#333', fontSize: 11 }
    }));
    const values = EVAL_DIMENSIONS.map(d => dimensionScores[d.key] || 0);
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { backgroundColor: '#fff', borderColor: '#ccc', textStyle: { color: '#333' } },
      radar: {
        indicator,
        shape: 'polygon',
        splitNumber: 5,
        axisName: { color: '#333', fontSize: 11 },
        splitLine: { lineStyle: { color: '#ccc' } },
        splitArea: { areaStyle: { color: ['#fff', '#f5f5f5'] } },
        axisLine: { lineStyle: { color: '#999' } },
      },
      series: [{
        type: 'radar',
        data: [{
          value: values,
          name: '维度评分',
          areaStyle: { color: 'rgba(0,0,0,0.15)' },
          lineStyle: { color: '#000', width: 2 },
          itemStyle: { color: '#000' },
        }]
      }]
    });
    window.addEventListener('resize', () => chart.resize());
    return chart;
  }

  function renderGrayBar(containerId, data, title) {
    const el = document.getElementById(containerId);
    if (!el || typeof echarts === 'undefined') return;
    const chart = echarts.init(el);
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 15);
    chart.setOption({
      backgroundColor: 'transparent',
      title: { text: title, left: 'center', textStyle: { fontSize: 13, color: '#333' } },
      tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#ccc', textStyle: { color: '#333' } },
      grid: { left: 100, right: 20, top: 40, bottom: 20 },
      xAxis: { type: 'value', axisLine: { lineStyle: { color: '#999' } }, splitLine: { lineStyle: { color: '#eee' } } },
      yAxis: { type: 'category', data: entries.map(e => e[0]), axisLine: { lineStyle: { color: '#999' } }, axisLabel: { color: '#333', fontSize: 11 } },
      series: [{ type: 'bar', data: entries.map(e => e[1]), itemStyle: { color: '#555' }, barWidth: '60%' }]
    });
    window.addEventListener('resize', () => chart.resize());
    return chart;
  }

  function renderCalendarHeatmap(containerId, byDate) {
    const el = document.getElementById(containerId);
    if (!el || typeof echarts === 'undefined') return;
    const chart = echarts.init(el);
    const dates = Object.keys(byDate).sort();
    if (!dates.length) { el.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">暂无收录数据</div>'; return; }
    const data = dates.map(d => [d, byDate[d]]);
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];
    chart.setOption({
      backgroundColor: 'transparent',
      title: { text: '收录日历', left: 'center', textStyle: { fontSize: 13, color: '#333' } },
      tooltip: { backgroundColor: '#fff', borderColor: '#ccc', textStyle: { color: '#333' } },
      visualMap: { min: 0, max: Math.max(...Object.values(byDate)), calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#f0f0f0', '#999', '#333'] }, textStyle: { color: '#333' } },
      calendar: { top: 40, left: 30, right: 30, cellSize: ['auto', 15], range: [minDate.slice(0, 7), maxDate.slice(0, 7)], itemStyle: { borderWidth: 1, borderColor: '#fff' }, yearLabel: { show: false } },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data }]
    });
    window.addEventListener('resize', () => chart.resize());
    return chart;
  }

  window.ArchiveCharts = { renderGrayRadar, renderGrayBar, renderCalendarHeatmap };

  // ===== 评级标签 =====
  function gradeTag(grade) {
    if (!grade) return '<span class="grade-tag grade-c">未评</span>';
    const cls = 'grade grade-' + grade.toLowerCase();
    return '<span class="' + cls + '">' + grade + '</span>';
  }

  function stars(level) {
    if (!level) return '';
    return '★'.repeat(level) + '☆'.repeat(5 - level);
  }

  // ===== 存档库列表页 =====
  let archiveFilters = { keyword: '', journals: [], categories: [], grade: '', minScore: null, author: '', dateFrom: '', dateTo: '', sort: 'date_desc', page: 1 };

  window.renderArchivePage = async function () {
    const mc = document.getElementById('mainContent');
    const idx = await ArchiveStore.getIndex();

    mc.innerHTML = `
      <div class="page-header">
        <h2>📚 存档库</h2>
        <p class="page-sub">共收录 <strong>${idx.total}</strong> 篇文章 · 最后更新 ${idx.updated_at ? idx.updated_at.slice(0, 16).replace('T', ' ') : '未知'}</p>
      </div>
      <div class="archive-filters" id="archiveFilters">
        <div class="filter-row">
          <input type="text" id="fKeyword" placeholder="🔍 关键词（标题/作者/关键词）" value="${archiveFilters.keyword}" style="flex:2;">
          <input type="text" id="fAuthor" placeholder="作者" value="${archiveFilters.author}" style="flex:1;">
          <select id="fGrade" style="flex:1;">
            <option value="">全部评级</option>
            <option value="S" ${archiveFilters.grade === 'S' ? 'selected' : ''}>S 标杆级</option>
            <option value="A" ${archiveFilters.grade === 'A' ? 'selected' : ''}>A 优秀</option>
            <option value="B" ${archiveFilters.grade === 'B' ? 'selected' : ''}>B 良好</option>
            <option value="C" ${archiveFilters.grade === 'C' ? 'selected' : ''}>C 有限</option>
          </select>
          <select id="fSort" style="flex:1;">
            <option value="date_desc" ${archiveFilters.sort === 'date_desc' ? 'selected' : ''}>收录日期↓</option>
            <option value="date_asc" ${archiveFilters.sort === 'date_asc' ? 'selected' : ''}>收录日期↑</option>
            <option value="score_desc" ${archiveFilters.sort === 'score_desc' ? 'selected' : ''}>评分↓</option>
            <option value="recommend_desc" ${archiveFilters.sort === 'recommend_desc' ? 'selected' : ''}>推荐↓</option>
          </select>
        </div>
        <div class="filter-row">
          <span class="filter-label">期刊:</span>
          <div class="chip-group" id="fJournals">
            ${(idx.journals || []).map(j => `<label class="chip"><input type="checkbox" value="${j}" ${archiveFilters.journals.includes(j) ? 'checked' : ''}> ${j}</label>`).join('')}
          </div>
        </div>
        <div class="filter-row">
          <span class="filter-label">分类:</span>
          <div class="chip-group" id="fCategories">
            ${(idx.categories || []).map(c => `<label class="chip"><input type="checkbox" value="${c}" ${archiveFilters.categories.includes(c) ? 'checked' : ''}> ${c}</label>`).join('')}
          </div>
        </div>
        <div class="filter-row">
          <span class="filter-label">日期:</span>
          <input type="date" id="fDateFrom" value="${archiveFilters.dateFrom}" style="width:150px;">
          <span>至</span>
          <input type="date" id="fDateTo" value="${archiveFilters.dateTo}" style="width:150px;">
          <span class="filter-label">最低分:</span>
          <input type="number" id="fMinScore" min="0" max="100" value="${archiveFilters.minScore || ''}" style="width:80px;" placeholder="0-100">
          <button onclick="applyArchiveFilters()" class="btn btn-primary">筛选</button>
          <button onclick="resetArchiveFilters()" class="btn">重置</button>
        </div>
      </div>
      <div id="archiveResults"><div style="padding:40px;text-align:center;color:#999;">加载中...</div></div>
    `;

    // 绑定事件
    document.getElementById('fKeyword').addEventListener('keydown', e => { if (e.key === 'Enter') applyArchiveFilters(); });
    document.getElementById('fAuthor').addEventListener('keydown', e => { if (e.key === 'Enter') applyArchiveFilters(); });
    document.getElementById('fGrade').addEventListener('change', applyArchiveFilters);
    document.getElementById('fSort').addEventListener('change', applyArchiveFilters);

    await applyArchiveFilters(true);
  };

  window.applyArchiveFilters = async function (keepPage) {
    const f = archiveFilters;
    f.keyword = document.getElementById('fKeyword')?.value || '';
    f.author = document.getElementById('fAuthor')?.value || '';
    f.grade = document.getElementById('fGrade')?.value || '';
    f.sort = document.getElementById('fSort')?.value || 'date_desc';
    f.dateFrom = document.getElementById('fDateFrom')?.value || '';
    f.dateTo = document.getElementById('fDateTo')?.value || '';
    const ms = document.getElementById('fMinScore')?.value;
    f.minScore = ms ? parseInt(ms) : null;
    f.journals = Array.from(document.querySelectorAll('#fJournals input:checked')).map(i => i.value);
    f.categories = Array.from(document.querySelectorAll('#fCategories input:checked')).map(i => i.value);
    if (!keepPage) f.page = 1;

    const result = await ArchiveStore.search(f);
    const container = document.getElementById('archiveResults');
    if (!container) return;

    if (result.total === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>没有符合条件的文章</p><p style="font-size:.8rem;color:#999;">试试调整筛选条件，或等待每日自动收录</p></div>';
      return;
    }

    let html = `<div class="result-count">共 <strong>${result.total}</strong> 条结果（第 ${result.page}/${result.totalPages} 页）</div>`;
    html += '<div class="article-list">';
    result.items.forEach(item => {
      html += `
        <div class="article-card" onclick="showArticleDetail('${item.id}')">
          <div class="article-card-header">
            <h3 class="article-card-title">${escHtml(item.title)}</h3>
            <div class="article-card-meta">
              ${item.authors ? '<span>' + escHtml(item.authors) + '</span>' : ''}
              ${item.journal ? '<span class="meta-sep">·</span><span>' + escHtml(item.journal) + '</span>' : ''}
              ${item.year ? '<span class="meta-sep">·</span><span>' + item.year + (item.issue ? '(' + item.issue + ')' : '') + '</span>' : ''}
            </div>
          </div>
          <div class="article-card-footer">
            <span class="article-date">📅 ${item.crawl_date}</span>
            ${item.category ? '<span class="article-category">' + escHtml(item.category) + '</span>' : ''}
            ${item.total_score !== null && item.total_score !== undefined ? '<span class="article-score">' + item.total_score + '分 ' + gradeTag(item.grade) + '</span>' : '<span class="article-score">未评价</span>'}
            ${item.recommend_level ? '<span class="article-recommend">' + stars(item.recommend_level) + '</span>' : ''}
          </div>
          ${(item.keywords && item.keywords.length) ? '<div class="article-keywords">' + item.keywords.slice(0, 4).map(k => '<span class="kw-chip">' + escHtml(k) + '</span>').join('') + '</div>' : ''}
        </div>`;
    });
    html += '</div>';

    // 分页
    if (result.totalPages > 1) {
      html += '<div class="pagination">';
      if (result.page > 1) html += `<button class="btn" onclick="archiveGoPage(${result.page - 1})">上一页</button>`;
      html += `<span class="page-info">${result.page} / ${result.totalPages}</span>`;
      if (result.page < result.totalPages) html += `<button class="btn" onclick="archiveGoPage(${result.page + 1})">下一页</button>`;
      html += '</div>';
    }

    container.innerHTML = html;
  };

  window.resetArchiveFilters = function () {
    archiveFilters = { keyword: '', journals: [], categories: [], grade: '', minScore: null, author: '', dateFrom: '', dateTo: '', sort: 'date_desc', page: 1 };
    renderArchivePage();
  };

  window.archiveGoPage = function (page) {
    archiveFilters.page = page;
    applyArchiveFilters(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ===== 文章详情页 =====
  window.showArticleDetail = async function (id) {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = '<div style="padding:60px 20px;text-align:center;color:#999;">加载文章详情...</div>';

    const data = await ArchiveStore.getArticle(id);
    if (!data || !data.article) {
      mc.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>文章不存在</p><button class="btn" onclick="renderArchivePage()">返回存档库</button></div>';
      return;
    }

    const a = data.article;
    const an = data.analysis || {};
    const ev = data.evaluation || {};

    mc.innerHTML = `
      <div class="detail-header">
        <button class="btn btn-back" onclick="renderArchivePage()">← 返回存档库</button>
        <h2 class="detail-title">${escHtml(a.title)}</h2>
        <div class="detail-meta">
          ${a.authors ? '<span>👤 ' + escHtml(a.authors) + '</span>' : ''}
          ${a.journal ? '<span>📖 ' + escHtml(a.journal) + (a.year ? ' ' + a.year + (a.issue ? '(' + a.issue + ')' : '') : '') + '</span>' : ''}
          ${a.doi ? '<span>🔗 DOI: ' + escHtml(a.doi) + '</span>' : ''}
          ${a.source_url ? '<a href="' + escHtml(a.source_url) + '" target="_blank" class="detail-link">原文链接 ↗</a>' : ''}
          <span>📅 收录: ${a.crawl_date}</span>
          ${a.category ? '<span class="article-category">' + escHtml(a.category) + '</span>' : ''}
        </div>
        ${ev.total_score !== undefined ? '<div class="detail-score-bar"><span class="score-big">' + ev.total_score + '</span><span class="score-unit">/100</span> ' + gradeTag(ev.grade) + ' <span class="recommend-stars">' + stars(ev.recommend_level) + '</span></div>' : ''}
      </div>
      <div class="detail-tabs">
        <button class="tab-btn active" data-tab="abstract" onclick="switchDetailTab('abstract')">📄 摘要</button>
        <button class="tab-btn" data-tab="analysis" onclick="switchDetailTab('analysis')">📝 深度剖析</button>
        <button class="tab-btn" data-tab="evaluation" onclick="switchDetailTab('evaluation')">⭐ 学术评价</button>
        <button class="tab-btn" data-tab="frontier" onclick="switchDetailTab('frontier')">📚 前沿关联</button>
      </div>
      <div class="detail-content" id="detailContent"></div>
    `;

    window._currentArticle = data;
    switchDetailTab('abstract');
  };

  window.switchDetailTab = function (tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    const container = document.getElementById('detailContent');
    const data = window._currentArticle;
    if (!data) return;
    const a = data.article, an = data.analysis || {}, ev = data.evaluation || {};

    if (tab === 'abstract') {
      container.innerHTML = `
        <div class="tab-panel">
          <h3>摘要</h3>
          <p class="abstract-text">${a.abstract ? escHtml(a.abstract) : '<span style="color:#999;">暂无摘要</span>'}</p>
          ${a.keywords ? '<div class="detail-keywords"><strong>关键词:</strong> ' + escHtml(a.keywords) + '</div>' : ''}
          ${a.published_date ? '<p><strong>刊出日期:</strong> ' + escHtml(a.published_date) + '</p>' : ''}
          ${a.source_type ? '<p><strong>收录来源:</strong> ' + escHtml(a.source_type) + '</p>' : ''}
        </div>`;
    } else if (tab === 'analysis') {
      if (!an || !an.core_arg) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>暂无深度剖析</p><p style="font-size:.8rem;color:#999;">该文章可能尚未经过AI剖析</p></div>';
        return;
      }
      let flowHtml = '';
      const flow = an.detailed_flow;
      if (Array.isArray(flow) && flow.length) {
        flowHtml = '<ol class="flow-list">';
        flow.forEach((s, i) => {
          const step = typeof s === 'string' ? { step: '步骤' + (i + 1), detail: s } : s;
          flowHtml += `<li><strong>${escHtml(step.step || '')}</strong><p>${escHtml(step.detail || '')}</p></li>`;
        });
        flowHtml += '</ol>';
      }
      let quotesHtml = '';
      if (Array.isArray(an.quotes) && an.quotes.length) {
        quotesHtml = '<div class="quotes-block"><h4>金句</h4>' + an.quotes.map(q => '<blockquote>' + escHtml(q) + '</blockquote>').join('') + '</div>';
      }
      let theoryHtml = '';
      if (Array.isArray(an.theory_framework) && an.theory_framework.length) {
        theoryHtml = '<div class="theory-block"><h4>理论框架</h4><ul>' + an.theory_framework.map(t => '<li><strong>' + escHtml(t.name || '') + '</strong>: ' + escHtml(t.content || '') + '</li>').join('') + '</ul></div>';
      }
      container.innerHTML = `
        <div class="tab-panel">
          <div class="core-arg"><strong>核心论点:</strong> ${escHtml(an.core_arg || '')}</div>
          ${an.writing_pattern ? '<p><strong>写作范式:</strong> ' + escHtml(an.writing_pattern) + '</p>' : ''}
          <h4>论证流程</h4>${flowHtml || '<p style="color:#999;">暂无</p>'}
          ${quotesHtml}
          ${theoryHtml}
          ${an.llm_model ? '<p class="meta-note">剖析模型: ' + escHtml(an.llm_model) + ' | 提示词版本: ' + escHtml(an.prompt_version || '') + '</p>' : ''}
        </div>`;
    } else if (tab === 'evaluation') {
      if (!ev || !ev.dimension_scores) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><p>暂无学术评价</p><p style="font-size:.8rem;color:#999;">该文章可能尚未经过AI评价</p></div>';
        return;
      }
      const dimScores = ev.dimension_scores;
      const dimReasons = ev.dimension_reasons || {};
      let dimTable = '<table class="dim-table"><tr><th>维度</th><th>分数</th><th>权重</th><th>评语</th></tr>';
      EVAL_DIMENSIONS.forEach(d => {
        const score = dimScores[d.key] || '-';
        dimTable += `<tr><td>${d.name}</td><td class="dim-score">${score}</td><td>${d.weight}%</td><td>${escHtml(dimReasons[d.key] || '')}</td></tr>`;
      });
      dimTable += '</table>';

      container.innerHTML = `
        <div class="tab-panel">
          <div class="eval-header">
            <div id="evalRadar" style="width:320px;height:320px;flex-shrink:0;"></div>
            <div class="eval-summary">
              <div class="score-display"><span class="score-num">${ev.total_score || 0}</span><span class="score-max">/100</span> ${gradeTag(ev.grade)}</div>
              <div class="recommend-display">推荐指数: ${stars(ev.recommend_level || 0)}</div>
              ${ev.relevance_to_user ? '<p class="relevance"><strong>相关度:</strong> ' + escHtml(ev.relevance_to_user) + '</p>' : ''}
            </div>
          </div>
          <h4>维度评分明细</h4>${dimTable}
          ${Array.isArray(ev.strengths) && ev.strengths.length ? '<div class="eval-strengths"><h4>✅ 主要优点</h4><ul>' + ev.strengths.map(s => '<li>' + escHtml(s) + '</li>').join('') + '</ul></div>' : ''}
          ${Array.isArray(ev.weaknesses) && ev.weaknesses.length ? '<div class="eval-weaknesses"><h4>⚠️ 主要不足</h4><ul>' + ev.weaknesses.map(w => '<li>' + escHtml(w) + '</li>').join('') + '</ul></div>' : ''}
          ${ev.reviewer_comments ? '<div class="reviewer-comments"><h4>📋 审稿总评</h4><p>' + escHtml(ev.reviewer_comments) + '</p></div>' : ''}
          ${Array.isArray(ev.improvement) && ev.improvement.length ? '<div class="eval-improvement"><h4>🔧 修改建议</h4><ol>' + ev.improvement.map(s => '<li>' + escHtml(s) + '</li>').join('') + '</ol></div>' : ''}
          ${Array.isArray(ev.followup_topics) && ev.followup_topics.length ? '<div class="eval-followup"><h4>💡 可延伸选题</h4><ul>' + ev.followup_topics.map(t => '<li>' + escHtml(t) + '</li>').join('') + '</ul></div>' : ''}
          ${ev.llm_model ? '<p class="meta-note">评价模型: ' + escHtml(ev.llm_model) + ' | 提示词版本: ' + escHtml(ev.prompt_version || '') + '</p>' : ''}
        </div>`;
      setTimeout(() => renderGrayRadar('evalRadar', dimScores), 100);
    } else if (tab === 'frontier') {
      const fc = ev.frontier_context || {};
      const lit = fc.literature || [];
      const pol = fc.policy_docs || [];
      let litHtml = '';
      if (lit.length) {
        litHtml = '<h4>📄 近年前沿文献</h4><div class="frontier-list">';
        lit.forEach(l => {
          litHtml += `<div class="frontier-item"><strong>${escHtml(l.title || '')}</strong>`;
          if (l.authors) litHtml += '<br><span class="frontier-meta">' + escHtml(l.authors) + '</span>';
          if (l.year || l.venue) litHtml += ' <span class="frontier-meta">(' + (l.year || '') + (l.venue ? ' · ' + l.venue : '') + ')</span>';
          if (l.abstract) litHtml += '<p class="frontier-abstract">' + escHtml(l.abstract).slice(0, 150) + '...</p>';
          if (l.url) litHtml += '<a href="' + escHtml(l.url) + '" target="_blank">查看 ↗</a>';
          litHtml += '</div>';
        });
        litHtml += '</div>';
      } else {
        litHtml = '<p style="color:#999;">暂无前沿文献数据</p>';
      }
      let polHtml = '';
      if (pol.length) {
        polHtml = '<h4>📜 相关政策文件</h4><ul class="policy-list">';
        pol.forEach(p => {
          polHtml += '<li><strong>' + escHtml(p.title || '') + '</strong> (' + (p.year || '') + ') [' + escHtml(p.category || '') + ']</li>';
        });
        polHtml += '</ul>';
      }
      container.innerHTML = `<div class="tab-panel"><p class="meta-note">检索时间: ${fc.retrieved_at || '未知'}</p>${litHtml}${polHtml}</div>`;
    }
  };

  // ===== 更新中心 =====
  window.renderUpdateCenter = async function () {
    const mc = document.getElementById('mainContent');
    const stats = await ArchiveStore.getStats();

    mc.innerHTML = `
      <div class="page-header">
        <h2>🔄 更新中心</h2>
        <p class="page-sub">查看自动收录运行状态与数据统计</p>
      </div>
      <div class="update-grid">
        <div class="update-card">
          <h3>📊 数据概览</h3>
          <div class="stat-row"><span>累计收录</span><strong>${stats.total}</strong></div>
          <div class="stat-row"><span>平均评分</span><strong>${stats.avgScore || '-'}</strong></div>
          <div class="stat-row"><span>S级</span><strong>${stats.scoreDist.S || 0}</strong></div>
          <div class="stat-row"><span>A级</span><strong>${stats.scoreDist.A || 0}</strong></div>
          <div class="stat-row"><span>B级</span><strong>${stats.scoreDist.B || 0}</strong></div>
          <div class="stat-row"><span>C级</span><strong>${stats.scoreDist.C || 0}</strong></div>
          <div class="stat-row"><span>未评价</span><strong>${stats.scoreDist.unrated || 0}</strong></div>
          <div class="stat-row"><span>索引更新</span><strong>${stats.updatedAt ? stats.updatedAt.slice(0, 16).replace('T', ' ') : '未知'}</strong></div>
        </div>
        <div class="update-card">
          <h3>📅 收录日历</h3>
          <div id="calendarChart" style="width:100%;height:200px;"></div>
        </div>
        <div class="update-card">
          <h3>📖 各期刊收录</h3>
          <div id="journalChart" style="width:100%;height:250px;"></div>
        </div>
        <div class="update-card">
          <h3>🏷️ 各分类收录</h3>
          <div id="categoryChart" style="width:100%;height:250px;"></div>
        </div>
      </div>
      <div class="update-actions">
        <button class="btn btn-primary" onclick="refreshArchiveData()">🔄 刷新存档数据</button>
        <button class="btn" onclick="window.open('https://github.com/phd-soroszhang/guoan-academic-workbench/actions','_blank')">⚙️ 查看 Actions 运行记录</button>
        <p class="hint">每日北京时间 06:30 自动从国家哲学社会科学文献中心及核心期刊官网抓取新文章，经AI剖析评价后存档。</p>
      </div>
    `;

    setTimeout(() => {
      renderCalendarHeatmap('calendarChart', stats.byDate);
      renderGrayBar('journalChart', stats.byJournal, '期刊收录数');
      renderGrayBar('categoryChart', stats.byCategory, '分类收录数');
    }, 100);
  };

  window.refreshArchiveData = async function () {
    ArchiveStore.clearCache();
    if (typeof toast === 'function') toast('正在刷新存档数据...');
    await ArchiveStore.getIndex(true);
    if (typeof toast === 'function') toast('存档数据已刷新');
    renderUpdateCenter();
  };

  // ===== 工具函数 =====
  function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  window.escHtml = escHtml;

  // ===== 全局搜索集成 =====
  window.archiveGlobalSearch = async function (keyword) {
    if (!keyword || keyword.length < 1) return [];
    const idx = await ArchiveStore.getIndex();
    const kw = keyword.toLowerCase();
    return idx.items.filter(i =>
      (i.title || '').toLowerCase().includes(kw) ||
      (i.authors || '').toLowerCase().includes(kw)
    ).slice(0, 8).map(i => ({
      page: 'archive',
      id: i.id,
      title: i.title,
      subtitle: (i.journal || '') + ' · ' + (i.crawl_date || '') + (i.total_score ? ' · ' + i.total_score + '分' : ''),
      type: '存档文章'
    }));
  };

})();

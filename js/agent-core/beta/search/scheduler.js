// SCH-001 检索调度器：熔断、指数退避、健康池、源降级。
// 纯前端，把每个检索源包成 {name, priority, fetch}；任一源失败自动切下一个，
// 不阻塞主任务，降级信息写进返回 meta。

export const Health = { HEALTHY: 'HEALTHY', DEGRADED: 'DEGRADED', BROKEN: 'BROKEN' };

export class SearchScheduler {
  constructor(sources, opts = {}) {
    // sources: [{name, priority, handler: async(query)=>hits}]
    this.sources = [...sources].sort((a, b) => (a.priority || 99) - (b.priority || 99));
    this.cfg = {
      maxRetries: opts.maxRetries ?? 2,
      backoffBase: opts.backoffBase ?? 300, // ms
      failThreshold: opts.failThreshold ?? 2,
      cooldownMs: opts.cooldownMs ?? 60000
    };
    this.state = {};
    for (const s of this.sources) this.state[s.name] = { health: Health.HEALTHY, fails: 0, lastFail: 0 };
  }

  _cooldownOver(name) {
    const st = this.state[name];
    return Date.now() - st.lastFail > this.cfg.cooldownMs;
  }

  async search(query) {
    const out = { hits: [], warnings: [], meta: { degraded: false, attempts: [] } };
    for (const src of this.sources) {
      const st = this.state[src.name];
      if (st.health === Health.BROKEN) {
        if (this._cooldownOver(src.name)) { st.health = Health.HEALTHY; st.fails = 0; }
        else { out.warnings.push(`源 ${src.name} 熔断冷却中，跳过`); continue; }
      }
      let ok = false;
      for (let attempt = 0; attempt <= this.cfg.maxRetries; attempt++) {
        try {
          const hits = await src.handler(query);
          out.hits.push(...hits);
          st.health = Health.HEALTHY; st.fails = 0;
          out.meta.attempts.push({ source: src.name, ok: true, attempt });
          ok = true; break;
        } catch (e) {
          out.meta.attempts.push({ source: src.name, ok: false, attempt, err: String(e).slice(0, 80) });
          await new Promise((r) => setTimeout(r, this.cfg.backoffBase * Math.pow(2, attempt)));
        }
      }
      if (!ok) {
        st.fails += 1; st.lastFail = Date.now();
        if (st.fails >= this.cfg.failThreshold) {
          st.health = Health.BROKEN;
          out.warnings.push(`源 ${src.name} 连续失败，标记熔断，冷却 ${this.cfg.cooldownMs / 1000}s`);
          out.meta.degraded = true;
        } else {
          st.health = Health.DEGRADED;
          out.warnings.push(`源 ${src.name} 失败一次，降级观察`);
        }
      } else {
        break; // 主源成功即停，不重复请求
      }
    }
    return out;
  }

  healthSnapshot() {
    return Object.fromEntries(Object.entries(this.state).map(([k, v]) => [k, v.health]));
  }
}

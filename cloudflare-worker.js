/**
 * 国安学术工作台 - Cloudflare Worker
 * 功能：网页端"立即更新"和在线投稿 → 触发 GitHub repository_dispatch
 * 
 * 部署步骤：
 * 1. 在 Cloudflare 创建 Worker
 * 2. 设置环境变量：
 *    - GITHUB_TOKEN: 具有 repo 权限的 Personal Access Token
 *    - GITHUB_REPO: 格式 "用户名/仓库名"，如 "phd-soroszhang/guoan-academic-workbench"
 *    - ACCESS_KEY: 与网站登录密钥一致（用于校验前端请求）
 * 3. 将 Worker URL 填入网站设置页的"更新触发地址"
 * 
 * 安全：PAT 只存在 Worker 环境变量中，绝不暴露给前端
 */

export default {
  async fetch(request, env) {
    // CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.json();
      const { action, accessKey, payload } = body;

      // 校验访问密钥
      if (accessKey !== env.ACCESS_KEY) {
        return new Response(JSON.stringify({ error: '访问密钥错误' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const githubToken = env.GITHUB_TOKEN;
      const repo = env.GITHUB_REPO;

      if (!githubToken || !repo) {
        return new Response(JSON.stringify({ error: 'Worker 未配置 GITHUB_TOKEN 或 GITHUB_REPO' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let eventType = 'daily-archive-trigger';
      let clientPayload = {};

      if (action === 'trigger-update') {
        // 触发每日收录工作流
        eventType = 'daily-archive-trigger';
        clientPayload = { triggered_by: 'web', at: new Date().toISOString() };
      } else if (action === 'submit-article') {
        // 提交文章到 inbox
        eventType = 'article-submission';
        clientPayload = {
          article: payload,
          submitted_at: new Date().toISOString(),
        };
      } else {
        return new Response(JSON.stringify({ error: '未知操作: ' + action }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 调用 GitHub repository_dispatch API
      const apiResponse = await fetch(
        `https://api.github.com/repos/${repo}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'guoan-workbench-worker',
          },
          body: JSON.stringify({
            event_type: eventType,
            client_payload: clientPayload,
          }),
        }
      );

      if (apiResponse.status === 204) {
        return new Response(
          JSON.stringify({ success: true, message: '已触发工作流，通常1-2分钟内开始运行' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errorText = await apiResponse.text();
        return new Response(
          JSON.stringify({ error: `GitHub API 返回 ${apiResponse.status}`, detail: errorText }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

#!/usr/bin/env python3
"""
国安学术工作台 - LLM 剖析与评价
调用 OpenAI 兼容 API（DeepSeek/豆包/智谱/Kimi/通义/GPT）
用法:
  python scripts/evaluate.py --input data/crawled.json --db data/archive.db --mode both
  python scripts/evaluate.py --article-id xxx --db data/archive.db --mode evaluation
"""
import argparse
import json
import os
import re
import sys
import time
import hashlib
import urllib.request
from datetime import datetime

# 评价维度定义（与需求说明书第7.2节一致）
EVAL_DIMENSIONS = [
    {"key": "D1", "name": "选题价值与问题意识", "weight": 0.12},
    {"key": "D2", "name": "学术创新性", "weight": 0.15},
    {"key": "D3", "name": "理论贡献与对话能力", "weight": 0.12},
    {"key": "D4", "name": "研究方法适切性与严谨性", "weight": 0.12},
    {"key": "D5", "name": "论证逻辑与结构", "weight": 0.10},
    {"key": "D6", "name": "证据/数据/史料质量", "weight": 0.10},
    {"key": "D7", "name": "文献综述与前沿把握", "weight": 0.08},
    {"key": "D8", "name": "学术规范", "weight": 0.05},
    {"key": "D9", "name": "现实意义与政策价值", "weight": 0.10},
    {"key": "D10", "name": "写作与表达", "weight": 0.06},
]


def load_prompt(name):
    """从 prompts/ 目录加载提示词"""
    path = os.path.join(os.path.dirname(__file__), "..", "prompts", name)
    path = os.path.normpath(path)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def get_prompt_version():
    """读取提示词版本号（从 changelog 或文件 frontmatter）"""
    changelog = load_prompt("changelog.md")
    if changelog:
        m = re.search(r"##\s*v?([\d.]+)", changelog)
        if m:
            return m.group(1)
    return "evaluator-v1.0"


def call_llm(system_prompt, user_prompt, config):
    """调用 OpenAI 兼容 API"""
    api_key = config.get("api_key", "")
    base_url = config.get("base_url", "https://api.deepseek.com/v1")
    model = config.get("model", "deepseek-chat")

    if not api_key:
        print("[evaluate] 未配置 LLM_API_KEY，跳过 LLM 调用", file=sys.stderr)
        return None

    url = base_url.rstrip("/") + "/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }

    for attempt in range(3):
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                content = result["choices"][0]["message"]["content"]
                return _parse_json(content)
        except Exception as e:
            print(f"[evaluate] LLM 调用失败 (尝试 {attempt+1}/3): {e}", file=sys.stderr)
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    return None


def _parse_json(content):
    """解析 LLM 返回的 JSON，容错处理"""
    if not content:
        return None
    # 直接尝试
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    # 提取 ```json ... ``` 块
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    # 提取第一个 { 到最后一个 }
    start = content.find("{")
    end = content.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(content[start:end + 1])
        except json.JSONDecodeError:
            pass
    print(f"[evaluate] JSON 解析失败，原始内容前200字: {content[:200]}", file=sys.stderr)
    return None


def build_article_text(article):
    """构建文章文本供 LLM 处理"""
    parts = [f"标题: {article.get('title', '')}"]
    if article.get("authors"):
        parts.append(f"作者: {article['authors']}")
    if article.get("journal"):
        parts.append(f"期刊: {article['journal']}")
    if article.get("year"):
        parts.append(f"年份: {article['year']}")
    if article.get("issue"):
        parts.append(f"期号: {article['issue']}")
    if article.get("keywords"):
        parts.append(f"关键词: {article['keywords']}")
    if article.get("abstract"):
        parts.append(f"摘要: {article['abstract']}")
    return "\n".join(parts)


def do_analysis(article, rag_context, config):
    """深度剖析"""
    role_prompt = load_prompt("00-role.md")
    analyst_prompt = load_prompt("01-analyst.md")
    system = role_prompt + "\n\n" + analyst_prompt

    user = f"请对以下学术论文进行深度剖析：\n\n{build_article_text(article)}\n\n"
    if rag_context:
        from rag import format_context_for_prompt
        user += format_context_for_prompt(rag_context) + "\n\n"
    user += "请严格按照 JSON 格式输出剖析结果。"

    result = call_llm(system, user, config)
    if not result:
        return None
    result["llm_model"] = config.get("model", "")
    result["prompt_version"] = get_prompt_version()
    return result


def do_evaluation(article, rag_context, config):
    """10维学术评价"""
    role_prompt = load_prompt("00-role.md")
    eval_prompt = load_prompt("02-evaluator.md")
    system = role_prompt + "\n\n" + eval_prompt

    # 注入维度定义
    dims_text = "\n".join([
        f"{d['key']} {d['name']} (权重{d['weight']*100:.0f}%)"
        for d in EVAL_DIMENSIONS
    ])
    system += f"\n\n评价维度：\n{dims_text}\n"

    user = f"请对以下学术论文进行 CSSCI 审稿人级别的学术评价：\n\n{build_article_text(article)}\n\n"
    if rag_context:
        from rag import format_context_for_prompt
        user += format_context_for_prompt(rag_context) + "\n\n"
    user += "请严格按照 JSON 格式输出评价结果，包含10个维度的分数(1-10)和理由。"

    result = call_llm(system, user, config)
    if not result:
        return None

    # 计算总分和评级
    dim_scores = result.get("dimension_scores", {})
    total = 0
    for d in EVAL_DIMENSIONS:
        score = float(dim_scores.get(d["key"], 5))
        total += score * d["weight"]
    result["total_score"] = round(total * 10, 1)

    ts = result["total_score"]
    if ts >= 90:
        result["grade"] = "S"
    elif ts >= 80:
        result["grade"] = "A"
    elif ts >= 70:
        result["grade"] = "B"
    else:
        result["grade"] = "C"

    if "recommend_level" not in result:
        result["recommend_level"] = min(5, max(1, int(ts / 20)))

    result["llm_model"] = config.get("model", "")
    result["prompt_version"] = get_prompt_version()
    return result


def save_analysis_to_db(conn, article_id, analysis):
    """保存剖析到数据库"""
    if not analysis:
        return
    now = datetime.now().isoformat()
    aid = hashlib.md5(f"{article_id}-analysis-{now}".encode()).hexdigest()[:12]
    conn.execute("DELETE FROM analyses WHERE article_id=?", (article_id,))
    conn.execute(
        """INSERT INTO analyses(id, article_id, core_arg, detailed_flow, quotes,
           theory_framework, policy_docs, data_sources, llm_model, prompt_version, created_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
        (
            aid, article_id,
            analysis.get("core_arg", ""),
            json.dumps(analysis.get("detailed_flow", []), ensure_ascii=False),
            json.dumps(analysis.get("quotes", []), ensure_ascii=False),
            json.dumps(analysis.get("theory_framework", []), ensure_ascii=False),
            json.dumps(analysis.get("policy_docs", []), ensure_ascii=False),
            json.dumps(analysis.get("data_sources", []), ensure_ascii=False),
            analysis.get("llm_model", ""),
            analysis.get("prompt_version", ""),
            now,
        ),
    )


def save_evaluation_to_db(conn, article_id, evaluation):
    """保存评价到数据库"""
    if not evaluation:
        return
    now = datetime.now().isoformat()
    eid = hashlib.md5(f"{article_id}-eval-{now}".encode()).hexdigest()[:12]
    conn.execute("DELETE FROM evaluations WHERE article_id=?", (article_id,))
    conn.execute(
        """INSERT INTO evaluations(id, article_id, total_score, grade, recommend_level,
           dimension_scores, dimension_reasons, strengths, weaknesses, reviewer_comments,
           improvement, followup_topics, frontier_context, relevance_to_user,
           llm_model, prompt_version, created_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            eid, article_id,
            evaluation.get("total_score", 0),
            evaluation.get("grade", "B"),
            evaluation.get("recommend_level", 3),
            json.dumps(evaluation.get("dimension_scores", {}), ensure_ascii=False),
            json.dumps(evaluation.get("dimension_reasons", {}), ensure_ascii=False),
            json.dumps(evaluation.get("strengths", []), ensure_ascii=False),
            json.dumps(evaluation.get("weaknesses", []), ensure_ascii=False),
            evaluation.get("reviewer_comments", ""),
            json.dumps(evaluation.get("improvement", []), ensure_ascii=False),
            json.dumps(evaluation.get("followup_topics", []), ensure_ascii=False),
            json.dumps(evaluation.get("frontier_context", {}), ensure_ascii=False),
            evaluation.get("relevance_to_user", ""),
            evaluation.get("llm_model", ""),
            evaluation.get("prompt_version", ""),
            now,
        ),
    )


def run_pipeline(input_path, db_path, mode, config):
    """主流程：读取抓取结果 → RAG → 剖析/评价 → 写库"""
    import sqlite3
    conn = sqlite3.connect(db_path)

    with open(input_path, "r", encoding="utf-8") as f:
        crawled = json.load(f)

    articles = crawled.get("articles", [])
    analyzed = 0
    print(f"[evaluate] 待处理 {len(articles)} 篇，模式: {mode}")

    for i, article in enumerate(articles):
        aid = article.get("id", "")
        title = article.get("title", "")[:50]
        print(f"[evaluate] ({i+1}/{len(articles)}) {title}...")

        # RAG 检索
        rag_ctx = None
        try:
            from rag import build_context
            rag_ctx = build_context(
                article.get("title", ""),
                article.get("keywords", ""),
                article.get("category", "综合安全"),
            )
        except Exception as e:
            print(f"[evaluate] RAG 失败: {e}", file=sys.stderr)

        if mode in ("analysis", "both"):
            analysis = do_analysis(article, rag_ctx, config)
            if analysis:
                save_analysis_to_db(conn, aid, analysis)
                article["analysis"] = analysis

        if mode in ("evaluation", "both"):
            evaluation = do_evaluation(article, rag_ctx, config)
            if evaluation:
                if rag_ctx:
                    evaluation["frontier_context"] = rag_ctx
                save_evaluation_to_db(conn, aid, evaluation)
                article["evaluation"] = evaluation

        if article.get("analysis") or article.get("evaluation"):
            analyzed += 1

        # 避免 API 限流
        time.sleep(1)

    conn.commit()
    conn.close()

    # 回写完整数据到 input_path（供存档使用）
    with open(input_path, "w", encoding="utf-8") as f:
        json.dump(crawled, f, ensure_ascii=False, indent=2)

    print(f"[evaluate] 完成: 成功剖析/评价 {analyzed}/{len(articles)} 篇")
    return analyzed


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/crawled.json")
    parser.add_argument("--db", default="data/archive.db")
    parser.add_argument("--mode", choices=["analysis", "evaluation", "both"], default="both")
    parser.add_argument("--api-key", default=os.environ.get("LLM_API_KEY", ""))
    parser.add_argument("--base-url", default=os.environ.get("LLM_BASE_URL", "https://api.deepseek.com/v1"))
    parser.add_argument("--model", default=os.environ.get("LLM_MODEL", "deepseek-chat"))
    args = parser.parse_args()

    config = {
        "api_key": args.api_key,
        "base_url": args.base_url,
        "model": args.model,
    }
    run_pipeline(args.input, args.db, args.mode, config)

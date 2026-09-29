#!/usr/bin/env python3
"""
国安学术工作台 - 索引构建与单篇存档
从 SQLite 生成 data/index.json，并将每篇文章存档为 JSON/MD
用法: python scripts/build_index.py --db data/archive.db --out data/index.json
"""
import argparse
import json
import os
import sqlite3
from datetime import datetime


def export_article_json(article, analysis, evaluation, out_dir):
    """导出单篇完整 JSON"""
    aid = article["id"]
    date_dir = os.path.join(out_dir, article["crawl_date"])
    os.makedirs(date_dir, exist_ok=True)
    path = os.path.join(date_dir, f"{aid}.json")

    payload = {
        "article": dict(article),
        "analysis": analysis,
        "evaluation": evaluation,
        "exported_at": datetime.now().isoformat(),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return path


def export_article_md(article, analysis, evaluation, out_dir):
    """导出单篇人类可读 Markdown"""
    aid = article["id"]
    date_dir = os.path.join(out_dir, article["crawl_date"])
    os.makedirs(date_dir, exist_ok=True)
    path = os.path.join(date_dir, f"{aid}.md")

    lines = [f"# {article.get('title', '')}", ""]
    if article.get("authors"):
        lines.append(f"**作者**: {article['authors']}")
    if article.get("journal"):
        lines.append(f"**期刊**: {article['journal']}", )
    if article.get("year"):
        lines.append(f"**年份**: {article['year']}")
    if article.get("issue"):
        lines.append(f"**期号**: {article['issue']}")
    if article.get("doi"):
        lines.append(f"**DOI**: {article['doi']}")
    if article.get("source_url"):
        lines.append(f"**原文链接**: {article['source_url']}")
    lines.append(f"**收录日期**: {article.get('crawl_date', '')}")
    lines.append(f"**分类**: {article.get('category', '')}")
    lines.append("")

    if article.get("abstract"):
        lines.append("## 摘要")
        lines.append(article["abstract"])
        lines.append("")

    if analysis:
        lines.append("## 深度剖析")
        if analysis.get("core_arg"):
            lines.append(f"**核心论点**: {analysis['core_arg']}")
            lines.append("")
        flow = analysis.get("detailed_flow")
        if isinstance(flow, list) and flow:
            lines.append("**论证流程**:")
            for step in flow:
                if isinstance(step, dict):
                    lines.append(f"- **{step.get('step', '')}**: {step.get('detail', '')}")
                else:
                    lines.append(f"- {step}")
            lines.append("")
        quotes = analysis.get("quotes")
        if isinstance(quotes, list) and quotes:
            lines.append("**金句**:")
            for q in quotes:
                lines.append(f"> {q}")
            lines.append("")

    if evaluation:
        lines.append("## 学术评价")
        lines.append(f"- **总分**: {evaluation.get('total_score', 0)}/100")
        lines.append(f"- **评级**: {evaluation.get('grade', '')}")
        lines.append(f"- **推荐指数**: {'⭐' * evaluation.get('recommend_level', 3)}")
        lines.append("")
        dims = evaluation.get("dimension_scores", {})
        if dims:
            lines.append("**维度评分**:")
            for k, v in dims.items():
                lines.append(f"- {k}: {v}/10")
            lines.append("")
        if evaluation.get("reviewer_comments"):
            lines.append("**审稿总评**:")
            lines.append(evaluation["reviewer_comments"])
            lines.append("")
        strengths = evaluation.get("strengths")
        if isinstance(strengths, list) and strengths:
            lines.append("**优点**:")
            for s in strengths:
                lines.append(f"- {s}")
            lines.append("")
        weaknesses = evaluation.get("weaknesses")
        if isinstance(weaknesses, list) and weaknesses:
            lines.append("**不足**:")
            for w in weaknesses:
                lines.append(f"- {w}")
            lines.append("")

    lines.append("---")
    lines.append(f"*由国安学术工作台自动生成 | {datetime.now().strftime('%Y-%m-%d')}*")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path


def build_index(db_path, out_path, articles_dir):
    """从数据库构建 index.json"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    # 获取所有文章 + 评价分数
    rows = conn.execute("""
        SELECT a.*, e.total_score, e.grade, e.recommend_level
        FROM articles a
        LEFT JOIN evaluations e ON a.id = e.article_id
        ORDER BY a.crawl_date DESC, a.created_at DESC
    """).fetchall()

    items = []
    journals = set()
    categories = set()

    for row in rows:
        article = dict(row)
        # 解析 keywords 为列表
        kw_str = article.get("keywords", "") or ""
        keywords = [k.strip() for k in kw_str.split(";") if k.strip()] if kw_str else []

        item = {
            "id": article["id"],
            "title": article["title"],
            "authors": article.get("authors", ""),
            "journal": article.get("journal", ""),
            "year": article.get("year"),
            "issue": article.get("issue", ""),
            "crawl_date": article["crawl_date"],
            "category": article.get("category", ""),
            "total_score": article.get("total_score"),
            "grade": article.get("grade", ""),
            "recommend_level": article.get("recommend_level"),
            "keywords": keywords,
            "source_type": article.get("source_type", ""),
        }
        items.append(item)
        if article.get("journal"):
            journals.add(article["journal"])
        if article.get("category"):
            categories.add(article["category"])

        # 导出单篇存档
        analysis_row = conn.execute(
            "SELECT * FROM analyses WHERE article_id=?", (article["id"],)
        ).fetchone()
        eval_row = conn.execute(
            "SELECT * FROM evaluations WHERE article_id=?", (article["id"],)
        ).fetchone()

        analysis = None
        if analysis_row:
            analysis = dict(analysis_row)
            for k in ["detailed_flow", "quotes", "theory_framework", "policy_docs", "data_sources"]:
                if analysis.get(k):
                    try:
                        analysis[k] = json.loads(analysis[k])
                    except (json.JSONDecodeError, TypeError):
                        pass

        evaluation = None
        if eval_row:
            evaluation = dict(eval_row)
            for k in ["dimension_scores", "dimension_reasons", "strengths",
                      "weaknesses", "improvement", "followup_topics", "frontier_context"]:
                if evaluation.get(k):
                    try:
                        evaluation[k] = json.loads(evaluation[k])
                    except (json.JSONDecodeError, TypeError):
                        pass

        export_article_json(article, analysis, evaluation, articles_dir)
        export_article_md(article, analysis, evaluation, articles_dir)

    index = {
        "updated_at": datetime.now().isoformat(),
        "schema_version": "1.0",
        "total": len(items),
        "journals": sorted(list(journals)),
        "categories": sorted(list(categories)),
        "items": items,
    }

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    conn.close()
    print(f"[build_index] 索引构建完成: {len(items)} 篇文章 -> {out_path}")
    return index


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="data/archive.db")
    parser.add_argument("--out", default="data/index.json")
    parser.add_argument("--articles-dir", default="data/articles")
    args = parser.parse_args()
    build_index(args.db, args.out, args.articles_dir)

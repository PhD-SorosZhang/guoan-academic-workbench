#!/usr/bin/env python3
"""
国安学术工作台 - 每日自动化流水线总控
抓取 → 去重 → RAG → 剖析评价 → 写库 → 存档 → 重建索引 → 记录日志
用法: python scripts/run_pipeline.py --date 2026-09-29
"""
import argparse
import json
import os
import sqlite3
import sys
import time
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from build_db import init_db
from crawl import run_crawl, dedup_articles, normalize_title
from evaluate import run_pipeline as run_eval
from build_index import build_index


def log_run(db_path, run_date, started_at, status, sources_status,
            fetched_count, new_count, analyzed_count, details=""):
    """写入 crawl_log"""
    conn = sqlite3.connect(db_path)
    finished = datetime.now().isoformat()
    duration = int((datetime.now() - started_at).total_seconds())
    conn.execute(
        """INSERT INTO crawl_log
           (run_date, started_at, finished_at, status, sources_status,
            fetched_count, new_count, analyzed_count, duration_sec, details)
           VALUES(?,?,?,?,?,?,?,?,?,?)""",
        (run_date, started_at.isoformat(), finished, status,
         json.dumps(sources_status, ensure_ascii=False),
         fetched_count, new_count, analyzed_count, duration, details),
    )
    conn.commit()
    conn.close()


def get_existing_titles(db_path):
    """获取已有文章的归一化标题，用于去重"""
    conn = sqlite3.connect(db_path)
    rows = conn.execute("SELECT title_norm FROM articles").fetchall()
    conn.close()
    return {r[0] for r in rows if r[0]}


def insert_articles(db_path, articles):
    """将文章写入 articles 表"""
    conn = sqlite3.connect(db_path)
    count = 0
    for a in articles:
        try:
            conn.execute(
                """INSERT OR IGNORE INTO articles
                   (id, title, title_norm, authors, journal, year, issue, pages,
                    doi, source_type, source_url, pdf_url, abstract, keywords,
                    category, published_date, crawl_date, full_text, raw_path, created_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    a["id"], a["title"], a.get("title_norm", ""),
                    a.get("authors", ""), a.get("journal", ""),
                    a.get("year"), a.get("issue", ""), a.get("pages", ""),
                    a.get("doi", ""), a.get("source_type", ""),
                    a.get("source_url", ""), a.get("pdf_url", ""),
                    a.get("abstract", ""), a.get("keywords", ""),
                    a.get("category", ""), a.get("published_date", ""),
                    a["crawl_date"], a.get("full_text", 0),
                    a.get("raw_path", ""), a.get("created_at", datetime.now().isoformat()),
                ),
            )
            count += 1
        except Exception as e:
            print(f"[pipeline] 写入失败 {a.get('title','')[:30]}: {e}", file=sys.stderr)
    conn.commit()
    conn.close()
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"))
    parser.add_argument("--sources", default="ncpssd,rss")
    parser.add_argument("--db", default="data/archive.db")
    parser.add_argument("--skip-crawl", action="store_true", help="跳过抓取，使用已有 crawled.json")
    args = parser.parse_args()

    started_at = datetime.now()
    db_path = args.db
    crawled_path = "data/crawled.json"
    index_path = "data/index.json"
    articles_dir = "data/articles"

    print(f"=== 国安学术工作台 每日流水线 ===")
    print(f"日期: {args.date}")
    print(f"开始时间: {started_at.isoformat()}")

    # 1. 初始化数据库
    init_db(db_path)

    # 2. 抓取
    sources_status = {}
    fetched_count = 0
    new_count = 0
    analyzed_count = 0
    status = "success"
    details = ""

    try:
        if not args.skip_crawl:
            articles = run_crawl(args.date, args.sources.split(","), crawled_path)
        else:
            print("[pipeline] 跳过抓取，读取已有数据")
            with open(crawled_path, "r", encoding="utf-8") as f:
                crawled = json.load(f)
            articles = crawled.get("articles", [])
            sources_status = crawled.get("sources_status", {})

        fetched_count = len(articles)

        # 3. 与已有数据去重
        existing = get_existing_titles(db_path)
        unique = dedup_articles(articles, existing_titles=existing)
        new_count = len(unique)
        print(f"[pipeline] 去重后新增: {new_count} 篇")

        if new_count == 0:
            print("[pipeline] 无新文章，结束")
            log_run(db_path, args.date, started_at, "success",
                    sources_status, fetched_count, 0, 0, "无新文章")
            # 仍重建索引
            build_index(db_path, index_path, articles_dir)
            return

        # 4. 写入文章表
        inserted = insert_articles(db_path, unique)
        print(f"[pipeline] 写入数据库: {inserted} 篇")

        # 5. LLM 剖析 + 评价
        config = {
            "api_key": os.environ.get("LLM_API_KEY", ""),
            "base_url": os.environ.get("LLM_BASE_URL", "https://api.deepseek.com/v1"),
            "model": os.environ.get("LLM_MODEL", "deepseek-chat"),
        }
        if config["api_key"]:
            # 只对新文章做剖析评价
            temp_input = "data/crawled_new.json"
            with open(temp_input, "w", encoding="utf-8") as f:
                json.dump({"articles": unique}, f, ensure_ascii=False, indent=2)
            analyzed_count = run_eval(temp_input, db_path, "both", config)
        else:
            print("[pipeline] 未配置 LLM_API_KEY，跳过剖析评价（仅存档题录）")
            status = "partial"
            details = "未配置LLM，仅存档题录"

        # 6. 重建索引 + 单篇存档
        build_index(db_path, index_path, articles_dir)

    except Exception as e:
        status = "failed"
        details = str(e)
        print(f"[pipeline] 流水线失败: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()

    # 7. 记录日志
    log_run(db_path, args.date, started_at, status, sources_status,
            fetched_count, new_count, analyzed_count, details)

    print(f"=== 流水线结束: {status} ===")
    print(f"抓取: {fetched_count}, 新增: {new_count}, 剖析评价: {analyzed_count}")

    if status == "failed":
        sys.exit(1)


if __name__ == "__main__":
    main()

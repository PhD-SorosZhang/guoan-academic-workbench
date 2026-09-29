#!/usr/bin/env python3
"""
国安学术工作台 - SQLite 数据库构建与迁移
用法: python scripts/build_db.py [--db data/archive.db]
"""
import sqlite3
import os
import sys
import argparse

SCHEMA_VERSION = "1.0"

SCHEMA_SQL = """
-- 文章主表
CREATE TABLE IF NOT EXISTS articles (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    title_norm      TEXT,
    authors         TEXT,
    journal         TEXT,
    year            INTEGER,
    issue           TEXT,
    pages           TEXT,
    doi             TEXT,
    source_type     TEXT,
    source_url      TEXT,
    pdf_url         TEXT,
    abstract        TEXT,
    keywords        TEXT,
    category        TEXT,
    published_date  TEXT,
    crawl_date      TEXT NOT NULL,
    full_text       INTEGER DEFAULT 0,
    raw_path        TEXT,
    created_at      TEXT NOT NULL
);

-- 剖析表
CREATE TABLE IF NOT EXISTS analyses (
    id                TEXT PRIMARY KEY,
    article_id        TEXT NOT NULL,
    core_arg          TEXT,
    detailed_flow     TEXT,
    quotes            TEXT,
    theory_framework  TEXT,
    policy_docs       TEXT,
    data_sources      TEXT,
    llm_model         TEXT,
    prompt_version    TEXT,
    created_at        TEXT NOT NULL,
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 评价表
CREATE TABLE IF NOT EXISTS evaluations (
    id                  TEXT PRIMARY KEY,
    article_id          TEXT NOT NULL,
    total_score         REAL,
    grade               TEXT,
    recommend_level     INTEGER,
    dimension_scores    TEXT,
    dimension_reasons   TEXT,
    strengths           TEXT,
    weaknesses          TEXT,
    reviewer_comments   TEXT,
    improvement         TEXT,
    followup_topics     TEXT,
    frontier_context    TEXT,
    relevance_to_user   TEXT,
    llm_model           TEXT,
    prompt_version      TEXT,
    created_at          TEXT NOT NULL,
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 历史版本
CREATE TABLE IF NOT EXISTS analysis_history (
    id TEXT PRIMARY KEY,
    kind TEXT,
    article_id TEXT,
    payload TEXT,
    llm_model TEXT,
    prompt_version TEXT,
    created_at TEXT
);

-- 抓取运行日志
CREATE TABLE IF NOT EXISTS crawl_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_date TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    status TEXT,
    sources_status TEXT,
    fetched_count INTEGER,
    new_count INTEGER,
    analyzed_count INTEGER,
    duration_sec INTEGER,
    details TEXT
);

-- 元数据表
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE INDEX IF NOT EXISTS idx_articles_date     ON articles(crawl_date);
CREATE INDEX IF NOT EXISTS idx_articles_journal  ON articles(journal);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_doi      ON articles(doi);
CREATE INDEX IF NOT EXISTS idx_eval_score        ON evaluations(total_score);
CREATE INDEX IF NOT EXISTS idx_analyses_article  ON analyses(article_id);
CREATE INDEX IF NOT EXISTS idx_eval_article      ON evaluations(article_id);
"""


def get_db_path():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="data/archive.db")
    args = parser.parse_args()
    return args.db


def init_db(db_path):
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_SQL)
    conn.execute(
        "INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)",
        ("schema_version", SCHEMA_VERSION),
    )
    conn.commit()
    conn.close()
    print(f"[build_db] 数据库初始化完成: {db_path} (schema v{SCHEMA_VERSION})")


if __name__ == "__main__":
    init_db(get_db_path())

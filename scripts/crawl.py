#!/usr/bin/env python3
"""
国安学术工作台 - 文章抓取器
支持数据源: ncpssd(国家哲学社会科学文献中心) / rss / journal_official / manual
用法: python scripts/crawl.py --date 2026-09-29 --sources ncpssd,rss --out data/crawled.json
"""
import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

# 国安/国关类核心期刊 RSS 源（优先用 RSS，稳定可靠）
RSS_SOURCES = [
    {"name": "现代国际关系", "url": "https://www.xiandai.com/rss", "type": "rss"},
    {"name": "国际安全研究", "url": "https://gjaj.cbpt.cnki.net/rss", "type": "rss"},
    {"name": "世界经济与政治", "url": "https://jjzz.cbpt.cnki.net/rss", "type": "rss"},
    {"name": "当代亚太", "url": "https://ddyt.cbpt.cnki.net/rss", "type": "rss"},
    {"name": "外交评论", "url": "https://wjpl.cbpt.cnki.net/rss", "type": "rss"},
    {"name": "国际展望", "url": "https://gjzw.cbpt.cnki.net/rss", "type": "rss"},
    {"name": "太平洋学报", "url": "https://tpyxb.cbpt.cnki.net/rss", "type": "rss"},
    {"name": "国际论坛", "url": "https://gjlt.cbpt.cnki.net/rss", "type": "rss"},
]

# 国家安全领域分类关键词
CATEGORY_KEYWORDS = {
    "总体国家安全观": ["总体国家安全观", "国家安全学", "国家安全体系"],
    "政治安全": ["政治安全", "意识形态", "政权安全", "制度安全"],
    "国土安全": ["国土安全", "边疆", "领土", "边界"],
    "军事安全": ["军事安全", "国防", "战争", "军力", "战略威慑"],
    "经济安全": ["经济安全", "金融安全", "产业链", "供应链", "能源安全", "粮食安全"],
    "文化安全": ["文化安全", "意识形态安全", "价值观", "文化主权"],
    "社会安全": ["社会安全", "公共安全", "社会治理", "反恐", "维稳"],
    "科技安全": ["科技安全", "技术安全", "卡脖子", "关键核心技术", "人工智能治理"],
    "网络安全": ["网络安全", "网络空间", "数据安全", "信息安全", "网络主权"],
    "生态安全": ["生态安全", "环境安全", "气候变化", "生物安全"],
    "海洋安全": ["海洋安全", "海上通道", "海权", "岛礁", "南海", "东海"],
    "核安全": ["核安全", "核扩散", "核武器", "核威慑"],
    "海外利益": ["海外利益", "一带一路安全", "海外公民", "领事保护"],
    "非传统安全": ["非传统安全", "公共卫生", "跨国犯罪", "难民"],
}


def http_get(url, timeout=15, retries=2):
    """带超时和重试的 HTTP GET"""
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt < retries:
                time.sleep(1 * (attempt + 1))
            else:
                print(f"[crawl] HTTP 失败 {url}: {e}", file=sys.stderr)
                return None


def normalize_title(title):
    """标题归一化：去标点、空格、转小写，用于判重"""
    if not title:
        return ""
    t = re.sub(r"[^\w\u4e00-\u9fff]", "", title)
    return t.lower()


def gen_article_id(title, crawl_date):
    """生成文章 ID: 日期+短哈希"""
    date_str = crawl_date.replace("-", "")
    h = hashlib.md5(normalize_title(title).encode()).hexdigest()[:6]
    return f"{date_str}-{h}"


def classify_article(title, abstract, keywords):
    """根据标题/摘要/关键词分类"""
    text = f"{title} {abstract or ''} {keywords or ''}"
    for cat, kws in CATEGORY_KEYWORDS.items():
        for kw in kws:
            if kw in text:
                return cat
    return "综合安全"


def parse_rss(xml_text, source_name):
    """解析 RSS 2.0 / Atom"""
    articles = []
    if not xml_text:
        return articles
    try:
        root = ET.fromstring(xml_text)
        # RSS 2.0
        for item in root.iter("item"):
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            desc = (item.findtext("description") or "").strip()
            pub_date = (item.findtext("pubDate") or "").strip()
            # 清理 HTML 标签
            desc_clean = re.sub(r"<[^>]+>", "", desc)
            articles.append({
                "title": title,
                "source_url": link,
                "abstract": desc_clean[:500],
                "published_date": pub_date,
                "journal": source_name,
                "source_type": "rss",
            })
        # Atom
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.iter("{http://www.w3.org/2005/Atom}entry"):
            title = (entry.findtext("atom:title", default="", namespaces=ns) or "").strip()
            link_elem = entry.find("atom:link", namespaces=ns)
            link = link_elem.get("href", "") if link_elem is not None else ""
            summary = (entry.findtext("atom:summary", default="", namespaces=ns) or "").strip()
            published = (entry.findtext("atom:published", default="", namespaces=ns) or "").strip()
            articles.append({
                "title": title,
                "source_url": link,
                "abstract": re.sub(r"<[^>]+>", "", summary)[:500],
                "published_date": published,
                "journal": source_name,
                "source_type": "rss",
            })
    except ET.ParseError as e:
        print(f"[crawl] RSS 解析失败 ({source_name}): {e}", file=sys.stderr)
    return articles


def crawl_ncpssd(date_str):
    """
    抓取国家哲学社会科学文献中心 (ncpssd.cn)
    该站有检索接口，尝试解析最新论文列表
    """
    articles = []
    # ncpssd 检索 API（公开接口）
    base = "https://www.ncpssd.cn/Literature/searchLiterature"
    params = {
        "keyword": "国家安全",
        "pageNum": "1",
        "pageSize": "20",
        "sort": "date",
    }
    url = base + "?" + urllib.parse.urlencode(params)
    html = http_get(url, timeout=20)
    if not html:
        return articles
    # 尝试解析 JSON 响应
    try:
        data = json.loads(html)
        items = data.get("data", {}).get("list", []) or data.get("list", [])
        for item in items:
            articles.append({
                "title": item.get("title", "").strip(),
                "authors": item.get("author", ""),
                "journal": item.get("journal", ""),
                "year": item.get("year"),
                "abstract": item.get("abstract", ""),
                "keywords": item.get("keywords", ""),
                "doi": item.get("doi", ""),
                "source_url": item.get("url", ""),
                "source_type": "ncpssd",
            })
    except (json.JSONDecodeError, KeyError):
        # 回退：HTML 正则提取
        titles = re.findall(r'<a[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)</a>', html, re.S)
        for t in titles[:15]:
            clean = re.sub(r"<[^>]+>", "", t).strip()
            if clean and len(clean) > 5:
                articles.append({
                    "title": clean,
                    "journal": "国家哲学社会科学文献中心",
                    "source_type": "ncpssd",
                })
    return articles


def crawl_source(source, date_str):
    """抓取单个数据源"""
    name = source["name"]
    stype = source.get("type", "rss")
    print(f"[crawl] 正在抓取: {name} ({stype})")
    try:
        if stype == "rss":
            xml = http_get(source["url"], timeout=15)
            arts = parse_rss(xml, name)
        elif stype == "ncpssd":
            arts = crawl_ncpssd(date_str)
        else:
            arts = []
        print(f"[crawl] {name}: 获取 {len(arts)} 篇")
        return name, arts, "ok"
    except Exception as e:
        print(f"[crawl] {name} 失败: {e}", file=sys.stderr)
        return name, [], f"fail: {e}"


def dedup_articles(articles, existing_ids=None, existing_titles=None):
    """去重：ID (日期+标题哈希) + 归一化标题 + DOI"""
    existing_ids = existing_ids or set()
    existing_titles = existing_titles or set()
    seen = set()
    unique = []
    for a in articles:
        title = a.get("title", "").strip()
        if not title or len(title) < 5:
            continue
        tn = normalize_title(title)
        if tn in seen or tn in existing_titles:
            continue
        doi = a.get("doi", "")
        if doi and doi in existing_ids:
            continue
        seen.add(tn)
        unique.append(a)
    return unique


def run_crawl(date_str, sources, out_path):
    """主抓取流程"""
    all_articles = []
    sources_status = {}

    source_map = {
        "ncpssd": {"name": "国家哲学社会科学文献中心", "type": "ncpssd"},
        "rss": None,  # 特殊：展开所有 RSS 源
    }

    for src_name in sources:
        if src_name == "rss":
            for rss in RSS_SOURCES:
                name, arts, status = crawl_source(rss, date_str)
                sources_status[name] = status
                all_articles.extend(arts)
        elif src_name == "ncpssd":
            name, arts, status = crawl_source(source_map["ncpssd"], date_str)
            sources_status[name] = status
            all_articles.extend(arts)

    # 去重
    unique = dedup_articles(all_articles)
    print(f"[crawl] 总计获取 {len(all_articles)} 篇，去重后 {len(unique)} 篇")

    # 补充字段
    for a in unique:
        a["id"] = gen_article_id(a["title"], date_str)
        a["title_norm"] = normalize_title(a["title"])
        a["crawl_date"] = date_str
        a["category"] = classify_article(
            a.get("title", ""), a.get("abstract", ""), a.get("keywords", "")
        )
        a["created_at"] = datetime.now().isoformat()
        a["full_text"] = 0

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "date": date_str,
            "fetched_count": len(all_articles),
            "new_count": len(unique),
            "sources_status": sources_status,
            "articles": unique,
        }, f, ensure_ascii=False, indent=2)
    print(f"[crawl] 结果已写入: {out_path}")
    return unique


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"))
    parser.add_argument("--sources", default="ncpssd,rss")
    parser.add_argument("--out", default="data/crawled.json")
    args = parser.parse_args()
    run_crawl(args.date, args.sources.split(","), args.out)

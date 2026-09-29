#!/usr/bin/env python3
"""
国安学术工作台 - RAG 前沿检索
检索 OpenAlex / CrossRef 近2年相关文献 + 政策文件
用法: python scripts/rag.py --title "文章标题" --keywords "安全,治理" --out data/rag_context.json
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse

UA = "Mozilla/5.0 (compatible; GuoanWorkbench/1.0)"


def http_get_json(url, timeout=15, retries=2):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8", errors="replace"))
        except Exception as e:
            if attempt < retries:
                time.sleep(1 * (attempt + 1))
            else:
                print(f"[rag] 请求失败 {url}: {e}", file=sys.stderr)
                return None


def search_openalex(title, keywords, max_results=8):
    """OpenAlex 学术文献检索（免费、无需 Key、国内可访问）"""
    query = title[:80]
    if keywords:
        query += " " + keywords.replace(",", " ")
    url = "https://api.openalex.org/works?" + urllib.parse.urlencode({
        "search": query,
        "filter": "from_publication_date:2024-01-01",
        "per-page": str(max_results),
        "sort": "relevance_score:desc",
    })
    data = http_get_json(url)
    if not data or "results" not in data:
        return []
    results = []
    for w in data["results"]:
        results.append({
            "title": w.get("title", ""),
            "authors": ", ".join([a.get("author", {}).get("display_name", "") for a in w.get("authorships", [])[:3]]),
            "year": w.get("publication_year"),
            "venue": (w.get("primary_location") or {}).get("source", {}).get("display_name", ""),
            "cited_by": w.get("cited_by_count", 0),
            "url": w.get("id", ""),
            "abstract": _extract_openalex_abstract(w),
            "source": "OpenAlex",
        })
    return results


def _extract_openalex_abstract(work):
    """OpenAlex 摘要以 inverted index 存储，需还原"""
    inv = work.get("abstract_inverted_index")
    if not inv:
        return ""
    positions = {}
    for word, indices in inv.items():
        for idx in indices:
            positions[idx] = word
    if not positions:
        return ""
    return " ".join(positions[i] for i in sorted(positions.keys()))[:300]


def search_crossref(title, keywords, max_results=5):
    """CrossRef 文献检索（免费、无需 Key）"""
    query = title[:80]
    url = "https://api.crossref.org/works?" + urllib.parse.urlencode({
        "query": query,
        "filter": "from-pub-date:2024-01-01",
        "rows": str(max_results),
        "select": "title,author,published-print,container-title,DOI,URL,abstract",
    })
    data = http_get_json(url)
    if not data:
        return []
    items = data.get("message", {}).get("items", [])
    results = []
    for item in items:
        title_list = item.get("title", [])
        authors = ", ".join([
            f"{a.get('given', '')} {a.get('family', '')}".strip()
            for a in item.get("author", [])[:3]
        ])
        pub = item.get("published-print", item.get("published-online", {}))
        year = pub.get("date-parts", [[None]])[0][0] if pub else None
        abstract = re.sub(r"<[^>]+>", "", item.get("abstract", ""))[:300]
        results.append({
            "title": title_list[0] if title_list else "",
            "authors": authors,
            "year": year,
            "venue": (item.get("container-title", [""])[0]),
            "doi": item.get("DOI", ""),
            "url": item.get("URL", ""),
            "abstract": abstract,
            "source": "CrossRef",
        })
    return results


# 政策文件库（静态，按领域匹配；每周工作流可更新）
POLICY_DOCS = [
    {"title": "习近平关于总体国家安全观论述摘编", "year": 2018, "category": "总体国家安全观", "url": ""},
    {"title": "中华人民共和国国家安全法", "year": 2015, "category": "总体国家安全观", "url": ""},
    {"title": "中华人民共和国反间谍法（2023修订）", "year": 2023, "category": "政治安全", "url": ""},
    {"title": "中华人民共和国数据安全法", "year": 2021, "category": "网络安全", "url": ""},
    {"title": "中华人民共和国网络安全法", "year": 2017, "category": "网络安全", "url": ""},
    {"title": "关键信息基础设施安全保护条例", "year": 2021, "category": "网络安全", "url": ""},
    {"title": "生成式人工智能服务管理暂行办法", "year": 2023, "category": "科技安全", "url": ""},
    {"title": "中华人民共和国生物安全法", "year": 2021, "category": "生态安全", "url": ""},
    {"title": "中华人民共和国反外国制裁法", "year": 2021, "category": "经济安全", "url": ""},
    {"title": "粮食节约和反食品浪费工作方案", "year": 2023, "category": "经济安全", "url": ""},
    {"title": "新时代的中国国际发展合作", "year": 2021, "category": "海外利益", "url": ""},
    {"title": "中国的海洋强国建设", "year": 2022, "category": "海洋安全", "url": ""},
    {"title": "全球安全倡议概念文件", "year": 2023, "category": "总体国家安全观", "url": ""},
    {"title": "关于加强国家安全学一级学科建设的意见", "year": 2023, "category": "总体国家安全观", "url": ""},
]


def search_policy(category, keywords, max_results=5):
    """按分类匹配政策文件"""
    matched = []
    text = f"{category} {keywords or ''}"
    for doc in POLICY_DOCS:
        if doc["category"] in text or any(kw in doc["title"] for kw in (keywords or "").split(",")):
            matched.append(doc)
    if not matched:
        matched = POLICY_DOCS[:3]
    return matched[:max_results]


def build_context(title, keywords, category):
    """构建 RAG 上下文"""
    print(f"[rag] 检索前沿文献: {title[:40]}...")
    openalex = search_openalex(title, keywords)
    crossref = search_crossref(title, keywords)
    policy = search_policy(category, keywords)

    # 合并去重
    seen_titles = set()
    literature = []
    for item in openalex + crossref:
        t = item.get("title", "").strip()
        if t and t not in seen_titles:
            seen_titles.add(t)
            literature.append(item)

    context = {
        "literature": literature[:10],
        "policy_docs": policy,
        "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    print(f"[rag] 检索完成: 文献 {len(literature)} 篇, 政策 {len(policy)} 份")
    return context


def format_context_for_prompt(context):
    """将上下文格式化为提示词文本"""
    lines = ["【前沿文献参考（近2年）】"]
    for i, lit in enumerate(context["literature"], 1):
        lines.append(f"{i}. {lit.get('title','')} ({lit.get('year','')}) - {lit.get('venue','')}")
        if lit.get("authors"):
            lines.append(f"   作者: {lit['authors']}")
        if lit.get("abstract"):
            lines.append(f"   摘要: {lit['abstract'][:150]}")
        if lit.get("cited_by", 0) > 0:
            lines.append(f"   被引: {lit['cited_by']}")
    lines.append("")
    lines.append("【相关政策文件】")
    for i, doc in enumerate(context["policy_docs"], 1):
        lines.append(f"{i}. {doc['title']} ({doc['year']}) [{doc['category']}]")
    return "\n".join(lines)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--title", required=True)
    parser.add_argument("--keywords", default="")
    parser.add_argument("--category", default="综合安全")
    parser.add_argument("--out", default="data/rag_context.json")
    args = parser.parse_args()

    ctx = build_context(args.title, args.keywords, args.category)
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(ctx, f, ensure_ascii=False, indent=2)
    print(f"[rag] 上下文已写入: {args.out}")

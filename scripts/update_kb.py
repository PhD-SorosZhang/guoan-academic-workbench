#!/usr/bin/env python3
"""
每周知识库更新脚本
汇总重点期刊选题方向、高被引文献、重大政策、领域热点，写入 knowledge_base/
"""
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rag import search_openalex, search_policy


def update_kb():
    kb_dir = "knowledge_base"
    os.makedirs(kb_dir, exist_ok=True)

    # 更新热点议题
    hot_topics = [
        "人工智能安全与治理", "科技自立自强与关键核心技术",
        "大国战略竞争与中美关系", "能源转型与能源安全",
        "粮食安全与种业振兴", "金融风险防范",
        "数据安全与跨境流动", "海洋安全与极地治理",
        "海外利益保护", "非传统安全协同治理"
    ]

    # 检索各主题前沿文献
    all_papers = []
    for topic in hot_topics[:5]:  # 限制5个主题避免超时
        try:
            papers = search_openalex(topic, "", max_results=3)
            for p in papers:
                p["topic"] = topic
            all_papers.extend(papers)
        except Exception as e:
            print(f"[kb] 检索 {topic} 失败: {e}")

    # 写入热点追踪文件
    hot_path = os.path.join(kb_dir, "hot_topics.md")
    with open(hot_path, "w", encoding="utf-8") as f:
        f.write(f"# 国家安全学前沿热点追踪\n\n")
        f.write(f"> 自动更新于 {datetime.now().strftime('%Y-%m-%d')}\n\n")
        f.write("## 重点关注议题\n\n")
        for t in hot_topics:
            f.write(f"- {t}\n")
        f.write("\n## 近期高相关文献\n\n")
        for p in all_papers[:20]:
            f.write(f"- **{p.get('title','')}** ({p.get('year','')}) - {p.get('venue','')}\n")
            if p.get("authors"):
                f.write(f"  - {p['authors']}\n")

    print(f"[kb] 知识库已更新: {hot_path}")


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    update_kb()

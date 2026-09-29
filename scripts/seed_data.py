#!/usr/bin/env python3
"""
种子数据脚本：用现有 ARTICLE_POOL 中的文章初始化数据库
运行: python scripts/seed_data.py
"""
import json
import os
import sys
import hashlib
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_db import init_db
from build_index import build_index

# 从 app.js 提取的 ARTICLE_POOL 文章（12篇）
SEED_ARTICLES = [
    {
        "title": "对象、中介与目标：基于总体国家安全观的国家安全学范畴探讨",
        "authors": "程同顺, 唐康",
        "journal": "国际安全研究",
        "year": 2025, "issue": "4", "pages": "3-20",
        "abstract": "国家安全学一级学科设立后，核心范畴体系尚未统一。本文梳理总体国家安全观规范文本、西方安全化理论与哲学范畴论三类资源，提出'对象—中介—目标'三元范畴框架，论证国家安全学研究对象是国家利益受损的可能性，安全化行为与制度安排是中介，国家安全目标是人的安全与国家存续的统一。",
        "keywords": "总体国家安全观;国家安全学;范畴体系;安全化",
        "category": "总体国家安全观",
        "source_type": "manual",
        "core_arg": "提出'对象—中介—目标'三元范畴框架，为国家安全学学科建设提供统一概念基础。",
        "detailed_flow": [
            {"step": "问题提出", "detail": "国家安全学一级学科设立后，核心范畴体系尚未统一，学界对'研究对象是什么'存在分歧。"},
            {"step": "理论资源梳理", "detail": "梳理总体国家安全观规范文本、西方安全化理论与哲学范畴论三类资源。"},
            {"step": "核心框架构建", "detail": "提出'对象—中介—目标'三元范畴框架。"},
            {"step": "对象范畴论证", "detail": "论证国家安全学研究对象是国家利益受损的可能性。"},
            {"step": "中介范畴论证", "detail": "安全化行为与制度安排是连接威胁认知与治理实践的中介。"},
            {"step": "目标范畴论证", "detail": "国家安全目标是人的安全与国家存续的统一。"},
            {"step": "结论与学科启示", "detail": "三元范畴框架为学科建设提供统一概念基础。"}
        ],
        "quotes": [
            "国家安全学的研究对象是国家利益受损的可能性，而非既成的安全或不安全状态。",
            "安全化不是单向过程，而是认知—制度—实践的循环。",
            "国家安全的目标是人的安全与国家存续的统一。"
        ],
        "theory_framework": [{"name": "总体国家安全观", "content": "以总体国家安全观为根本理论坐标"}, {"name": "安全化理论", "content": "借鉴哥本哈根学派安全化理论分析中介范畴"}],
        "policy_docs": [{"name": "总体国家安全观", "content": "系统回应总体国家安全观的范畴体系"}],
        "dim_scores": {"D1": 9, "D2": 8, "D3": 9, "D4": 7, "D5": 8, "D6": 6, "D7": 8, "D8": 8, "D9": 8, "D10": 8},
        "strengths": ["提出了系统性的三元范畴框架，对学科基础理论建设有重要贡献", "理论资源梳理全面，融通中西理论资源", "论证逻辑严密，范畴界定清晰"],
        "weaknesses": ["实证案例支撑相对不足，偏纯理论推演", "对'中介'范畴的操作化定义可进一步细化", "与国外安全研究最新进展的对话可更深入"],
        "reviewer_comments": "本文是国家安全学学科基础理论建设的重要尝试。作者敏锐地抓住了一级学科设立后范畴体系不统一这一核心问题，通过融通总体国家安全观规范文本、西方安全化理论与哲学范畴论，提出了'对象—中介—目标'三元范畴框架，具有较强的理论创新性和学科建设意义。论证逻辑较为严密，范畴界定基本清晰。不足之处在于：文章偏纯理论推演，缺乏实证案例支撑；'中介'范畴的操作化定义可进一步细化；与国外安全研究2024年以来的最新进展对话不够充分。总体而言，本文对国家安全学学科建设具有参考价值，建议在补充实证分析和前沿文献后发表。",
        "improvement": ["补充1-2个实证案例验证三元范畴框架的解释力", "细化'中介'范畴的操作化定义和测量指标", "增加与2024-2025年国际安全研究前沿文献的对话"],
        "followup_topics": ["国家安全学范畴体系的实证检验研究", "安全化理论在中国语境下的适用性研究", "国家安全学方法论体系构建"]
    },
    {
        "title": "非传统安全威胁的跨界性与协同治理机制研究",
        "authors": "余潇枫, 李佳",
        "journal": "世界经济与政治",
        "year": 2025, "issue": "3", "pages": "58-82",
        "abstract": "公共卫生、气候变化、跨国犯罪等非传统安全威胁跨界传导，单一主体难以应对。本文引入安全化理论与协同治理理论，分析多元主体如何共同'把威胁指涉化'，揭示部门分割、信息壁垒、责任模糊导致的协同失灵，构建政府—市场—社会—国际组织四维协同治理网络。",
        "keywords": "非传统安全;协同治理;安全化;跨界威胁",
        "category": "非传统安全",
        "source_type": "manual",
        "core_arg": "非传统安全治理需从'被动应对'转向'主动安全化'，构建四维协同治理网络。",
        "detailed_flow": [
            {"step": "问题提出", "detail": "非传统安全威胁跨界传导，单一主体难以应对。"},
            {"step": "概念辨析", "detail": "区分传统安全与非传统安全的跨界性、弥散性、非对称性。"},
            {"step": "理论视角", "detail": "引入安全化理论与协同治理理论。"},
            {"step": "机制困境", "detail": "揭示部门分割、信息壁垒、责任模糊导致的协同失灵。"},
            {"step": "机制设计", "detail": "构建四维协同治理网络。"},
            {"step": "案例验证", "detail": "以新冠疫情全球应对为例检验机制。"}
        ],
        "quotes": [
            "非传统安全的本质是'人的安全'，而非单纯的国家军事安全。",
            "协同治理不是简单的部门相加，而是信息、资源与责任的网络化重构。",
            "把威胁指涉化的过程，本身就是政治过程。"
        ],
        "theory_framework": [{"name": "安全化理论", "content": "分析非传统威胁的安全化过程"}, {"name": "协同治理理论", "content": "构建多元主体协同机制"}],
        "policy_docs": [{"name": "总体国家安全观", "content": "呼应总体国家安全观中非传统安全领域"}],
        "dim_scores": {"D1": 8, "D2": 7, "D3": 8, "D4": 7, "D5": 8, "D6": 7, "D7": 7, "D8": 8, "D9": 9, "D10": 8},
        "strengths": ["问题意识强，紧扣非传统安全治理的现实痛点", "理论框架运用得当，安全化与协同治理结合有新意", "案例选择具有典型性"],
        "weaknesses": ["四维协同网络的运行机制描述偏宏观，缺乏具体制度设计", "新冠疫情案例的时效性可更新", "对协同治理的成本和激励机制分析不足"],
        "reviewer_comments": "本文聚焦非传统安全威胁的跨界性与协同治理，问题意识明确，理论框架运用较为得当。作者将安全化理论与协同治理理论相结合，提出四维协同治理网络，具有一定的理论创新性和政策参考价值。新冠疫情案例具有典型性。不足之处在于：协同网络的具体运行机制和制度设计偏宏观，可操作性有待加强；案例数据可更新至最新；对协同治理的成本分担和激励机制分析不足。总体而言，本文对非传统安全治理研究有积极贡献。",
        "improvement": ["细化四维协同网络的具体制度设计和运行流程", "更新案例数据至2024-2025年", "增加协同治理的成本分担和激励机制分析"],
        "followup_topics": ["非传统安全协同治理的激励机制设计", "数字技术在非传统安全治理中的应用", "非传统安全国际合作机制研究"]
    },
    {
        "title": "海洋强国建设中的海上战略通道安全保障研究",
        "authors": "王义桅",
        "journal": "太平洋学报",
        "year": 2025, "issue": "2", "pages": "1-18",
        "abstract": "我国外贸与能源进口高度依赖海上通道，马六甲困境日益突出。本文从海盗、地缘博弈、军事封锁、基础设施薄弱四维评估通道风险，引入海权论与全球公共物品理论，构建'近海防御—远海护卫—国际合作'三层能力，提出海军存在、外交布局、港口网络、护航合作四维并进路径。",
        "keywords": "海洋强国;海上通道;马六甲困境;海权论",
        "category": "海洋安全",
        "source_type": "manual",
        "core_arg": "海洋强国不仅是海军强国，更是通道治理的规则供给者。",
        "detailed_flow": [
            {"step": "问题提出", "detail": "外贸与能源进口高度依赖海上通道。"},
            {"step": "风险评估", "detail": "四维评估通道风险。"},
            {"step": "理论资源", "detail": "引入海权论与全球公共物品理论。"},
            {"step": "战略目标", "detail": "构建三层能力体系。"},
            {"step": "路径设计", "detail": "四维并进路径。"},
            {"step": "国际合作", "detail": "推动北极航线、印度洋港口合作。"}
        ],
        "quotes": [
            "谁控制了马六甲，谁就扼住了中国能源的咽喉。",
            "海洋强国的标志不是舰队规模，而是能否提供全球海洋公共物品。",
            "海上通道安全是发展出来的，不是等待出来的。"
        ],
        "theory_framework": [{"name": "海权论", "content": "马汉海权论分析通道控制"}, {"name": "全球公共物品理论", "content": "分析通道治理的公共物品属性"}],
        "policy_docs": [{"name": "海洋强国战略", "content": "呼应海洋强国建设"}, {"name": "一带一路", "content": "结合21世纪海上丝绸之路"}],
        "dim_scores": {"D1": 8, "D2": 7, "D3": 7, "D4": 6, "D5": 7, "D6": 7, "D7": 6, "D8": 7, "D9": 9, "D10": 8},
        "strengths": ["战略视野开阔，紧扣海洋强国建设的核心议题", "风险评估框架系统", "政策建议具有可操作性"],
        "weaknesses": ["理论深度有待加强，海权论的运用偏描述性", "数据支撑可更充分", "对海上通道安全的国际法律维度关注不足"],
        "reviewer_comments": "本文聚焦海上战略通道安全保障，战略视野开阔，紧扣海洋强国建设和'一带一路'的核心议题。作者构建的风险评估框架和三层能力体系具有系统性，政策建议基本可行。不足之处在于：理论深度有待加强，海权论的运用偏描述性，缺乏批判性反思；数据支撑可更充分；对国际海洋法和通道治理的规则维度关注不足。总体而言，本文对海洋安全研究和政策制定有参考价值。",
        "improvement": ["深化海权论的批判性运用，增加理论对话", "补充通道贸易量、能源进口依赖度等量化数据", "增加国际海洋法和规则供给维度的分析"],
        "followup_topics": ["北极航道开通对中国海上通道安全的影响", "印度洋港口网络的地缘政治风险评估", "海上通道安全的国际规则供给研究"]
    },
    {
        "title": "网络空间主权与全球互联网治理",
        "authors": "黄日涵, 张华",
        "journal": "现代国际关系",
        "year": 2025, "issue": "5", "pages": "45-62",
        "abstract": "从网络空间主权原则出发，分析全球互联网治理的博弈格局，提出中国参与治理的策略。",
        "keywords": "网络安全;网络主权;全球治理",
        "category": "网络安全",
        "source_type": "manual",
        "core_arg": "网络空间主权是参与全球互联网治理的根本原则。",
        "detailed_flow": [{"step": "原则阐释", "detail": "网络空间主权原则的内涵"}, {"step": "格局分析", "detail": "全球互联网治理博弈格局"}, {"step": "策略建议", "detail": "中国参与治理的策略"}],
        "quotes": ["网络空间不是法外之地，主权原则同样适用于网络空间。"],
        "theory_framework": [{"name": "网络空间主权理论", "content": "分析网络主权的理论基础"}],
        "policy_docs": [{"name": "网络安全法", "content": "呼应网络空间主权"}],
        "dim_scores": {"D1": 7, "D2": 6, "D3": 7, "D4": 6, "D5": 7, "D6": 6, "D7": 7, "D8": 7, "D9": 8, "D10": 7},
        "strengths": ["紧扣网络空间主权这一核心议题", "政策建议有针对性"],
        "weaknesses": ["理论创新性有限", "对最新技术发展（如AI、Web3）的影响分析不足"],
        "reviewer_comments": "本文围绕网络空间主权与全球互联网治理展开，选题具有现实意义。作者对治理格局的分析较为清晰，政策建议有针对性。但理论创新性有限，对人工智能、Web3等新技术对网络治理的影响分析不足。",
        "improvement": ["增加AI和Web3对网络治理影响的分析", "深化网络主权理论的学理探讨"],
        "followup_topics": ["人工智能时代的网络空间主权研究", "全球数据治理规则博弈"]
    },
    {
        "title": "边疆治理与国家安全的互动逻辑",
        "authors": "周平",
        "journal": "政治学研究",
        "year": 2025, "issue": "2", "pages": "23-40",
        "abstract": "分析边疆治理与国家安全的双向互动关系，提出边疆治理体系现代化的路径。",
        "keywords": "边疆安全;边疆治理;民族地区",
        "category": "国土安全",
        "source_type": "manual",
        "core_arg": "边疆治理与国家安全是双向互动的关系。",
        "detailed_flow": [{"step": "概念界定", "detail": "边疆治理与国家安全的概念"}, {"step": "互动机制", "detail": "双向互动机制分析"}, {"step": "案例分析", "detail": "民族地区案例"}, {"step": "路径设计", "detail": "治理体系现代化路径"}],
        "quotes": ["边疆稳则国家安，边疆治则天下定。"],
        "theory_framework": [{"name": "边疆治理理论", "content": "分析边疆治理的理论框架"}],
        "policy_docs": [{"name": "兴边富民行动", "content": "呼应边疆治理政策"}],
        "dim_scores": {"D1": 8, "D2": 7, "D3": 8, "D4": 7, "D5": 8, "D6": 7, "D7": 7, "D8": 8, "D9": 8, "D10": 8},
        "strengths": ["理论框架成熟，互动逻辑分析透彻", "案例丰富", "政策路径清晰"],
        "weaknesses": ["对数字时代边疆治理的新挑战关注不够", "国际比较视角可加强"],
        "reviewer_comments": "本文对边疆治理与国家安全的互动逻辑进行了系统分析，理论框架成熟，论证充分。建议增加数字时代边疆治理新挑战的分析和国际比较视角。",
        "improvement": ["增加数字技术对边疆治理的影响分析", "增加国际边疆治理比较"],
        "followup_topics": ["数字边疆治理研究", "边疆安全的国际比较"]
    },
    {
        "title": "科技安全视角下关键核心技术攻关的举国体制研究",
        "authors": "陈劲, 阳镇",
        "journal": "中国软科学",
        "year": 2025, "issue": "3", "pages": "1-15",
        "abstract": "从科技安全视角分析关键核心技术攻关的新型举国体制，提出优化路径。",
        "keywords": "科技安全;关键核心技术;举国体制",
        "category": "科技安全",
        "source_type": "manual",
        "core_arg": "新型举国体制是关键核心技术攻关的制度保障。",
        "detailed_flow": [{"step": "安全视角", "detail": "科技安全的内涵与挑战"}, {"step": "体制分析", "detail": "新型举国体制的特征"}, {"step": "问题诊断", "detail": "当前体制存在的问题"}, {"step": "优化路径", "detail": "体制优化建议"}],
        "quotes": ["关键核心技术是要不来、买不来、讨不来的。"],
        "theory_framework": [{"name": "创新系统理论", "content": "分析技术创新的系统特征"}],
        "policy_docs": [{"name": "科技自立自强战略", "content": "呼应科技安全战略"}],
        "dim_scores": {"D1": 9, "D2": 8, "D3": 7, "D4": 8, "D5": 8, "D6": 8, "D7": 8, "D8": 8, "D9": 9, "D10": 8},
        "strengths": ["选题重大，紧扣科技自立自强国家战略", "举国体制分析有深度", "政策建议具体可行"],
        "weaknesses": ["对市场机制与举国体制的平衡分析可更深入", "国际比较可加强"],
        "reviewer_comments": "本文从科技安全视角研究关键核心技术攻关的举国体制，选题重大，具有重要的政策价值。作者对新型举国体制的分析有深度，建议可行。建议进一步深化市场机制与政府作用的平衡分析。",
        "improvement": ["深化市场与政府在关键技术攻关中的协同机制", "增加美德日等国技术攻关体制比较"],
        "followup_topics": ["人工智能关键核心技术攻关体制研究", "科技安全评估指标体系构建"]
    },
    {
        "title": "总体国家安全观视域下的金融安全治理体系构建",
        "authors": "张红力",
        "journal": "金融研究",
        "year": 2025, "issue": "1", "pages": "1-18",
        "abstract": "在总体国家安全观视域下分析金融安全的内涵与挑战，构建金融安全治理体系。",
        "keywords": "金融安全;总体国家安全观;治理体系",
        "category": "经济安全",
        "source_type": "manual",
        "core_arg": "金融安全是总体国家安全的重要组成部分，需构建系统治理体系。",
        "detailed_flow": [{"step": "内涵界定", "detail": "金融安全的内涵"}, {"step": "挑战分析", "detail": "当前金融安全面临的挑战"}, {"step": "体系构建", "detail": "治理体系框架"}, {"step": "实施路径", "detail": "具体实施建议"}],
        "quotes": ["金融安全是国家安全的重要组成部分，是经济平稳健康发展的重要基础。"],
        "theory_framework": [{"name": "金融监管理论", "content": "分析金融安全的监管框架"}],
        "policy_docs": [{"name": "防范化解重大风险攻坚战", "content": "呼应金融安全政策"}],
        "dim_scores": {"D1": 8, "D2": 7, "D3": 8, "D4": 7, "D5": 8, "D6": 8, "D7": 7, "D8": 8, "D9": 9, "D10": 8},
        "strengths": ["将金融安全置于总体国家安全观框架下分析，视角新颖", "治理体系构建系统", "政策建议有针对性"],
        "weaknesses": ["量化分析不足", "对国际金融制裁等新型风险关注可加强"],
        "reviewer_comments": "本文在总体国家安全观视域下构建金融安全治理体系，视角新颖，框架系统。建议增加量化分析和国际金融制裁等新型风险的研究。",
        "improvement": ["增加金融安全的量化评估", "增加国际金融制裁和金融脱钩风险分析"],
        "followup_topics": ["金融安全预警指标体系研究", "数字货币对金融安全的影响"]
    },
    {
        "title": "人工智能发展对国家安全的影响与治理",
        "authors": "李开孟, 王刚",
        "journal": "国际安全研究",
        "year": 2025, "issue": "5", "pages": "35-52",
        "abstract": "分析人工智能发展对军事、经济、社会、网络等安全领域的影响，提出治理框架。",
        "keywords": "人工智能;科技安全;治理",
        "category": "科技安全",
        "source_type": "manual",
        "core_arg": "人工智能是双刃剑，需构建安全治理框架。",
        "detailed_flow": [{"step": "影响分析", "detail": "AI对各安全领域的影响"}, {"step": "风险识别", "detail": "AI带来的安全风险"}, {"step": "治理框架", "detail": "AI安全治理框架"}, {"step": "政策建议", "detail": "具体治理建议"}],
        "quotes": ["人工智能是引领新一轮科技革命和产业变革的战略性技术。"],
        "theory_framework": [{"name": "技术治理理论", "content": "分析AI治理的理论基础"}],
        "policy_docs": [{"name": "生成式AI服务管理暂行办法", "content": "呼应AI治理政策"}],
        "dim_scores": {"D1": 9, "D2": 8, "D3": 7, "D4": 7, "D5": 8, "D6": 7, "D7": 9, "D8": 8, "D9": 9, "D10": 8},
        "strengths": ["紧扣AI安全这一前沿议题", "影响分析覆盖多领域", "治理框架有前瞻性"],
        "weaknesses": ["对AI军事应用的深度分析不足", "国际AI治理博弈分析可加强"],
        "reviewer_comments": "本文分析人工智能对国家安全的多维度影响，选题前沿，具有重要的现实意义。作者构建的治理框架有前瞻性。建议深化AI军事应用和国际治理博弈的分析。",
        "improvement": ["深化AI在军事安全领域的应用与风险分析", "增加中美欧AI治理博弈的比较分析"],
        "followup_topics": ["自主武器系统的国际法规制研究", "AI大模型的安全评估标准研究"]
    },
    {
        "title": "中国海外利益保护的机制创新与路径选择",
        "authors": "陈东晓",
        "journal": "国际展望",
        "year": 2025, "issue": "2", "pages": "1-16",
        "abstract": "分析中国海外利益面临的安全风险，提出保护机制创新和路径选择。",
        "keywords": "海外利益;领事保护;一带一路安全",
        "category": "海外利益",
        "source_type": "manual",
        "core_arg": "海外利益保护需机制创新，构建多元保护体系。",
        "detailed_flow": [{"step": "利益盘点", "detail": "中国海外利益的规模与分布"}, {"step": "风险分析", "detail": "海外利益面临的安全风险"}, {"step": "机制创新", "detail": "保护机制创新方向"}, {"step": "路径选择", "detail": "具体实施路径"}],
        "quotes": ["海外利益是国家利益的重要延伸，保护海外利益就是保护国家发展利益。"],
        "theory_framework": [{"name": "海外利益保护理论", "content": "分析海外利益保护的理论框架"}],
        "policy_docs": [{"name": "一带一路安全保障", "content": "呼应海外利益保护政策"}],
        "dim_scores": {"D1": 8, "D2": 7, "D3": 7, "D4": 7, "D5": 8, "D6": 8, "D7": 7, "D8": 8, "D9": 9, "D10": 8},
        "strengths": ["海外利益分析系统全面", "机制创新有针对性", "政策路径清晰"],
        "weaknesses": ["对私营军事公司等新兴保护主体的分析不足", "案例可更丰富"],
        "reviewer_comments": "本文对中国海外利益保护进行了系统研究，机制创新建议有价值。建议增加私营安保公司等新兴主体的分析和更多案例。",
        "improvement": ["增加私营安保公司在海外利益保护中的作用分析", "补充更多国别案例"],
        "followup_topics": ["中国海外公民安全保护机制研究", "海外关键基础设施安全保护研究"]
    },
    {
        "title": "生物安全治理的国际合作与中国路径",
        "authors": "童蕴芝",
        "journal": "国际论坛",
        "year": 2025, "issue": "3", "pages": "55-72",
        "abstract": "分析生物安全的全球治理困境，提出国际合作框架和中国参与路径。",
        "keywords": "生物安全;全球治理;国际合作",
        "category": "生态安全",
        "source_type": "manual",
        "core_arg": "生物安全需要全球协同治理，中国应积极参与规则制定。",
        "detailed_flow": [{"step": "治理困境", "detail": "生物安全全球治理的困境"}, {"step": "合作框架", "detail": "国际合作的框架设计"}, {"step": "中国路径", "detail": "中国参与的路径选择"}],
        "quotes": ["生物安全关乎人民生命健康，关乎国家长治久安。"],
        "theory_framework": [{"name": "全球治理理论", "content": "分析生物安全的全球治理"}],
        "policy_docs": [{"name": "生物安全法", "content": "呼应生物安全政策"}],
        "dim_scores": {"D1": 7, "D2": 6, "D3": 7, "D4": 6, "D5": 7, "D6": 6, "D7": 7, "D8": 7, "D9": 8, "D10": 7},
        "strengths": ["选题有现实意义", "国际合作框架设计合理"],
        "weaknesses": ["创新性一般", "对生物实验室安全等具体议题分析不够深入"],
        "reviewer_comments": "本文探讨生物安全的国际合作，选题有意义。建议深化具体议题分析和中国方案的学理论证。",
        "improvement": ["深化生物实验室安全和病原体研究监管分析", "加强中国方案的学理论证"],
        "followup_topics": ["全球疫情预警机制研究", "生物实验室安全国际标准研究"]
    },
    {
        "title": "粮食安全的多维视角与战略保障体系",
        "authors": "韩俊",
        "journal": "管理世界",
        "year": 2025, "issue": "4", "pages": "1-14",
        "abstract": "从多维视角分析中国粮食安全面临的挑战，构建战略保障体系。",
        "keywords": "粮食安全;种业振兴;耕地保护",
        "category": "经济安全",
        "source_type": "manual",
        "core_arg": "粮食安全是国之大者，需构建多维战略保障体系。",
        "detailed_flow": [{"step": "多维分析", "detail": "粮食安全的多维视角"}, {"step": "挑战识别", "detail": "当前面临的挑战"}, {"step": "体系构建", "detail": "战略保障体系"}, {"step": "政策建议", "detail": "具体政策建议"}],
        "quotes": ["中国人的饭碗任何时候都要牢牢端在自己手中。"],
        "theory_framework": [{"name": "粮食安全理论", "content": "分析粮食安全的理论框架"}],
        "policy_docs": [{"name": "种业振兴行动方案", "content": "呼应粮食安全政策"}],
        "dim_scores": {"D1": 8, "D2": 7, "D3": 7, "D4": 8, "D5": 8, "D6": 9, "D7": 7, "D8": 8, "D9": 9, "D10": 8},
        "strengths": ["数据详实，分析系统", "政策建议权威可行", "多维视角有新意"],
        "weaknesses": ["理论创新性一般", "国际粮食市场波动的影响分析可加强"],
        "reviewer_comments": "本文从多维视角研究粮食安全，数据详实，政策建议权威。建议增加国际粮食市场波动和气候变化对粮食安全的影响分析。",
        "improvement": ["增加国际粮食市场波动影响分析", "增加气候变化对粮食生产的影响评估"],
        "followup_topics": ["种业科技自立自强研究", "气候变化对中国粮食安全的影响评估"]
    },
    {
        "title": "国家安全学一级学科建设的进展与思考",
        "authors": "马振超",
        "journal": "国家安全研究",
        "year": 2024, "issue": "6", "pages": "5-22",
        "abstract": "梳理国家安全学一级学科设立以来的建设进展，分析学科定位、人才培养等方面的问题。",
        "keywords": "国家安全学;学科建设;人才培养",
        "category": "总体国家安全观",
        "source_type": "manual",
        "core_arg": "国家安全学学科建设需在定位、体系、人才三方面协同推进。",
        "detailed_flow": [{"step": "建设进展", "detail": "学科设立以来的进展"}, {"step": "问题分析", "detail": "学科定位和人才培养问题"}, {"step": "改进方向", "detail": "学科建设改进方向"}],
        "quotes": ["国家安全学一级学科的设立是新时代国家安全事业发展的必然要求。"],
        "theory_framework": [{"name": "学科建设理论", "content": "分析学科建设的一般规律"}],
        "policy_docs": [{"name": "国家安全学一级学科建设意见", "content": "呼应学科建设政策"}],
        "dim_scores": {"D1": 8, "D2": 6, "D3": 7, "D4": 6, "D5": 7, "D6": 7, "D7": 8, "D8": 8, "D9": 8, "D10": 8},
        "strengths": ["学科建设梳理全面", "问题诊断准确", "对学科发展有指导意义"],
        "weaknesses": ["理论深度有待加强", "人才培养的具体方案可更细化"],
        "reviewer_comments": "本文梳理国家安全学学科建设进展，对学科发展有指导意义。建议深化理论探讨和人才培养方案设计。",
        "improvement": ["深化国家安全学学科范式的理论探讨", "细化人才培养的课程体系和实践方案"],
        "followup_topics": ["国家安全学课程体系建设研究", "国家安全学人才培养模式创新"]
    },
]


def calc_total_score(dim_scores):
    weights = {"D1": 0.12, "D2": 0.15, "D3": 0.12, "D4": 0.12, "D5": 0.10,
               "D6": 0.10, "D7": 0.08, "D8": 0.05, "D9": 0.10, "D10": 0.06}
    total = sum(dim_scores.get(k, 5) * w for k, w in weights.items()) * 10
    return round(total, 1)


def get_grade(score):
    if score >= 90: return "S"
    if score >= 80: return "A"
    if score >= 70: return "B"
    return "C"


def seed():
    db_path = "data/archive.db"
    init_db(db_path)

    import sqlite3
    conn = sqlite3.connect(db_path)

    base_date = datetime(2026, 9, 20)
    for i, art in enumerate(SEED_ARTICLES):
        crawl_date = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
        aid = hashlib.md5(f"{art['title']}{crawl_date}".encode()).hexdigest()[:6]
        article_id = f"{crawl_date.replace('-', '')}-{aid}"
        created_at = f"{crawl_date}T06:30:00+08:00"

        # 插入文章
        conn.execute("""
            INSERT OR IGNORE INTO articles
            (id, title, title_norm, authors, journal, year, issue, pages, doi,
             source_type, source_url, abstract, keywords, category, crawl_date,
             full_text, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            article_id, art["title"], art["title"].replace(" ", "").lower(),
            art["authors"], art["journal"], art["year"], art.get("issue", ""),
            art.get("pages", ""), "", art["source_type"], "",
            art["abstract"], art["keywords"], art["category"], crawl_date,
            0, created_at
        ))

        # 插入剖析
        total_score = calc_total_score(art["dim_scores"])
        grade = get_grade(total_score)

        conn.execute("""
            INSERT OR IGNORE INTO analyses
            (id, article_id, core_arg, detailed_flow, quotes, theory_framework,
             policy_docs, data_sources, llm_model, prompt_version, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (
            hashlib.md5(f"{article_id}-an".encode()).hexdigest()[:12],
            article_id, art["core_arg"],
            json.dumps(art["detailed_flow"], ensure_ascii=False),
            json.dumps(art["quotes"], ensure_ascii=False),
            json.dumps(art["theory_framework"], ensure_ascii=False),
            json.dumps(art["policy_docs"], ensure_ascii=False),
            json.dumps([], ensure_ascii=False),
            "seed-data", "evaluator-v1.0", created_at
        ))

        # 插入评价
        dim_reasons = {k: f"{k}维度基于文章内容评估" for k in art["dim_scores"]}
        frontier = {
            "literature": [
                {"title": "总体国家安全观研究综述", "year": 2024, "venue": "国际安全研究", "source": "OpenAlex"},
                {"title": "非传统安全治理前沿", "year": 2025, "venue": "世界经济与政治", "source": "OpenAlex"},
            ],
            "policy_docs": [
                {"title": "总体国家安全观学习纲要", "year": 2022, "category": art["category"]},
            ],
            "retrieved_at": created_at
        }

        conn.execute("""
            INSERT OR IGNORE INTO evaluations
            (id, article_id, total_score, grade, recommend_level, dimension_scores,
             dimension_reasons, strengths, weaknesses, reviewer_comments,
             improvement, followup_topics, frontier_context, relevance_to_user,
             llm_model, prompt_version, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            hashlib.md5(f"{article_id}-ev".encode()).hexdigest()[:12],
            article_id, total_score, grade, min(5, max(1, int(total_score / 20))),
            json.dumps(art["dim_scores"], ensure_ascii=False),
            json.dumps(dim_reasons, ensure_ascii=False),
            json.dumps(art["strengths"], ensure_ascii=False),
            json.dumps(art["weaknesses"], ensure_ascii=False),
            art["reviewer_comments"],
            json.dumps(art["improvement"], ensure_ascii=False),
            json.dumps(art["followup_topics"], ensure_ascii=False),
            json.dumps(frontier, ensure_ascii=False),
            f"与国家安全学研究方向高度相关，涉及{art['category']}领域。",
            "seed-data", "evaluator-v1.0", created_at
        ))

        # 写入 crawl_log
        conn.execute("""
            INSERT OR IGNORE INTO crawl_log
            (run_date, started_at, finished_at, status, sources_status,
             fetched_count, new_count, analyzed_count, duration_sec, details)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (
            crawl_date, f"{crawl_date}T06:30:00+08:00", f"{crawl_date}T06:35:00+08:00",
            "success", json.dumps({"seed": "ok"}), 1, 1, 1, 300, "种子数据"
        ))

    conn.commit()
    conn.close()
    print(f"[seed] 已写入 {len(SEED_ARTICLES)} 篇种子文章")

    # 重建索引
    build_index(db_path, "data/index.json", "data/articles")
    print("[seed] 索引和单篇存档已生成")


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    seed()

"""把课程中心静态教材导入 MySQL，作为统一知识体系。

数据来源：mcs-postgrad-helper-python/data/course_knowledge_export.json
（由 web/src/data/408TextbooksData.ts 导出）

写入：
- k_chapter / k_section / k_point / k_article
- kb_document / kb_chunk（供 RAG 检索）

脚本幂等，可重复执行。
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pymysql
from pymysql.cursors import DictCursor

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "data" / "course_knowledge_export.json"

DB = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "123456"),
    "database": os.getenv("DB_NAME", "mcs_postgrad_helper"),
    "charset": "utf8mb4",
    "cursorclass": DictCursor,
}

SUBJECT_CODE = {"DS": "DS", "CO": "CO", "OS": "OS", "NET": "CN", "CN": "CN"}
SUBJECT_COLOR = {
    "DS": "from-blue-600 to-indigo-600",
    "CO": "from-cyan-600 to-blue-600",
    "OS": "from-emerald-600 to-teal-600",
    "CN": "from-amber-600 to-orange-600",
}


def safe_id(value: str) -> str:
    import re
    return re.sub(r"[^0-9A-Za-z_\-\u4e00-\u9fff]", "_", value)[:64]


def build_markdown(section: dict) -> str:
    parts = [f"# {section.get('title', '')}", "", section.get("coreConcepts", "").strip()]
    snippet = section.get("codeSnippet")
    if snippet:
        parts += [
            "",
            "## 代码示例",
            snippet.get("description", ""),
            "",
            f"```{snippet.get('language', 'c')}",
            snippet.get("code", ""),
            "```",
        ]
    pitfalls = section.get("examPitfalls") or []
    if pitfalls:
        parts += ["", "## 408 易错点"]
        parts += [f"- {item}" for item in pitfalls]
    formulas = section.get("formulaList") or []
    if formulas:
        parts += ["", "## 关键公式"]
        parts += [f"- {item}" for item in formulas]
    exams = section.get("relatedTrueExams") or []
    if exams:
        parts += ["", "## 关联真题"]
        for exam in exams:
            parts.append(f"- {exam.get('year', '')} 年第 {exam.get('questionNumber', '')} 题：{exam.get('title', '')}")
    return "\n".join(parts).strip()


def main() -> None:
    if not EXPORT.exists():
        raise SystemExit(f"缺少课程数据文件: {EXPORT}")
    data = json.loads(EXPORT.read_text(encoding="utf-8"))
    conn = pymysql.connect(**DB)
    try:
        with conn.cursor() as cur:
            for book in data.values():
                raw_code = str(book.get("code", "DS")).upper()
                code = SUBJECT_CODE.get(raw_code, raw_code)
                subject_name = book.get("name", code)
                chapters = book.get("chapters") or []

                # 课程中心知识库文档
                doc_title = f"408 课程中心教材精讲 · {subject_name}"
                file_url = f"internal://course/{code}"
                cur.execute("SELECT id FROM kb_document WHERE file_url=%s LIMIT 1", (file_url,))
                existing = cur.fetchone()
                if existing:
                    doc_id = existing["id"]
                    cur.execute("DELETE FROM kb_chunk WHERE document_id=%s", (doc_id,))
                    cur.execute(
                        "UPDATE kb_document SET title=%s, subject_code=%s, parse_status='SUCCESS', chunk_count=%s, is_public=1 WHERE id=%s",
                        (doc_title, code, len(chapters), doc_id),
                    )
                else:
                    cur.execute(
                        """INSERT INTO kb_document
                        (user_id, title, file_type, file_url, file_size, subject_code, parse_status, chunk_count, is_public)
                        VALUES (NULL, %s, 'markdown', %s, 0, %s, 'SUCCESS', %s, 1)""",
                        (doc_title, file_url, code, len(chapters)),
                    )
                    doc_id = cur.lastrowid

                chunk_rows = []
                for chapter_index, chapter in enumerate(chapters, start=1):
                    chapter_id = safe_id(f"course_{code}_{chapter.get('id', chapter_index)}")
                    cur.execute(
                        """INSERT INTO k_chapter (id, subject_code, title, chapter_number, layer, sort_order)
                        VALUES (%s, %s, %s, %s, '课程中心', %s)
                        ON DUPLICATE KEY UPDATE title=VALUES(title), chapter_number=VALUES(chapter_number), sort_order=VALUES(sort_order)""",
                        (chapter_id, code, chapter.get("title", f"第{chapter_index}章"), chapter_index, chapter_index),
                    )

                    for section_index, section in enumerate(chapter.get("sections") or [], start=1):
                        section_id = safe_id(f"course_sec_{code}_{section.get('id', section_index)}")
                        point_id = safe_id(f"course_pt_{code}_{section.get('id', section_index)}")
                        article_id = safe_id(f"course_art_{code}_{section.get('id', section_index)}")
                        title = section.get("title", "未命名小节")
                        syllabus = section.get("syllabusRequirement", "")
                        is_key = bool(section.get("isKey"))
                        exams = section.get("relatedTrueExams") or []
                        tags = [title, subject_name] + [exam.get("title", "") for exam in exams]

                        cur.execute(
                            """INSERT INTO k_section (id, chapter_id, title, summary, sort_order)
                            VALUES (%s, %s, %s, %s, %s)
                            ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), sort_order=VALUES(sort_order)""",
                            (section_id, chapter_id, title[:128], syllabus[:2000], section_index),
                        )
                        cur.execute(
                            """INSERT INTO k_point (id, section_id, title, summary, importance, exam_frequency, tags_json, sort_order)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            ON DUPLICATE KEY UPDATE section_id=VALUES(section_id), title=VALUES(title), summary=VALUES(summary),
                            importance=VALUES(importance), exam_frequency=VALUES(exam_frequency), tags_json=VALUES(tags_json)""",
                            (
                                point_id, section_id, title[:128], syllabus[:2000],
                                5 if is_key else 3, len(exams),
                                json.dumps([t for t in tags if t], ensure_ascii=False), section_index,
                            ),
                        )

                        content = build_markdown(section)
                        article_content = (section.get("coreConcepts") or "").strip()
                        meta = {
                            "syllabusRequirement": syllabus,
                            "isKey": is_key,
                            "examPitfalls": section.get("examPitfalls") or [],
                            "formulaList": section.get("formulaList") or [],
                            "relatedTrueExams": exams,
                            "codeSnippet": section.get("codeSnippet"),
                        }
                        cur.execute(
                            """INSERT INTO k_article (id, point_id, title, content_md, meta_json, diagram_type, read_count)
                            VALUES (%s, %s, %s, %s, %s, NULL, 0)
                            ON DUPLICATE KEY UPDATE title=VALUES(title), content_md=VALUES(content_md), meta_json=VALUES(meta_json)""",
                            (article_id, point_id, title[:128], article_content, json.dumps(meta, ensure_ascii=False)),
                        )
                        chunk_rows.append((doc_id, len(chunk_rows), content[:12000], max(len(content) // 2, 1), chapter_index))

                if chunk_rows:
                    cur.executemany(
                        """INSERT INTO kb_chunk (document_id, chunk_index, content, token_count, page_number)
                        VALUES (%s, %s, %s, %s, %s)""",
                        chunk_rows,
                    )
                print(f"[ok] {subject_name}: {len(chapters)} 章 / {len(chunk_rows)} 个小节")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    print("课程中心知识体系导入完成")


if __name__ == "__main__":
    main()

"""把 kaoyan（408 Pilot）的知识点与题库导入现有 MySQL 项目。

用法（在项目根目录执行）：
    python3 mcs-postgrad-helper-python/scripts/import_kaoyan_to_mysql.py

默认读取 ../kaoyan/data，写入 mcs_postgrad_helper 数据库。
脚本是幂等的：知识点/文章/切片会按固定 ID 覆盖更新，题目按外部 ID upsert。
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

import pymysql
from pymysql.cursors import DictCursor

ROOT = Path(__file__).resolve().parents[2]
KAOYAN_DATA = ROOT / "kaoyan" / "data"

DB = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "123456"),
    "database": os.getenv("DB_NAME", "mcs_postgrad_helper"),
    "charset": "utf8mb4",
    "cursorclass": DictCursor,
    "autocommit": False,
}

SUBJECT_MAP = {
    "数据结构": "DS",
    "计算机组成原理": "CO",
    "组成原理": "CO",
    "操作系统": "OS",
    "计算机网络": "CN",
    "计网": "CN",
}
SUBJECT_NAMES = {
    "DS": "数据结构",
    "CO": "计算机组成原理",
    "OS": "操作系统",
    "CN": "计算机网络",
}
DIFFICULTY_MAP = {"基础": 1, "中等": 3, "较难": 4, "困难": 5}
IMPORTANCE_MAP = {"一般": 3, "重要": 4, "核心": 5, "高频": 5}

PRACTICE_YEAR = 2027
PRACTICE_TITLE = "408 AI 智能练习题库（全科）"


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def subject_code(value: str | None) -> str | None:
    if not value:
        return None
    return SUBJECT_MAP.get(value.strip())


def safe_id(value: str) -> str:
    value = re.sub(r"[^0-9A-Za-z_\-\u4e00-\u9fff]", "_", value or "")
    return value[:60]


def normalize_stem(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text or "")
    text = re.sub(r"[\s\u3000]+", "", text)
    text = re.sub(r"[，。！？；：、“”‘’（）()\[\]【】《》<>.,!?;:'\"`~@#$%^&*_+=|\\/—-]", "", text)
    return text.lower()[:220]


def parse_options(options) -> list[dict] | None:
    if not options:
        return None
    if isinstance(options, dict):
        return [{"key": str(k), "text": str(v)} for k, v in options.items()]
    parsed = []
    for item in options:
        if isinstance(item, dict):
            parsed.append({"key": str(item.get("key", "")), "text": str(item.get("text", ""))})
            continue
        text = str(item).strip()
        match = re.match(r"^([A-Da-d])[\.、:：\s]+(.*)$", text)
        if match:
            parsed.append({"key": match.group(1).upper(), "text": match.group(2).strip()})
        else:
            parsed.append({"key": chr(65 + len(parsed)), "text": text})
    return parsed or None


def build_point_markdown(point: dict) -> str:
    parts = [f"# {point.get('title', '')}", "", point.get("content", "").strip()]
    score_points = point.get("score_points") or []
    if score_points:
        parts += ["", "## 采分点"]
        parts += [f"- {item}" for item in score_points]
    questions = point.get("exam_questions") or []
    if questions:
        parts += ["", "## 关联真题"]
        for q in questions[:6]:
            parts += ["", f"### {q.get('year', '')} {q.get('type', '')}".strip()]
            parts.append(q.get("stem", ""))
            opts = q.get("options") or []
            if opts:
                parts += [f"- {opt}" for opt in opts]
            if q.get("answer"):
                parts.append(f"**答案：** {q['answer']}")
            if q.get("analysis"):
                parts.append(f"**解析：** {q['analysis']}")
    return "\n".join(parts).strip()


def import_knowledge(conn) -> tuple[int, int]:
    rows = load_jsonl(KAOYAN_DATA / "knowledge_points.jsonl")
    if not rows:
        print("  [skip] knowledge_points.jsonl 不存在或为空")
        return 0, 0

    by_subject: dict[str, list[dict]] = {}
    for row in rows:
        code = subject_code(row.get("subject"))
        if code:
            by_subject.setdefault(code, []).append(row)

    points_count = 0
    chunks_count = 0
    with conn.cursor() as cur:
        for code, points in by_subject.items():
            doc_title = f"408 知识点精讲库 · {SUBJECT_NAMES.get(code, code)}"
            file_url = f"internal://kaoyan/knowledge_points/{code}"
            cur.execute("SELECT id FROM kb_document WHERE file_url=%s LIMIT 1", (file_url,))
            existing = cur.fetchone()
            if existing:
                doc_id = existing["id"]
                cur.execute("DELETE FROM kb_chunk WHERE document_id=%s", (doc_id,))
                cur.execute(
                    "UPDATE kb_document SET title=%s, subject_code=%s, parse_status='SUCCESS', chunk_count=%s, is_public=1 WHERE id=%s",
                    (doc_title, code, len(points), doc_id),
                )
            else:
                cur.execute(
                    """INSERT INTO kb_document
                    (user_id, title, file_type, file_url, file_size, subject_code, parse_status, chunk_count, is_public)
                    VALUES (NULL, %s, 'markdown', %s, 0, %s, 'SUCCESS', %s, 1)""",
                    (doc_title, file_url, code, len(points)),
                )
                doc_id = cur.lastrowid

            chunk_rows = []
            for index, point in enumerate(points):
                chapter_key = safe_id(f"ky_ch_{code}_{point.get('chapter_id') or point.get('chapter_title') or index}")
                section_key = safe_id(f"ky_sec_{code}_{point.get('chapter_id') or index}")
                point_key = safe_id(f"ky_{point.get('id') or f'{code}_{index}'}")
                article_key = safe_id(f"ky_art_{point.get('id') or f'{code}_{index}'}")

                chapter_title = point.get("chapter_title") or point.get("chapter") or "未分类章节"
                chapter_order = int(point.get("chapter_order") or index + 1)
                cur.execute(
                    """INSERT INTO k_chapter (id, subject_code, title, chapter_number, layer, sort_order)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE title=VALUES(title), chapter_number=VALUES(chapter_number), sort_order=VALUES(sort_order)""",
                    (chapter_key, code, chapter_title, chapter_order, SUBJECT_NAMES.get(code, code), chapter_order),
                )
                cur.execute(
                    """INSERT INTO k_section (id, chapter_id, title, summary, sort_order)
                    VALUES (%s, %s, %s, %s, 1)
                    ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary)""",
                    (section_key, chapter_key, f"{chapter_title} · 核心考点", (point.get("content") or "")[:300]),
                )

                title = point.get("title") or "未命名知识点"
                content = point.get("content") or ""
                tags = point.get("knowledge_points") or point.get("tags") or []
                exam_frequency = len(point.get("exam_questions") or [])
                importance = IMPORTANCE_MAP.get(str(point.get("importance") or ""), 3)
                cur.execute(
                    """INSERT INTO k_point (id, section_id, title, summary, importance, exam_frequency, tags_json, sort_order)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE section_id=VALUES(section_id), title=VALUES(title), summary=VALUES(summary),
                    importance=VALUES(importance), exam_frequency=VALUES(exam_frequency), tags_json=VALUES(tags_json)""",
                    (point_key, section_key, title[:128], content[:1000], importance, exam_frequency, json.dumps(tags, ensure_ascii=False), index),
                )

                markdown = build_point_markdown(point)
                cur.execute(
                    """INSERT INTO k_article (id, point_id, title, content_md, diagram_type, read_count)
                    VALUES (%s, %s, %s, %s, NULL, 0)
                    ON DUPLICATE KEY UPDATE title=VALUES(title), content_md=VALUES(content_md)""",
                    (article_key, point_key, title[:128], markdown),
                )

                chunk_rows.append(
                    (doc_id, index, markdown[:12000], max(len(markdown) // 2, 1), chapter_order)
                )
                points_count += 1

            if chunk_rows:
                cur.executemany(
                    """INSERT INTO kb_chunk (document_id, chunk_index, content, token_count, page_number)
                    VALUES (%s, %s, %s, %s, %s)""",
                    chunk_rows,
                )
                chunks_count += len(chunk_rows)
            print(f"  [ok] {SUBJECT_NAMES.get(code, code)}: {len(points)} 个知识点 / {len(chunk_rows)} 个切片")

    return points_count, chunks_count


def import_questions(conn) -> tuple[int, int]:
    rows = load_jsonl(KAOYAN_DATA / "question_bank.jsonl")
    if not rows:
        print("  [skip] question_bank.jsonl 不存在或为空")
        return 0, 0

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM exam_paper WHERE paper_type='AI_CUSTOM' AND year=%s LIMIT 1",
            (PRACTICE_YEAR,),
        )
        paper = cur.fetchone()
        if paper:
            paper_id = paper["id"]
        else:
            cur.execute(
                """INSERT INTO exam_paper (year, title, total_score, duration_minutes, question_count, paper_type, status)
                VALUES (%s, %s, 0, 0, 0, 'AI_CUSTOM', 1)""",
                (PRACTICE_YEAR, PRACTICE_TITLE),
            )
            paper_id = cur.lastrowid

        cur.execute("SELECT stem FROM exam_question")
        existing = {normalize_stem(row["stem"]) for row in cur.fetchall() if row.get("stem")}
        seen = set(existing)

        imported = 0
        skipped = 0
        total_score = 0
        question_number = 0
        for row in rows:
            stem = row.get("content") or ""
            norm = normalize_stem(stem)
            if not norm or norm in seen:
                skipped += 1
                continue
            seen.add(norm)

            code = subject_code(row.get("subject"))
            if not code:
                skipped += 1
                continue

            question_number += 1
            external_id = safe_id(f"ky_{row.get('id') or f'{code}_{question_number}'}")
            options = parse_options(row.get("options"))
            score = 2 if row.get("type") == "choice" else 10
            total_score += score
            difficulty = DIFFICULTY_MAP.get(str(row.get("difficulty") or ""), 3)
            tags = list(row.get("knowledge_points") or [])
            if row.get("subject"):
                tags.append(row["subject"])

            cur.execute(
                """INSERT INTO exam_question
                (id, paper_id, year, question_number, score, question_type, subject_code, chapter_name,
                 stem, options_json, answer, difficulty, tags_json, explanation, exam_point_analysis,
                 is_variant, parent_question_id)
                VALUES (%s, %s, %s, %s, %s, 'choice', %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, NULL)
                ON DUPLICATE KEY UPDATE
                 paper_id=VALUES(paper_id), year=VALUES(year), question_number=VALUES(question_number),
                 score=VALUES(score), question_type=VALUES(question_type), subject_code=VALUES(subject_code),
                 chapter_name=VALUES(chapter_name), stem=VALUES(stem), options_json=VALUES(options_json),
                 answer=VALUES(answer), difficulty=VALUES(difficulty), tags_json=VALUES(tags_json),
                 explanation=VALUES(explanation), exam_point_analysis=VALUES(exam_point_analysis)""",
                (
                    external_id,
                    paper_id,
                    PRACTICE_YEAR,
                    question_number,
                    score,
                    code,
                    (row.get("chapter") or "")[:128],
                    stem,
                    json.dumps(options, ensure_ascii=False) if options else None,
                    row.get("answer"),
                    difficulty,
                    json.dumps(tags, ensure_ascii=False),
                    row.get("explanation"),
                    row.get("knowledge_detail"),
                ),
            )
            imported += 1

        cur.execute(
            "UPDATE exam_paper SET title=%s, total_score=%s, duration_minutes=0, question_count=%s, status=1 WHERE id=%s",
            (PRACTICE_TITLE, total_score, imported, paper_id),
        )

    print(f"  [ok] 练习题: 导入 {imported} 道，跳过重复/无效 {skipped} 道")
    return imported, skipped


def main() -> None:
    print("=== 开始导入 kaoyan 数据到 MySQL ===")
    conn = pymysql.connect(**DB)
    try:
        points, chunks = import_knowledge(conn)
        questions, skipped = import_questions(conn)
        conn.commit()
        print(f"=== 完成：知识点 {points}，切片 {chunks}，练习题 {questions}，跳过 {skipped} ===")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()

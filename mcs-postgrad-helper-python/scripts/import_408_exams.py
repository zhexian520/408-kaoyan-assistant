#!/usr/bin/env python3
"""
408 统考历年真题导入脚本
读取 mcs-postgrad-helper-web/public/exams/{year}/paper.json 并入库 MySQL (mcs_postgrad_helper)
"""

import os
import json
import pymysql

DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '123456',
    'database': 'mcs_postgrad_helper',
    'charset': 'utf8mb4',
    'autocommit': True
}

def get_exams_dir():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
    return os.path.join(project_root, 'mcs-postgrad-helper-web', 'public', 'exams')

def import_all_exams():
    exams_dir = get_exams_dir()
    if not os.path.exists(exams_dir):
        raise FileNotFoundError(f"题库静态资源目录未找到: {exams_dir}")

    years = sorted([int(y) for y in os.listdir(exams_dir) if y.isdigit()])
    print(f"[*] 扫描到年份: {years}")

    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()

    total_papers = 0
    total_questions = 0
    total_subs = 0
    total_kb_links = 0

    for year in years:
        paper_path = os.path.join(exams_dir, str(year), 'paper.json')
        if not os.path.exists(paper_path):
            continue

        with open(paper_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        title = data.get('title') or f"{year}年全国硕士研究生招生考试408真题"
        questions = data.get('questions', [])
        q_count = len(questions)

        # 1. 插入或更新试卷记录
        cursor.execute("""
            INSERT INTO exam_paper (year, title, total_score, duration_minutes, question_count, paper_type, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE title=VALUES(title), question_count=VALUES(question_count)
        """, (year, title, 150, 180, q_count, 'TRUE_EXAM', 1))

        cursor.execute("SELECT id FROM exam_paper WHERE year=%s AND paper_type=%s", (year, 'TRUE_EXAM'))
        paper_id = cursor.fetchone()[0]
        total_papers += 1

        # 2. 插入题目
        for q in questions:
            qid = q.get('id') or f"exam-{year}-{q['number']}"
            q_num = q.get('number', 0)
            score = q.get('score', 2)
            q_type = q.get('questionType', 'choice')
            subject = q.get('subject', 'ds')
            chapter = q.get('chapterName', '')
            stem = q.get('stem', '')
            options_json = json.dumps(q.get('options', []), ensure_ascii=False)
            answer = q.get('answer', '')
            difficulty = q.get('difficulty', 3)
            tags_json = json.dumps(q.get('tags', []), ensure_ascii=False)
            explanation = q.get('explanation', '')
            resource_links_json = json.dumps(q.get('resourceLinks', []), ensure_ascii=False)

            cursor.execute("""
                INSERT INTO exam_question 
                (id, paper_id, year, question_number, score, question_type, subject_code, chapter_name, stem, options_json, answer, difficulty, tags_json, explanation, resource_links_json, is_variant)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0)
                ON DUPLICATE KEY UPDATE 
                    paper_id=VALUES(paper_id),
                    stem=VALUES(stem),
                    options_json=VALUES(options_json),
                    answer=VALUES(answer),
                    difficulty=VALUES(difficulty),
                    tags_json=VALUES(tags_json),
                    explanation=VALUES(explanation)
            """, (qid, paper_id, year, q_num, score, q_type, subject, chapter, stem, options_json, answer, difficulty, tags_json, explanation, resource_links_json))
            total_questions += 1

            # 3. 综合大题小问
            for sub in q.get('subQuestions', []):
                s_num = sub.get('number', 1)
                s_stem = sub.get('description', '')
                s_score = sub.get('score') or 0
                cursor.execute("""
                    INSERT INTO exam_question_sub (question_id, sub_number, sub_stem, score)
                    VALUES (%s, %s, %s, %s)
                """, (qid, s_num, s_stem, s_score))
                total_subs += 1

            # 4. 考点关联映射
            for kb in q.get('knowledgeBlockIds', []):
                cursor.execute("""
                    INSERT INTO exam_question_knowledge (question_id, knowledge_block_id)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE question_id=VALUES(question_id)
                """, (qid, kb))
                total_kb_links += 1

    cursor.close()
    conn.close()

    print(f"[✓] 408历年真题导入完成: 试卷 {total_papers} 套, 题目 {total_questions} 道, 大题小问 {total_subs} 个, 考点映射 {total_kb_links} 条。")

if __name__ == '__main__':
    import_all_exams()


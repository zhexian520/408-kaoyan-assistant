-- ==============================================================================
-- 408 计算机考研智能助手系统 - 核心数据库建表脚本
-- 适配版本: MySQL 8.0+
-- 字符集: utf8mb4 / utf8mb4_unicode_ci
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `mcs_postgrad_helper` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `mcs_postgrad_helper`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. 用户与认证体系 (User & Auth)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '用户主键ID',
    `username` VARCHAR(64) NOT NULL UNIQUE COMMENT '登录用户名',
    `password` VARCHAR(128) NOT NULL COMMENT '密码哈希值(BCrypt)',
    `nickname` VARCHAR(64) DEFAULT NULL COMMENT '用户昵称',
    `avatar` VARCHAR(512) DEFAULT NULL COMMENT '头像URL',
    `email` VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
    `phone` VARCHAR(32) DEFAULT NULL COMMENT '联系手机',
    `target_school` VARCHAR(128) DEFAULT NULL COMMENT '目标院校 (如: 浙江大学、北京大学)',
    `target_score` INT DEFAULT 120 COMMENT '408目标分数 (满分150)',
    `exam_year` INT DEFAULT 2026 COMMENT '考研年份',
    `prep_stage` VARCHAR(32) DEFAULT 'BASIC' COMMENT '当前备考阶段: BASIC(基础), INTENSIVE(强化), TRUE_EXAMS(真题), SPRINT(冲刺)',
    `status` TINYINT DEFAULT 1 COMMENT '状态: 1正常 0禁用',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户基础信息表';

DROP TABLE IF EXISTS `sys_role`;
CREATE TABLE `sys_role` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `role_code` VARCHAR(32) NOT NULL UNIQUE COMMENT '角色编码: ROLE_ADMIN, ROLE_USER',
    `role_name` VARCHAR(64) NOT NULL COMMENT '角色名称',
    `description` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统角色表';

DROP TABLE IF EXISTS `sys_user_role`;
CREATE TABLE `sys_user_role` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `role_id` BIGINT NOT NULL,
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
    INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- ------------------------------------------------------------------------------
-- 2. 408 考点体系与知识库目录 (408 Knowledge Tree & Taxonomy)
-- 与 408 统考大纲及开源题库结构深度对齐
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `k_subject`;
CREATE TABLE `k_subject` (
    `code` VARCHAR(16) PRIMARY KEY COMMENT '科目代号: ds(数据结构), co(计组), os(操作系统), cn(计网)',
    `name` VARCHAR(64) NOT NULL COMMENT '科目名称',
    `icon` VARCHAR(128) DEFAULT NULL COMMENT '图标或主题色',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '科目简介与考查重点'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='408四大科目表';

DROP TABLE IF EXISTS `k_chapter`;
CREATE TABLE `k_chapter` (
    `id` VARCHAR(64) PRIMARY KEY COMMENT '章节标识 (如: chapter-ds-1, 线性表)',
    `subject_code` VARCHAR(16) NOT NULL COMMENT '所属科目: ds, co, os, cn',
    `title` VARCHAR(128) NOT NULL COMMENT '章节标题',
    `chapter_number` INT DEFAULT 1 COMMENT '章序号',
    `layer` VARCHAR(64) DEFAULT NULL COMMENT '所属大类层级',
    `sort_order` INT DEFAULT 0 COMMENT '展示排序',
    INDEX `idx_subject` (`subject_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识体系-章节表';

DROP TABLE IF EXISTS `k_section`;
CREATE TABLE `k_section` (
    `id` VARCHAR(64) PRIMARY KEY COMMENT '小节标识 (如: section-ds-1-1)',
    `chapter_id` VARCHAR(64) NOT NULL COMMENT '所属章节ID',
    `title` VARCHAR(128) NOT NULL COMMENT '小节标题 (如: 顺序表与链表)',
    `summary` TEXT DEFAULT NULL COMMENT '小节概述',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    INDEX `idx_chapter` (`chapter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识体系-小节表';

DROP TABLE IF EXISTS `k_point`;
CREATE TABLE `k_point` (
    `id` VARCHAR(64) PRIMARY KEY COMMENT '知识块/考点ID (与题目关联的 knowledgeBlockId: kb-*)',
    `section_id` VARCHAR(64) NOT NULL COMMENT '所属小节ID',
    `title` VARCHAR(128) NOT NULL COMMENT '知识点标题 (如: 单链表的插入与删除)',
    `summary` TEXT DEFAULT NULL COMMENT '考点摘要',
    `importance` INT DEFAULT 3 COMMENT '考查重要度: 1-5星',
    `exam_frequency` INT DEFAULT 0 COMMENT '历年考查频次(历年真题命中数)',
    `tags_json` JSON DEFAULT NULL COMMENT '标签列表 (JSON字符串数组)',
    `sort_order` INT DEFAULT 0,
    INDEX `idx_section` (`section_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识体系-考点/知识块表';

DROP TABLE IF EXISTS `k_article`;
CREATE TABLE `k_article` (
    `id` VARCHAR(64) PRIMARY KEY COMMENT '文章标识',
    `point_id` VARCHAR(64) NOT NULL COMMENT '所属知识点ID',
    `title` VARCHAR(128) NOT NULL COMMENT '文章标题',
    `content_md` MEDIUMTEXT NOT NULL COMMENT '正文Markdown内容(支持LaTeX公式、SVG/Mermaid图表、C代码)',
    `meta_json` JSON DEFAULT NULL COMMENT '课程中心扩展元数据: 考纲/易错点/公式/真题/代码片段',
    `diagram_type` VARCHAR(32) DEFAULT NULL COMMENT '图表类型: FLOWCHART, SEQUENCE, ARCHITECTURE, TIMING',
    `read_count` INT DEFAULT 0 COMMENT '阅读量',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_point` (`point_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库精讲文章表';

-- ------------------------------------------------------------------------------
-- 3. RAG 智能知识库与多模态切片 (RAG & Knowledge Base)
-- 支持公共/私有知识库，支持PDF、图片、扫描版OCR、原理图提取与页面定位溯源
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `kb_document`;
CREATE TABLE `kb_document` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '文档ID',
    `user_id` BIGINT DEFAULT NULL COMMENT '上传用户ID(NULL代表公共知识库资料，非NULL为个人私有资料)',
    `title` VARCHAR(255) NOT NULL COMMENT '文档标题/文件名',
    `file_type` VARCHAR(32) NOT NULL COMMENT '文件类型: pdf, docx, txt, image, markdown',
    `file_url` VARCHAR(512) NOT NULL COMMENT '文件存储路径/OSS地址',
    `file_size` BIGINT DEFAULT 0 COMMENT '文件字节大小',
    `subject_code` VARCHAR(16) DEFAULT NULL COMMENT '对应科目(ds, co, os, cn)',
    `parse_status` VARCHAR(32) DEFAULT 'PENDING' COMMENT '解析状态: PENDING(待解析), PROCESSING(处理中), SUCCESS(解析成功), FAILED(失败)',
    `error_msg` TEXT DEFAULT NULL COMMENT '解析失败原因',
    `chunk_count` INT DEFAULT 0 COMMENT '切片数量',
    `is_public` TINYINT DEFAULT 1 COMMENT '是否公开: 1公共资料 0个人私有',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_doc` (`user_id`, `is_public`),
    INDEX `idx_subject_doc` (`subject_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='RAG知识库文档主表';

DROP TABLE IF EXISTS `kb_chunk`;
CREATE TABLE `kb_chunk` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '切片ID',
    `document_id` BIGINT NOT NULL COMMENT '关联文档ID',
    `chunk_index` INT NOT NULL COMMENT '切片序号',
    `content` MEDIUMTEXT NOT NULL COMMENT '切片文本内容',
    `token_count` INT DEFAULT 0 COMMENT 'Token估算长度',
    `page_number` INT DEFAULT NULL COMMENT 'PDF对应原始页码',
    `bbox_json` JSON DEFAULT NULL COMMENT '原始页面位置坐标 (用于前端高亮溯源)',
    `image_url` VARCHAR(512) DEFAULT NULL COMMENT '切片关联的原理图/图表URL',
    `vector_id` VARCHAR(64) DEFAULT NULL COMMENT '向量数据库中关联的ID (如Chroma/Milvus)',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_doc_chunk` (`document_id`, `chunk_index`),
    INDEX `idx_vector_id` (`vector_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='RAG文档切片及向量映射表';

-- ------------------------------------------------------------------------------
-- 4. 408 真题库与试卷体系 (408 True Exam Question Bank)
-- 支持2009-2026年408统考所有真题，单选(1-40)与综合题(41-47)，采分点规则，变式题
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `exam_paper`;
CREATE TABLE `exam_paper` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '试卷主键ID',
    `year` INT NOT NULL COMMENT '年份 (2009~2026)',
    `title` VARCHAR(128) NOT NULL COMMENT '试卷标题 (如: 2024年全国硕士研究生招生考试408真题)',
    `total_score` INT DEFAULT 150 COMMENT '总分 (408满分150)',
    `duration_minutes` INT DEFAULT 180 COMMENT '考试标准时长 (180分钟)',
    `question_count` INT DEFAULT 47 COMMENT '总题数 (单选40题+综合7题)',
    `paper_type` VARCHAR(32) DEFAULT 'TRUE_EXAM' COMMENT '试卷类型: TRUE_EXAM(历年真题), MOCK(全真模拟), AI_CUSTOM(智能生成)',
    `status` TINYINT DEFAULT 1 COMMENT '状态: 1启用 0禁用',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_year_type` (`year`, `paper_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='408试卷主表';

DROP TABLE IF EXISTS `exam_question`;
CREATE TABLE `exam_question` (
    `id` VARCHAR(64) PRIMARY KEY COMMENT '题目全局唯一ID (如: 2024-1, 2024-41)',
    `paper_id` BIGINT DEFAULT NULL COMMENT '所属试卷ID',
    `year` INT NOT NULL COMMENT '真题年份',
    `question_number` INT NOT NULL COMMENT '题号 (1~47)',
    `score` INT NOT NULL COMMENT '分值 (单选通常2分，大题8~15分)',
    `question_type` VARCHAR(32) NOT NULL COMMENT '题型: choice(单选题), comprehensive(综合应用大题), algorithm(算法设计)',
    `subject_code` VARCHAR(16) NOT NULL COMMENT '所属学科: ds, co, os, cn',
    `chapter_name` VARCHAR(128) DEFAULT NULL COMMENT '所属章节名',
    `stem` MEDIUMTEXT NOT NULL COMMENT '题干内容 (支持Markdown、LaTeX公式、代码块及插图)',
    `options_json` JSON DEFAULT NULL COMMENT '选择题选项列表 [{"key":"A","text":"..."}, ...]',
    `answer` TEXT DEFAULT NULL COMMENT '标准参考答案 (选择题如"D"，主观大题为标准参考答案或核心算法代码)',
    `difficulty` INT DEFAULT 3 COMMENT '难度等级 (1:简单 ~ 5:极难)',
    `tags_json` JSON DEFAULT NULL COMMENT '考查考点标签 ["数据结构", "图", "拓扑排序"]',
    `explanation` MEDIUMTEXT DEFAULT NULL COMMENT '详尽答案解析与考点精解',
    `exam_point_analysis` MEDIUMTEXT DEFAULT NULL COMMENT '命题意图、采分思路及易错陷阱',
    `resource_links_json` JSON DEFAULT NULL COMMENT '关联的课本参考与拓展文献链接',
    `is_variant` TINYINT DEFAULT 0 COMMENT '是否为AI变式题: 0真题原题 1变式演练题',
    `parent_question_id` VARCHAR(64) DEFAULT NULL COMMENT '若为变式题，对应所衍生的原真题ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_year_subject` (`year`, `subject_code`),
    INDEX `idx_subject_chapter` (`subject_code`, `chapter_name`),
    INDEX `idx_parent_question` (`parent_question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='408真题及题库主表';

DROP TABLE IF EXISTS `exam_question_sub`;
CREATE TABLE `exam_question_sub` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '子题主键ID',
    `question_id` VARCHAR(64) NOT NULL COMMENT '主试题ID (关联exam_question)',
    `sub_number` INT NOT NULL COMMENT '小问序号 (如第1问、第2问)',
    `sub_stem` TEXT NOT NULL COMMENT '小问要求与题干 (如: "(1) 给出算法的基本设计思想。（4 分）")',
    `score` INT NOT NULL COMMENT '该小问分值',
    `standard_answer` TEXT DEFAULT NULL COMMENT '小问参考答案与评分标准',
    `rubric_points_json` JSON DEFAULT NULL COMMENT '智能批改采分点规则列表 [{"point_id":1, "desc":"基本思想完整度", "score":4}, ...]',
    INDEX `idx_question_sub` (`question_id`, `sub_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='408大题小问及智能采分点配置表';

DROP TABLE IF EXISTS `exam_question_knowledge`;
CREATE TABLE `exam_question_knowledge` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `question_id` VARCHAR(64) NOT NULL COMMENT '题目ID',
    `knowledge_block_id` VARCHAR(64) NOT NULL COMMENT '考点/知识块ID (如 kb-ds-1-1)',
    UNIQUE KEY `uk_q_kb` (`question_id`, `knowledge_block_id`),
    INDEX `idx_kb` (`knowledge_block_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='试题与考点知识块关联映射表';

-- ------------------------------------------------------------------------------
-- 5. 模拟测评与主观题智能阅卷 (Exams, Self-Testing & AI Rubric Grading)
-- 记录用户作答、自动判分、主观题采分点比对、遗漏点诊断与优化建议
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `test_record`;
CREATE TABLE `test_record` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '测试记录ID',
    `user_id` BIGINT NOT NULL COMMENT '测评用户ID',
    `paper_id` BIGINT DEFAULT NULL COMMENT '试卷ID (可选)',
    `test_title` VARCHAR(128) NOT NULL COMMENT '测评标题 (如: 2024年408全真模考)',
    `test_type` VARCHAR(32) NOT NULL COMMENT '测评模式: FULL_MOCK(全真模拟), CHAPTER_DRILL(章节专练), WEAKNESS_PUSH(薄弱专项), AI_CUSTOM(智能组卷)',
    `subject_code` VARCHAR(16) DEFAULT NULL COMMENT '若为单科测试(ds,co,os,cn)，全科为NULL',
    `total_score` INT DEFAULT 150 COMMENT '满分值',
    `user_score` DECIMAL(5,2) DEFAULT NULL COMMENT '用户最终得分',
    `time_spent_seconds` INT DEFAULT 0 COMMENT '答题消耗时长(秒)',
    `status` VARCHAR(32) DEFAULT 'IN_PROGRESS' COMMENT '状态: IN_PROGRESS(作答中), SUBMITTED(判分中), GRADED(已批阅完成)',
    `start_time` DATETIME NOT NULL COMMENT '开始时间',
    `submit_time` DATETIME DEFAULT NULL COMMENT '交卷时间',
    `ai_report_summary` TEXT DEFAULT NULL COMMENT 'AI生成的整卷测评学情总结分析',
    `weak_points_json` JSON DEFAULT NULL COMMENT '本次测评暴露出的薄弱考点集合 (JSON数组)',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_test` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自测与模拟考试记录表';

DROP TABLE IF EXISTS `test_answer_detail`;
CREATE TABLE `test_answer_detail` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '答题明细ID',
    `test_record_id` BIGINT NOT NULL COMMENT '所属测试记录ID',
    `question_id` VARCHAR(64) NOT NULL COMMENT '试题ID',
    `sub_question_id` BIGINT DEFAULT NULL COMMENT '小问ID (若大题含小问)',
    `user_answer` MEDIUMTEXT DEFAULT NULL COMMENT '用户作答内容 (选择题为A/B/C/D，大题为文字/代码/拍照图片URL)',
    `is_correct` TINYINT DEFAULT NULL COMMENT '是否正确: 1正确 0错误 (针对客观选择题)',
    `score_earned` DECIMAL(5,2) DEFAULT 0.00 COMMENT '本题实得分',
    `ai_feedback` TEXT DEFAULT NULL COMMENT 'AI智能阅卷综合评语',
    `missing_points_json` JSON DEFAULT NULL COMMENT '答题中遗漏的核心考查要点 (JSON数组)',
    `error_analysis` TEXT DEFAULT NULL COMMENT '错误表述与概念混淆原因诊断',
    `rubric_matched_json` JSON DEFAULT NULL COMMENT '采分点命中详情 [{"rubric_id":1, "hit":true, "score":2, "reason":"正确描述拓扑排序流程"}, ...]',
    `optimization_advice` TEXT DEFAULT NULL COMMENT '解题规范与得分优化建议',
    `graded_by` VARCHAR(32) DEFAULT 'SYSTEM_AUTO' COMMENT '判分方式: SYSTEM_AUTO(系统自动对比), AI_AGENT(智能体采分点精批), MANUAL(人工复核)',
    `graded_at` DATETIME DEFAULT NULL COMMENT '批改完成时间',
    INDEX `idx_record_q` (`test_record_id`, `question_id`),
    INDEX `idx_q_correct` (`question_id`, `is_correct`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考生单题答题与采分点批改详情表';

-- ------------------------------------------------------------------------------
-- 5.1 日常作答流水 (Practice Attempts)
-- 练习模式、变式题、每日补给的作答都写入这里，用于个性化规划真实进度
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_question_attempt`;
CREATE TABLE `user_question_attempt` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `question_id` VARCHAR(64) NOT NULL COMMENT '题目ID',
    `subject_code` VARCHAR(16) DEFAULT NULL COMMENT '科目代码 DS/CO/OS/CN',
    `is_correct` TINYINT DEFAULT 0 COMMENT '是否答对',
    `user_answer` TEXT DEFAULT NULL COMMENT '用户答案',
    `source_type` VARCHAR(32) DEFAULT 'PRACTICE' COMMENT '来源: PRACTICE/VARIANT/DAILY_PUSH/AI_MIXED',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_uqa_user_time` (`user_id`, `created_at`),
    INDEX `idx_uqa_user_subject` (`user_id`, `subject_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户日常作答流水';

-- ------------------------------------------------------------------------------
-- 6. 错题本与试题收藏体系 (Mistakes Notebook & Favorites)
-- 包含自动收录、拍照上传录入、错误归因标签、复盘重做与考点追踪
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_wrong_question`;
CREATE TABLE `user_wrong_question` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '错题主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `question_id` VARCHAR(64) DEFAULT NULL COMMENT '关联真题/内置试题ID (为NULL时表示手动拍照录入)',
    `custom_question_json` JSON DEFAULT NULL COMMENT '手动拍照上传的题目数据 (含图片URL、OCR识别文本、手填答案与解析)',
    `subject_code` VARCHAR(16) NOT NULL COMMENT '科目代号 (ds, co, os, cn)',
    `knowledge_block_id` VARCHAR(64) DEFAULT NULL COMMENT '主要考点ID',
    `source_type` VARCHAR(32) DEFAULT 'TEST' COMMENT '来源: TEST(模拟模考), PRACTICE(专项练习), MANUAL_UPLOAD(手动拍照上传), AI_DIAG(Agent复习诊断)',
    `wrong_count` INT DEFAULT 1 COMMENT '累计做错次数',
    `master_status` VARCHAR(32) DEFAULT 'UNMASTERED' COMMENT '掌握状态: UNMASTERED(未掌握), REVIEWING(复习中), MASTERED(已攻克)',
    `error_reason_tag` VARCHAR(64) DEFAULT 'CONCEPT_CONFUSION' COMMENT '错误归因: CONCEPT_CONFUSION(概念混淆), CALCULATION_ERROR(计算失误), MEMORY_LAPSE(公式记忆模糊), CODE_BUG(算法逻辑缺陷), CARELESS(审题不清), OTHER(其他)',
    `user_notes` TEXT DEFAULT NULL COMMENT '考生错题自省与心得复盘笔记',
    `last_wrong_answer` TEXT DEFAULT NULL COMMENT '最近一次错误作答',
    `last_practiced_at` DATETIME DEFAULT NULL COMMENT '最后重做时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_user_wrong_sub` (`user_id`, `subject_code`, `master_status`),
    INDEX `idx_user_q` (`user_id`, `question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户错题本主表';

DROP TABLE IF EXISTS `user_question_favorite`;
CREATE TABLE `user_question_favorite` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `question_id` VARCHAR(64) NOT NULL COMMENT '试题ID',
    `tag` VARCHAR(64) DEFAULT '重点题' COMMENT '收藏标签: 重点题, 经典题, 压轴题, 易错题',
    `note` VARCHAR(255) DEFAULT NULL COMMENT '收藏备注',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_user_fav` (`user_id`, `question_id`),
    INDEX `idx_user_fav` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户真题收藏表';

-- ------------------------------------------------------------------------------
-- 7. AI 智能备考 Agent 与多模态问答 (AI Prep Agent & Multimodal QA)
-- 支持自然语言复习指令自动工作流、多模态图文解析、RAG资料精准溯源
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `agent_session`;
CREATE TABLE `agent_session` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '会话ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `session_type` VARCHAR(32) DEFAULT 'AGENT_FLOW' COMMENT '会话类型: AGENT_FLOW(复习闭环智能体), MULTIMODAL_QA(多模态图文答疑), VARIANT_GEN(真题变式题推演)',
    `title` VARCHAR(128) NOT NULL COMMENT '会话标题 (如: 操作系统虚存与缺页中断复习)',
    `current_stage` VARCHAR(32) DEFAULT 'INITIAL' COMMENT 'Agent当前流程阶段: INITIAL, KNOWLEDGE_EXPLAIN, PRACTICE_GEN, GRADING, TRUE_EXAM_DRILL, SUMMARY_REPORT, PAUSED, COMPLETED',
    `difficulty_level` VARCHAR(16) DEFAULT 'MEDIUM' COMMENT '设定难度: EASY, MEDIUM, HARD',
    `context_state_json` JSON DEFAULT NULL COMMENT 'Agent当前运行记忆、上下文与状态机持久化快照',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_user_session` (`user_id`, `session_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI备考Agent与问答会话表';

DROP TABLE IF EXISTS `agent_message`;
CREATE TABLE `agent_message` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '消息ID',
    `session_id` BIGINT NOT NULL COMMENT '所属会话ID',
    `role` VARCHAR(16) NOT NULL COMMENT '角色: user, assistant, system, tool',
    `content` MEDIUMTEXT NOT NULL COMMENT '消息文本内容 (支持Markdown与LaTeX公式)',
    `image_urls_json` JSON DEFAULT NULL COMMENT '多模态上传的图片URL列表 (真题截图、课本插图、手写草稿)',
    `citations_json` JSON DEFAULT NULL COMMENT 'RAG检索溯源片段 [{"doc_id":1, "doc_title":"...", "page":24, "bbox":[], "snippet":"..."}]',
    `tool_calls_json` JSON DEFAULT NULL COMMENT 'Agent工具调用轨迹与入参出参数据',
    `tokens_used` INT DEFAULT 0 COMMENT '消耗Token数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_session_msg` (`session_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI会话对话记录明细表';

DROP TABLE IF EXISTS `agent_task_execution`;
CREATE TABLE `agent_task_execution` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '任务执行记录ID',
    `session_id` BIGINT NOT NULL COMMENT '关联会话ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `instruction` TEXT NOT NULL COMMENT '用户发起的自然语言复习指令 (如: "今天帮我复习计网TCP滑动窗口和拥塞控制，并生成自测")',
    `target_subject` VARCHAR(16) NOT NULL COMMENT '目标学科: ds, co, os, cn',
    `target_knowledge_id` VARCHAR(64) DEFAULT NULL COMMENT '目标知识点ID',
    `status` VARCHAR(32) DEFAULT 'RUNNING' COMMENT '状态: PENDING(等待), RUNNING(运行中), PAUSED(暂停), COMPLETED(已完成), FAILED(失败)',
    `generated_questions_json` JSON DEFAULT NULL COMMENT '本次任务AI生成的专项练习题目ID列表',
    `drill_exam_ids_json` JSON DEFAULT NULL COMMENT '本次任务自动调取的历年相关真题ID列表',
    `report_content` MEDIUMTEXT DEFAULT NULL COMMENT '任务完结后生成的全流程复习总结报告',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_user_task` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent智能备考任务自动化调度执行表';

-- ------------------------------------------------------------------------------
-- 8. 个人学情数据与薄弱点知识图谱 (Learning Analytics & Weakness Graph)
-- 包含掌握度评级、考点掌握度加权分析、考查热力图数据与每日学习统计
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_knowledge_mastery`;
CREATE TABLE `user_knowledge_mastery` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `knowledge_block_id` VARCHAR(64) NOT NULL COMMENT '考点知识块ID (kb-*)',
    `subject_code` VARCHAR(16) NOT NULL COMMENT '所属学科: ds, co, os, cn',
    `total_attempts` INT DEFAULT 0 COMMENT '做题总次数',
    `correct_attempts` INT DEFAULT 0 COMMENT '做对总次数',
    `accuracy_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '正确率 (百分比 0.00% ~ 100.00%)',
    `mastery_level` VARCHAR(32) DEFAULT 'UNLEARNED' COMMENT '掌握等级: UNLEARNED(未学), WEAK(薄弱), FAMILIAR(熟悉), MASTERED(精通)',
    `weakness_score` DECIMAL(5,2) DEFAULT 0.00 COMMENT '薄弱度综合加权得分 (用于热力图与推荐推送加权)',
    `last_practiced_at` DATETIME DEFAULT NULL COMMENT '最后练习时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_user_kb` (`user_id`, `knowledge_block_id`),
    INDEX `idx_user_mastery` (`user_id`, `subject_code`, `mastery_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户408考点掌握度画像与薄弱点图谱表';

DROP TABLE IF EXISTS `user_study_stats_daily`;
CREATE TABLE `user_study_stats_daily` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `stat_date` DATE NOT NULL COMMENT '统计日期 (YYYY-MM-DD)',
    `study_minutes` INT DEFAULT 0 COMMENT '当日累计学习时长(分钟)',
    `questions_attempted` INT DEFAULT 0 COMMENT '当日做题数',
    `questions_correct` INT DEFAULT 0 COMMENT '当日做对数',
    `mock_count` INT DEFAULT 0 COMMENT '当日参与模考自测场次',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_user_date` (`user_id`, `stat_date`),
    INDEX `idx_user_stat` (`user_id`, `stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户每日学习行为统计表';

-- ------------------------------------------------------------------------------
-- 9. 个性化备考规划与个人笔记 (Study Planning & Notes)
-- 四阶段周期规划、周计划任务拆解、薄弱点动态适配更新、富文本笔记与一键摘录
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_study_plan`;
CREATE TABLE `user_study_plan` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '计划主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `plan_name` VARCHAR(128) NOT NULL COMMENT '规划名称 (如: 408高效六个月高分突破计划)',
    `prep_duration_months` INT DEFAULT 6 COMMENT '备考总周期(月)',
    `base_level` VARCHAR(32) DEFAULT 'ZERO' COMMENT '基础水平: ZERO(跨考零基础), AVERAGE(计算机科班基稳), ADVANCED(二战冲高分)',
    `target_score` INT DEFAULT 120 COMMENT '目标分数',
    `current_stage` VARCHAR(32) DEFAULT 'BASIC' COMMENT '当前阶段: BASIC(基础阶段), INTENSIVE(强化阶段), TRUE_EXAMS(真题实战), SPRINT(终极冲刺)',
    `start_date` DATE NOT NULL COMMENT '计划起始日期',
    `exam_date` DATE NOT NULL COMMENT '考研日期 (一般12月下旬)',
    `daily_target_hours` DECIMAL(3,1) DEFAULT 4.0 COMMENT '每日目标备考小时数',
    `is_active` TINYINT DEFAULT 1 COMMENT '是否为当前生效计划: 1是 0否',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_user_active_plan` (`user_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='个性化备考总规划表';

DROP TABLE IF EXISTS `user_study_plan_task`;
CREATE TABLE `user_study_plan_task` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '任务项ID',
    `plan_id` BIGINT NOT NULL COMMENT '所属计划ID',
    `week_number` INT NOT NULL COMMENT '第几周 (1~30)',
    `stage` VARCHAR(32) NOT NULL COMMENT '所属备考阶段: BASIC, INTENSIVE, TRUE_EXAMS, SPRINT',
    `subject_code` VARCHAR(16) NOT NULL COMMENT '科目: ds, co, os, cn',
    `title` VARCHAR(255) NOT NULL COMMENT '周任务标题 (如: 完成数据结构树与二叉树精讲及30道精选真题)',
    `task_type` VARCHAR(32) NOT NULL COMMENT '任务类型: KNOWLEDGE(知识精讲), DRILL(配套练习), MOCK(全真模拟), WEAKNESS(薄弱攻坚)',
    `target_chapter_id` VARCHAR(64) DEFAULT NULL COMMENT '目标章节ID',
    `is_completed` TINYINT DEFAULT 0 COMMENT '是否完成: 1完成 0待办',
    `completed_at` DATETIME DEFAULT NULL COMMENT '完成时间',
    `description` TEXT DEFAULT NULL COMMENT '任务说明与生成依据',
    `target_route` VARCHAR(255) DEFAULT NULL COMMENT '站内完成入口',
    `target_count` INT DEFAULT 0 COMMENT '目标数量',
    `progress_current` INT DEFAULT 0 COMMENT '当前完成数量',
    `progress_unit` VARCHAR(16) DEFAULT '题' COMMENT '进度单位',
    `auto_rule` VARCHAR(64) DEFAULT NULL COMMENT '自动统计规则',
    `baseline_value` INT DEFAULT 0 COMMENT '生成时的基线值',
    `due_date` DATE DEFAULT NULL COMMENT '建议完成日期',
    `priority` INT DEFAULT 3 COMMENT '优先级 1-5',
    `is_auto` TINYINT DEFAULT 1 COMMENT '1自动统计 0手动打卡',
    `last_synced_at` DATETIME DEFAULT NULL COMMENT '最近同步时间',
    INDEX `idx_plan_week` (`plan_id`, `week_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='备考周任务拆解明细表';

DROP TABLE IF EXISTS `user_note`;
CREATE TABLE `user_note` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '笔记主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `title` VARCHAR(128) NOT NULL COMMENT '笔记标题',
    `subject_code` VARCHAR(16) NOT NULL COMMENT '科目代号: ds, co, os, cn',
    `content_md` MEDIUMTEXT NOT NULL COMMENT '富文本笔记Markdown正文 (支持公式、流程图、插图)',
    `tags_json` JSON DEFAULT NULL COMMENT '笔记分类标签列表 (JSON数组)',
    `related_knowledge_id` VARCHAR(64) DEFAULT NULL COMMENT '关联的知识块ID',
    `related_question_id` VARCHAR(64) DEFAULT NULL COMMENT '关联的真题ID (若为做题心得)',
    `excerpt_source` VARCHAR(255) DEFAULT NULL COMMENT '来源摘录出处 (如: 2024年408真题第41题答案解析)',
    `is_ai_summarized` TINYINT DEFAULT 0 COMMENT '是否经过AI精简浓缩: 1是 0否',
    `ai_summary` TEXT DEFAULT NULL COMMENT 'AI生成的考前核心速记摘要',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_user_note_sub` (`user_id`, `subject_code`),
    INDEX `idx_note_kb` (`related_knowledge_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考生个人笔记与知识摘录表';

-- ------------------------------------------------------------------------------
-- 10. AI 大模型运行时配置
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_ai_config`;
CREATE TABLE `sys_ai_config` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `provider` VARCHAR(32) DEFAULT 'DEEPSEEK',
    `api_key` VARCHAR(512) DEFAULT NULL,
    `base_url` VARCHAR(512) DEFAULT 'https://api.deepseek.com/v1',
    `text_model` VARCHAR(128) DEFAULT 'deepseek-chat',
    `vl_model` VARCHAR(128) DEFAULT 'qwen-vl-max',
    `temperature` DECIMAL(3,2) DEFAULT 0.30,
    `max_tokens` INT DEFAULT 2048,
    `is_active` TINYINT DEFAULT 1,
    `system_prompt` TEXT DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 大模型运行时配置';

-- ------------------------------------------------------------------------------
-- 11. 基础初始数据配置 (科目、初始角色、管理员账号)
-- ------------------------------------------------------------------------------
INSERT INTO `sys_role` (`id`, `role_code`, `role_name`, `description`) VALUES
(1, 'ROLE_ADMIN', '系统管理员', '拥有系统管理、题目管理、公共资料维护权限'),
(2, 'ROLE_USER', '考研学生', '拥有刷题自测、AI问答、错题本与个人画像使用权限')
ON DUPLICATE KEY UPDATE `role_name` = VALUES(`role_name`);

INSERT INTO `k_subject` (`code`, `name`, `icon`, `sort_order`, `description`) VALUES
('ds', '数据结构', 'CodeBracketIcon', 1, '线性表、树与二叉树、图、查找、排序及算法设计'),
('co', '计算机组成原理', 'CpuChipIcon', 2, '数据的表示与运算、存储系统、指令系统、CPU、总线与I/O'),
('os', '操作系统', 'CommandLineIcon', 3, '操作系统概述、进程与线程、内存管理、文件管理、I/O管理'),
('cn', '计算机网络', 'GlobeAltIcon', 4, '体系结构、物理层、数据链路层、网络层、传输层、应用层')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

SET FOREIGN_KEY_CHECKS = 1;


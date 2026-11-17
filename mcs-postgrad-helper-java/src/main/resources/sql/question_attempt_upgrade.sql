-- 日常练习/变式题/每日补给作答流水，用于个性化规划真实进度
CREATE TABLE IF NOT EXISTS user_question_attempt (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    question_id VARCHAR(64) NOT NULL,
    subject_code VARCHAR(16) DEFAULT NULL,
    is_correct TINYINT DEFAULT 0,
    user_answer TEXT DEFAULT NULL,
    source_type VARCHAR(32) DEFAULT 'PRACTICE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_uqa_user_time (user_id, created_at),
    INDEX idx_uqa_user_subject (user_id, subject_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户日常作答流水';

-- 个性化备考规划升级：任务支持自动进度同步、站内跳转与活动规则
ALTER TABLE user_study_plan_task
    ADD COLUMN description TEXT NULL COMMENT '任务说明与生成依据',
    ADD COLUMN target_route VARCHAR(255) NULL COMMENT '站内完成入口',
    ADD COLUMN target_count INT DEFAULT 0 COMMENT '目标数量',
    ADD COLUMN progress_current INT DEFAULT 0 COMMENT '当前完成数量',
    ADD COLUMN progress_unit VARCHAR(16) DEFAULT '题' COMMENT '进度单位',
    ADD COLUMN auto_rule VARCHAR(64) NULL COMMENT '自动统计规则',
    ADD COLUMN baseline_value INT DEFAULT 0 COMMENT '生成时的基线值',
    ADD COLUMN due_date DATE NULL COMMENT '建议完成日期',
    ADD COLUMN priority INT DEFAULT 3 COMMENT '优先级 1-5',
    ADD COLUMN is_auto TINYINT DEFAULT 1 COMMENT '1自动统计 0手动打卡',
    ADD COLUMN last_synced_at DATETIME NULL COMMENT '最近同步时间';

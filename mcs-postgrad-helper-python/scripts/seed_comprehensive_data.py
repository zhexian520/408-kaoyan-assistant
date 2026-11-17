import pymysql

conn = pymysql.connect(
    host='127.0.0.1',
    port=3306,
    user='root',
    password='123456',
    database='mcs_postgrad_helper',
    charset='utf8mb4'
)
cursor = conn.cursor()

# 1. Update k_subject
cursor.execute('DELETE FROM k_point')
cursor.execute('DELETE FROM k_section')
cursor.execute('DELETE FROM k_chapter')
cursor.execute('DELETE FROM k_subject')

subjects = [
    ('DS', '数据结构', 'Code2', 1, '408统考核心学科，占比45分。涵盖线性表、树与二叉树、图论算法、查找与高级树、排序时空复杂度。'),
    ('CO', '计算机组成原理', 'Cpu', 2, '408统考核心学科，占比45分。涵盖机器数表示与浮点运算、Cache-主存组相联映射、CPU数据通路与指令流水线、中断与DMA。'),
    ('OS', '操作系统', 'Layers', 3, '408统考核心学科，占比35分。涵盖系统调用双核态、进程线程状态、信号量PV同步、请求分页虚存管理、文件系统与磁盘调度。'),
    ('NET', '计算机网络', 'Globe2', 4, '408统考核心学科，占比25分。涵盖体系结构与时延、滑动窗口与CSMA/CD、CIDR子网划分与路由协议、TCP握手挥手与拥塞控制。')
]
cursor.executemany('INSERT INTO k_subject (code, name, icon, sort_order, description) VALUES (%s, %s, %s, %s, %s)', subjects)

# 2. Seed Chapters
chapters = [
    ('ds_ch1', 'DS', '第1章 绪论与算法复杂度分析', 1, '基础层', 1),
    ('ds_ch2', 'DS', '第2章 线性表', 2, '数据组织层', 2),
    ('ds_ch3', 'DS', '第3章 栈、队列与数组', 3, '限定操作层', 3),
    ('ds_ch4', 'DS', '第4章 串与KMP算法', 4, '模式匹配层', 4),
    ('ds_ch5', 'DS', '第5章 树与二叉树', 5, '层次结构层', 5),
    ('ds_ch6', 'DS', '第6章 图论与算法', 6, '网状结构层', 6),
    ('ds_ch7', 'DS', '第7章 查找与高级查找树', 7, '高效检索层', 7),
    ('ds_ch8', 'DS', '第8章 内外部排序算法', 8, '数据整理层', 8),
    
    ('co_ch1', 'CO', '第1章 计算机系统概述', 1, '系统概览', 1),
    ('co_ch2', 'CO', '第2章 数据的表示和运算', 2, '运算层', 2),
    ('co_ch3', 'CO', '第3章 存储系统与层次结构', 3, '存储层', 3),
    ('co_ch4', 'CO', '第4章 指令系统', 4, '指令层', 4),
    ('co_ch5', 'CO', '第5章 中央处理器CPU', 5, '控制核心', 5),
    ('co_ch6', 'CO', '第6章 总线系统', 6, '互连层', 6),
    ('co_ch7', 'CO', '第7章 输入/输出系统', 7, '交互层', 7),

    ('os_ch1', 'OS', '第1章 操作系统概述', 1, '内核层', 1),
    ('os_ch2', 'OS', '第2章 进程与线程管理', 2, '执行层', 2),
    ('os_ch3', 'OS', '第3章 内存管理与虚存技术', 3, '空间管理层', 3),
    ('os_ch4', 'OS', '第4章 文件系统管理', 4, '存储管理层', 4),
    ('os_ch5', 'OS', '第5章 I/O与设备管理', 5, '硬件驱动层', 5),

    ('net_ch1', 'NET', '第1章 计算机网络体系结构', 1, '协议栈', 1),
    ('net_ch2', 'NET', '第2章 物理层传输基础', 2, '信号层', 2),
    ('net_ch3', 'NET', '第3章 数据链路层', 3, '介质访问层', 3),
    ('net_ch4', 'NET', '第4章 网络层与路由算法', 4, '路由交换层', 4),
    ('net_ch5', 'NET', '第5章 传输层协议', 5, '端到端层', 5),
    ('net_ch6', 'NET', '第6章 应用层核心协议', 6, '应用服务层', 6)
]
cursor.executemany('INSERT INTO k_chapter (id, subject_code, title, chapter_number, layer, sort_order) VALUES (%s, %s, %s, %s, %s, %s)', chapters)

# 2.5 Seed Sections
sections = [
    ('sec_ds_01', 'ds_ch5', '5.1 树与二叉树基本性质', '二叉树结构、满二叉树与完全二叉树', 1),
    ('sec_ds_02', 'ds_ch5', '5.2 二叉树遍历与线索化', '先序中序后序与线索化', 2),
    ('sec_ds_03', 'ds_ch5', '5.3 树、森林与哈夫曼树', '树与二叉树转换、哈夫曼树与WPL', 3),
    ('sec_ds_04', 'ds_ch6', '6.1 图的遍历与连通性', 'BFS与DFS算法', 1),
    ('sec_ds_05', 'ds_ch6', '6.2 经典图论算法应用', '最小生成树与最短路径', 2),
    ('sec_ds_06', 'ds_ch7', '7.1 树形查找表', 'BST二叉排序树与AVL平衡二叉树', 1),
    ('sec_ds_07', 'ds_ch8', '8.1 交换与选择排序', '快速排序与堆排序', 1),

    ('sec_co_01', 'co_ch2', '2.1 定点与浮点数运算', 'IEEE 754单精度浮点数标准', 1),
    ('sec_co_02', 'co_ch3', '3.1 高速缓冲存储器Cache', 'Cache-主存组相联映射及缺失率', 1),
    ('sec_co_03', 'co_ch5', '5.1 指令流水线设计', '流水线冒险与吞吐率优化', 1),
    ('sec_co_04', 'co_ch7', '7.1 中断与DMA机制', '中断屏蔽字与DMA传输', 1),

    ('sec_os_01', 'os_ch2', '2.1 进程同步与互斥', '经典PV操作与信号量机制', 1),
    ('sec_os_02', 'os_ch3', '3.1 请求分页虚存管理', '地址变换、TLB快表与置换算法', 1),
    ('sec_os_03', 'os_ch4', '4.1 文件逻辑与物理组织', 'inode索引节点与最大文件尺寸', 1),

    ('sec_net_01', 'net_ch4', '4.1 IPv4与路由转发', 'CIDR子网划分与路由汇聚', 1),
    ('sec_net_02', 'net_ch5', '5.1 TCP传输控制协议', '三次握手、四次挥手与拥塞控制', 1)
]
cursor.executemany('INSERT INTO k_section (id, chapter_id, title, summary, sort_order) VALUES (%s, %s, %s, %s, %s)', sections)

# 3. Seed Knowledge Points
k_points = [
    ('kp_ds_01', 'sec_ds_03', '哈夫曼树与带权路径长度(WPL)', '哈夫曼树构造步骤、前缀编码无二义性、WPL公式计算与真题典型应用。', 5, 18, '["哈夫曼树", "WPL", "贪心"]', 1),
    ('kp_ds_02', 'sec_ds_02', '二叉树的先中后序及层序遍历', '递归与非递归遍历、由遍历序列构造唯一二叉树、线索二叉树空指针利用。', 5, 22, '["二叉树", "遍历", "递归"]', 2),
    ('kp_ds_03', 'sec_ds_05', '最短路径Dijkstra与Floyd算法', '单源最短路径贪心策略、全源动态规划矩阵更新、负权边适用性分析。', 4, 15, '["图论", "最短路径", "动态规划"]', 3),
    ('kp_ds_04', 'sec_ds_06', '平衡二叉树(AVL)与平衡调整', 'LL/RR/LR/RL单双旋转规则、调整后子树高度不变性、最大最小节点数递推。', 5, 16, '["AVL", "平衡调整", "树"]', 4),
    ('kp_ds_05', 'sec_ds_07', '快速排序划分与稳定性剖析', '双指针Partition划分过程、最坏最好时间复杂度判定、递归树深度与空间复杂度。', 5, 24, '["快速排序", "分治", "时间复杂度"]', 5),

    ('kp_co_01', 'sec_co_01', 'IEEE 754单精度浮点数表示与转换', '数符S(1位)、阶码E(8位移码偏置127)、尾数M(23位隐藏前导1)、规格化数与非规格化数。', 5, 20, '["IEEE 754", "浮点数", "阶码"]', 1),
    ('kp_co_02', 'sec_co_02', 'Cache-主存组相联映射及地址格式划分', '主存地址划分Tag、Set Index、Block Offset，比较器数量与容量计算。', 5, 26, '["Cache", "组相联", "主存地址"]', 2),
    ('kp_co_03', 'sec_co_03', '指令流水线冒险分析与解决策略', '结构冒险资源冲突、数据冒险RAW相关与旁路转发Forwarding、控制冒险分支预测。', 5, 19, '["流水线", "数据冒险", "转发"]', 3),
    ('kp_co_04', 'sec_co_04', '程序中断处理全流程与屏蔽字设置', '中断响应周期关中断保存PC、中断服务程序保护现场、多重中断嵌套与屏蔽字修改。', 4, 14, '["中断", "屏蔽字", "I/O"]', 4),

    ('kp_os_01', 'sec_os_01', '经典进程同步PV操作与信号量机制', '生产者-消费者问题、读者-写者问题、哲学家进餐问题、信号量初值与互斥死锁防范。', 5, 25, '["PV操作", "信号量", "进程同步"]', 1),
    ('kp_os_02', 'sec_os_02', '多级分页系统虚实地址变换与TLB快表', '虚地址拆分页号与页内偏移、TLB并行查找与命中时延、Page Fault缺页中断处理。', 5, 23, '["分页存储", "TLB快表", "虚拟内存"]', 2),
    ('kp_os_03', 'sec_os_02', '页面置换算法FIFO/LRU/CLOCK对比', 'Belady异常原因、栈式算法LRU硬件支持、简单Clock与改进型Clock访问位修改位判定。', 4, 17, '["页面置换", "LRU", "CLOCK"]', 3),
    ('kp_os_04', 'sec_os_03', '混合索引inode节点最大文件长度计算', '直接块地址、一级间接块、二级间接块、三级间接块支持的最大文件容量计算。', 5, 16, '["inode", "混合索引", "文件系统"]', 4),

    ('kp_net_01', 'sec_net_01', 'CIDR子网划分与最长前缀匹配路由', '斜线记法掩码转换、子网网络号与广播地址计算、路由表最长匹配原则。', 5, 22, '["CIDR", "子网划分", "路由匹配"]', 1),
    ('kp_net_02', 'sec_net_02', 'TCP三次握手与四次挥手状态变迁', 'SYN/ACK序号确认号同步、TIME_WAIT状态2MSL等待原因、SYN Flood攻击与防御。', 5, 28, '["TCP", "三次握手", "四次挥手"]', 2),
    ('kp_net_03', 'sec_net_02', 'TCP拥塞控制四阶段门限动态演进', '慢开始指数增长、拥塞避免加法增大、快重传收3个冗余ACK、快恢复门限减半调整。', 5, 26, '["拥塞控制", "慢开始", "拥塞避免"]', 3)
]
cursor.executemany('INSERT INTO k_point (id, section_id, title, summary, importance, exam_frequency, tags_json, sort_order) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)', k_points)

# 4. Seed sample public KB documents & chunks with page number & bbox
cursor.execute('DELETE FROM kb_chunk')
cursor.execute('DELETE FROM kb_document')

docs = [
    (1, None, '408 计算机学科专业基础综合权威大纲知识要点全析', 'pdf', '/docs/408_syllabus_2026.pdf', 1584020, 'DS', 'SUCCESS', None, 4, 1),
    (2, None, '数据结构高频考点讲义与核心算法C语言实现', 'pdf', '/docs/ds_algorithm_core.pdf', 2410290, 'DS', 'SUCCESS', None, 3, 1),
    (3, None, '计算机组成原理系统层次与Cache主存映射专项解析', 'pdf', '/docs/co_cache_system.pdf', 3120400, 'CO', 'SUCCESS', None, 3, 1),
    (4, None, '现代操作系统虚拟内存管理与进程同步经典题库', 'pdf', '/docs/os_virtual_memory.pdf', 2890110, 'OS', 'SUCCESS', None, 3, 1),
    (5, None, '计算机网络分层架构与TCP拥塞控制深度剖析', 'pdf', '/docs/net_tcp_congestion.pdf', 1980320, 'NET', 'SUCCESS', None, 3, 1)
]
cursor.executemany('INSERT INTO kb_document (id, user_id, title, file_type, file_url, file_size, subject_code, parse_status, error_msg, chunk_count, is_public) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)', docs)

chunks = [
    (1, 1, 1, '【408考纲核心】树与二叉树是数据结构命题的重中之重。二叉树的带权路径长度(WPL)计算公式为 WPL = ∑(w_i * l_i)，其中w_i为叶子节点的权值，l_i为根节点到该叶子节点的路径长度。哈夫曼树是WPL达到极小的最优二叉树。哈夫曼树中没有度为1的节点，若有n个叶子节点，则总节点数为 2n - 1。', 128, 12, '{"x": 45, "y": 110, "width": 520, "height": 95}', None, 'vec_ds_01'),
    (2, 1, 2, '【Cache组相联映射】若主存容量为4GB，按字节编址，Cache容量为64KB，每个Cache行（块）大小为64B，采用4路组相联映射。则主存地址共32位：块内地址 = log2(64) = 6位；Cache总行数 = 64KB/64B = 1024行；Cache组数 = 1024 / 4 = 256组，组地址占 log2(256) = 8位；主存Tag标记占 32 - 8 - 6 = 18位。', 156, 38, '{"x": 50, "y": 220, "width": 510, "height": 120}', None, 'vec_co_01'),
    (3, 1, 3, '【请求分页存储与TLB变换】虚拟地址由虚页号VPN和页内偏移VPO组成。CPU给出虚拟地址后，TLB与Page Table协同工作：首先将VPN送入TLB快表进行硬件并行相联查找。若TLB命中，则在1个时钟周期内直接得到物理页号PPN，与VPO拼接生成物理地址；若TLB未命中，则访问主存中的多级页表，若页表项Valid位为0则触发缺页异常中断。', 165, 64, '{"x": 40, "y": 180, "width": 530, "height": 110}', None, 'vec_os_01'),
    (4, 1, 4, '【TCP拥塞控制四阶段】TCP拥塞控制包含：慢开始(Slow Start)、拥塞避免(Congestion Avoidance)、快重传(Fast Retransmit)与快恢复(Fast Recovery)。在连接刚建立时，cwnd=1 MSS。慢开始阶段cwnd每经过一个RTT指数翻倍，直到达到慢开始门限ssthresh后转为拥塞避免，线性加1。若收到3个冗余ACK，立即执行快重传并进入快恢复：ssthresh = cwnd / 2, cwnd = ssthresh + 3 MSS。', 188, 89, '{"x": 48, "y": 90, "width": 515, "height": 130}', None, 'vec_net_01'),
    (5, 2, 1, '【快速排序时间复杂度分析】快速排序基于分治思想。最坏情况发生在每次选择的基准元素（Pivot）都是当前序列中的最大或最小值，导致划分极不均匀，递归深度达到 O(n)，总时间复杂度为 O(n^2)。最好情况每次划分均平分序列，时间复杂度为 O(n log n)。快速排序是不稳定的排序算法。', 142, 15, '{"x": 42, "y": 150, "width": 520, "height": 90}', None, 'vec_ds_02')
]
cursor.executemany('INSERT INTO kb_chunk (id, document_id, chunk_index, content, token_count, page_number, bbox_json, image_url, vector_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)', chunks)

# 5. Seed user study plan
cursor.execute('DELETE FROM user_study_plan_task')
cursor.execute('DELETE FROM user_study_plan')
cursor.execute('''
INSERT INTO user_study_plan 
(id, user_id, plan_name, prep_duration_months, base_level, target_score, current_stage, start_date, exam_date, daily_target_hours, is_active)
VALUES 
(1, 2, '2026届 408 统考冲刺 125分 全流程智能备考规划', 6, 'MEDIUM', 125, 'SPRINT', '2026-07-01', '2026-12-21', 4.5, 1)
''')

plan_tasks = [
    (1, 1, 1, 'BASIC', 'DS', '数据结构：线性表、链表及真题代码编写攻坚', 'CHAPTER_STUDY', 'ds_ch2', 1, '2026-07-07 18:00:00'),
    (2, 1, 2, 'BASIC', 'DS', '树与二叉树：遍历序列、线索二叉树与哈夫曼WPL', 'CHAPTER_STUDY', 'ds_ch5', 1, '2026-07-14 18:00:00'),
    (3, 1, 3, 'BASIC', 'CO', '计算机组成：浮点数IEEE 754与Cache组相联映射', 'CHAPTER_STUDY', 'co_ch3', 1, '2026-07-21 18:00:00'),
    (4, 1, 4, 'BASIC', 'OS', '操作系统：PV信号量同步互斥与虚存分页置换', 'CHAPTER_STUDY', 'os_ch2', 1, '2026-07-28 18:00:00'),
    (5, 1, 5, 'BASIC', 'NET', '计算机网络：CIDR子网划分与TCP拥塞控制状态机', 'CHAPTER_STUDY', 'net_ch5', 1, '2026-08-05 18:00:00'),
    (6, 1, 6, 'ENHANCE', 'DS', '强化阶段：图论最小生成树、拓扑排序与关键路径综合题', 'EXAM_DRILL', 'ds_ch6', 1, '2026-08-15 18:00:00'),
    (7, 1, 7, 'ENHANCE', 'CO', '强化阶段：CPU单多周期数据通路与指令流水线冒险大题', 'EXAM_DRILL', 'co_ch5', 0, None),
    (8, 1, 8, 'TRUE_EXAM', 'ALL', '历年真题阶段：2015-2020 年 408 统考全真限时模考', 'FULL_MOCK', None, 0, None),
    (9, 1, 9, 'SPRINT', 'ALL', '冲刺阶段：2021-2026 年近5年真题二刷与AI采分点评卷复盘', 'SPRINT_REVIEW', None, 0, None)
]
cursor.executemany('INSERT INTO user_study_plan_task (id, plan_id, week_number, stage, subject_code, title, task_type, target_chapter_id, is_completed, completed_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)', plan_tasks)

# 6. Seed sample notes
cursor.execute('DELETE FROM user_note')
notes = [
    (1, 2, '【数据结构】哈夫曼树WPL求解公式与二叉树构造模板', 'DS', '''# 哈夫曼树核心考点总结

## 1. 带权路径长度 (WPL) 公式
$$WPL = \\sum_{i=1}^{n} w_i \\times l_i$$

## 2. 关键性质
- 哈夫曼树没有度为 $1$ 的节点（只有度为 $0$ 的叶子节点和度为 $2$ 的分支节点）；
- 包含 $n$ 个叶子节点的哈夫曼树，总结点数为 $2n - 1$；
- 包含 $n - 1$ 个分支节点。

## 3. C 语言哈夫曼节点结构体定义
```c
typedef struct {
    int weight;
    int parent, lchild, rchild;
} HTNode, *HuffmanTree;
```
''', '["哈夫曼树", "WPL", "二叉树", "贪心"]', 'kp_ds_01', '2024_41', '摘自 2024年408第41题', 1, '本笔记精炼归纳了哈夫曼树带权路径长度WPL计算公式，并强调了度为1节点不存在的关键判题考点。'),
    (2, 2, '【计组】Cache-主存组相联映射主存地址划分速查表', 'CO', '''# Cache-主存组相联映射主存地址划分

- **主存地址位数** = $\\log_2(\\text{主存容量})$
- **块内地址 (Offset)** = $\\log_2(\\text{块大小 Byte})$
- **组地址 (Set Index)** = $\\log_2(\\text{Cache组数})$
- **主存标记 (Tag)** = 主存地址位数 - 组地址位数 - 块内地址位数

> **注意：** 比较器个数等于每组内的行数（即路数），每个比较器的位宽等于 Tag 的位数！
''', '["Cache", "组相联", "主存地址划分"]', 'kp_co_02', '2023_43', '摘自 2023年408第43题', 1, '总结了Cache组相联主存地址Tag、组号和块内偏移的划分关系及比较器位宽计算。')
]
cursor.executemany('INSERT INTO user_note (id, user_id, title, subject_code, content_md, tags_json, related_knowledge_id, related_question_id, excerpt_source, is_ai_summarized, ai_summary) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)', notes)

# 7. Seed user knowledge mastery
cursor.execute('DELETE FROM user_knowledge_mastery')
mastery = [
    (1, 2, 'kp_ds_01', 'DS', 15, 12, 80.00, 'MASTERED', 20.00),
    (2, 2, 'kp_ds_02', 'DS', 20, 16, 80.00, 'MASTERED', 20.00),
    (3, 2, 'kp_ds_03', 'DS', 10, 6, 60.00, 'FAMILIAR', 40.00),
    (4, 2, 'kp_ds_04', 'DS', 8, 4, 50.00, 'WEAK', 50.00),
    (5, 2, 'kp_ds_05', 'DS', 12, 9, 75.00, 'FAMILIAR', 25.00),
    (6, 2, 'kp_co_01', 'CO', 10, 8, 80.00, 'MASTERED', 20.00),
    (7, 2, 'kp_co_02', 'CO', 14, 7, 50.00, 'WEAK', 50.00),
    (8, 2, 'kp_co_03', 'CO', 12, 6, 50.00, 'WEAK', 50.00),
    (9, 2, 'kp_os_01', 'OS', 16, 12, 75.00, 'FAMILIAR', 25.00),
    (10, 2, 'kp_os_02', 'OS', 14, 7, 50.00, 'WEAK', 50.00),
    (11, 2, 'kp_net_01', 'NET', 18, 14, 77.78, 'FAMILIAR', 22.22),
    (12, 2, 'kp_net_02', 'NET', 15, 12, 80.00, 'MASTERED', 20.00),
    (13, 2, 'kp_net_03', 'NET', 12, 6, 50.00, 'WEAK', 50.00)
]
cursor.executemany('INSERT INTO user_knowledge_mastery (id, user_id, knowledge_block_id, subject_code, total_attempts, correct_attempts, accuracy_rate, mastery_level, weakness_score) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)', mastery)

conn.commit()
cursor.close()
conn.close()
print('SUCCESS! Seeded comprehensive 408 data successfully!')

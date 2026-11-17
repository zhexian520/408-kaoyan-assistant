package com.example.mcs.service.impl;

import com.example.mcs.common.PageResult;
import com.example.mcs.dto.QuestionQueryDTO;
import com.example.mcs.entity.ExamPaper;
import com.example.mcs.entity.ExamQuestion;
import com.example.mcs.entity.ExamQuestionSub;
import com.example.mcs.mapper.*;
import com.example.mcs.service.ExamService;
import com.example.mcs.util.JsonUtil;
import com.example.mcs.vo.ExamFilterVO;
import com.example.mcs.vo.PaperDetailVO;
import com.example.mcs.vo.QuestionDetailVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExamServiceImpl implements ExamService {

    private final ExamPaperMapper examPaperMapper;
    private final ExamQuestionMapper examQuestionMapper;
    private final ExamQuestionSubMapper examQuestionSubMapper;
    private final ExamQuestionKnowledgeMapper examQuestionKnowledgeMapper;
    private final UserQuestionFavoriteMapper userQuestionFavoriteMapper;

    private static final Map<String, String> SUBJECT_NAMES = Map.of(
            "ds", "数据结构",
            "co", "计算机组成原理",
            "os", "操作系统",
            "cn", "计算机网络"
    );

    @Override
    public Map<String, Object> getQuestionStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        QuestionQueryDTO totalQuery = new QuestionQueryDTO();
        stats.put("totalQuestions", examQuestionMapper.countByConditions(totalQuery));
        stats.put("totalPapers", examPaperMapper.selectAllPapers(1).size());

        Map<String, Long> subjectStats = new LinkedHashMap<>();
        for (String code : new String[]{"DS", "CO", "OS", "CN"}) {
            QuestionQueryDTO query = new QuestionQueryDTO();
            query.setSubjectCode(code);
            subjectStats.put(code, examQuestionMapper.countByConditions(query));
        }
        stats.put("subjectStats", subjectStats);
        return stats;
    }

    @Override
    public List<ExamPaper> getAllPapers() {
        return examPaperMapper.selectAllPapers(1);
    }

    @Override
    public PaperDetailVO getPaperDetail(Long paperId, Long userId) {
        ExamPaper paper = examPaperMapper.selectById(paperId);
        if (paper == null) {
            return null;
        }
        List<ExamQuestion> questions = examQuestionMapper.selectByPaperId(paperId);
        List<QuestionDetailVO> questionVOs = convertToQuestionVOList(questions, userId);
        return PaperDetailVO.builder()
                .paper(paper)
                .questions(questionVOs)
                .build();
    }

    @Override
    public PaperDetailVO getPaperByYear(Integer year, Long userId) {
        ExamPaper paper = examPaperMapper.selectByYear(year);
        if (paper == null) {
            return null;
        }
        List<ExamQuestion> questions = examQuestionMapper.selectByYear(year);
        List<QuestionDetailVO> questionVOs = convertToQuestionVOList(questions, userId);
        return PaperDetailVO.builder()
                .paper(paper)
                .questions(questionVOs)
                .build();
    }

    @Override
    public PageResult<QuestionDetailVO> queryQuestions(QuestionQueryDTO query, Long userId) {
        if (query.getPageNum() == null || query.getPageNum() < 1) query.setPageNum(1);
        if (query.getPageSize() == null || query.getPageSize() < 1) query.setPageSize(10);
        int offset = (query.getPageNum() - 1) * query.getPageSize();

        List<ExamQuestion> list = examQuestionMapper.selectByConditions(query, offset, query.getPageSize());
        Long total = examQuestionMapper.countByConditions(query);
        List<QuestionDetailVO> voList = convertToQuestionVOList(list, userId);
        return PageResult.of(voList, total, query.getPageNum(), query.getPageSize());
    }

    @Override
    public QuestionDetailVO getQuestionDetail(String questionId, Long userId) {
        ExamQuestion q = examQuestionMapper.selectById(questionId);
        if (q == null) return null;
        return convertToVO(q, userId);
    }

    @Override
    public ExamFilterVO getExamFilters(String subjectCode) {
        List<Integer> years = examPaperMapper.selectDistinctYears();
        List<String> chapters = examQuestionMapper.selectDistinctChapters(subjectCode);
        List<ExamFilterVO.SubjectOptionVO> subjects = List.of(
                new ExamFilterVO.SubjectOptionVO("ds", "数据结构"),
                new ExamFilterVO.SubjectOptionVO("co", "计算机组成原理"),
                new ExamFilterVO.SubjectOptionVO("os", "操作系统"),
                new ExamFilterVO.SubjectOptionVO("cn", "计算机网络")
        );

        return ExamFilterVO.builder()
                .years(years)
                .subjects(subjects)
                .questionTypes(List.of("choice", "comprehensive"))
                .difficulties(List.of(1, 2, 3, 4, 5))
                .chapters(chapters)
                .build();
    }

    @Override
    public List<Map<String, Object>> getKnowledgePointStats(String subjectCode) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Map<String, Object> row : examQuestionMapper.selectTagsBySubject(subjectCode)) {
            String tagsJson = row.get("tags_json") != null ? row.get("tags_json").toString() : null;
            List<String> tags = JsonUtil.parseStringList(tagsJson);
            if (tags.isEmpty()) {
                String chapter = row.get("chapter_name") != null ? row.get("chapter_name").toString() : "";
                if (!chapter.isBlank()) tags = List.of(chapter);
            }
            for (String tag : tags) {
                String name = tag == null ? "" : tag.trim();
                if (name.isBlank() || "数据结构".equals(name) || "计算机组成原理".equals(name)
                        || "操作系统".equals(name) || "计算机网络".equals(name)) {
                    continue;
                }
                counts.merge(name, 1, Integer::sum);
            }
        }
        return counts.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(120)
                .map(entry -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("name", entry.getKey());
                    item.put("count", entry.getValue());
                    return item;
                })
                .collect(Collectors.toList());
    }

    @Override
    public boolean toggleFavorite(Long userId, String questionId, String tag) {
        int count = userQuestionFavoriteMapper.checkFavorited(userId, questionId);
        if (count > 0) {
            userQuestionFavoriteMapper.delete(userId, questionId);
            return false;
        } else {
            com.example.mcs.entity.UserQuestionFavorite fav = com.example.mcs.entity.UserQuestionFavorite.builder()
                    .userId(userId)
                    .questionId(questionId)
                    .tag(tag == null || tag.isEmpty() ? "重点题" : tag)
                    .build();
            userQuestionFavoriteMapper.insert(fav);
            return true;
        }
    }

    private List<QuestionDetailVO> convertToQuestionVOList(List<ExamQuestion> questions, Long userId) {
        if (questions == null || questions.isEmpty()) {
            return Collections.emptyList();
        }
        Set<String> favoritedIds = Collections.emptySet();
        if (userId != null) {
            List<String> favs = userQuestionFavoriteMapper.selectUserFavoriteQuestionIds(userId);
            if (favs != null) {
                favoritedIds = new HashSet<>(favs);
            }
        }

        List<String> qids = questions.stream().map(ExamQuestion::getId).collect(Collectors.toList());
        List<ExamQuestionSub> allSubs = examQuestionSubMapper.selectByQuestionIds(qids);
        Map<String, List<ExamQuestionSub>> subMap = allSubs.stream()
                .collect(Collectors.groupingBy(ExamQuestionSub::getQuestionId));

        final Set<String> finalFavs = favoritedIds;
        return questions.stream().map(q -> {
            QuestionDetailVO vo = convertToVO(q, userId);
            vo.setSubQuestions(subMap.getOrDefault(q.getId(), Collections.emptyList()));
            vo.setIsFavorited(finalFavs.contains(q.getId()));
            return vo;
        }).collect(Collectors.toList());
    }

    private QuestionDetailVO convertToVO(ExamQuestion q, Long userId) {
        List<ExamQuestionSub> subs = examQuestionSubMapper.selectByQuestionId(q.getId());
        List<String> kbIds = examQuestionKnowledgeMapper.selectKbIdsByQuestionId(q.getId());
        boolean isFav = false;
        if (userId != null) {
            isFav = userQuestionFavoriteMapper.checkFavorited(userId, q.getId()) > 0;
        }

        return QuestionDetailVO.builder()
                .id(q.getId())
                .paperId(q.getPaperId())
                .year(q.getYear())
                .questionNumber(q.getQuestionNumber())
                .score(q.getScore())
                .questionType(q.getQuestionType())
                .subjectCode(q.getSubjectCode())
                .subjectName(SUBJECT_NAMES.getOrDefault(q.getSubjectCode(), q.getSubjectCode()))
                .chapterName(q.getChapterName())
                .stem(q.getStem())
                .options(JsonUtil.parseOptions(q.getOptionsJson()))
                .answer(q.getAnswer())
                .difficulty(q.getDifficulty())
                .tags(JsonUtil.parseStringList(q.getTagsJson()))
                .explanation(q.getExplanation())
                .examPointAnalysis(q.getExamPointAnalysis())
                .resourceLinks(JsonUtil.parseStringList(q.getResourceLinksJson()))
                .knowledgeBlockIds(kbIds)
                .subQuestions(subs)
                .isFavorited(isFav)
                .build();
    }
}


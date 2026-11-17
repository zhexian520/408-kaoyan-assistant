export type DegreeType = "学硕" | "专硕";

export interface MajorOption {
  code: string;
  name: string;
  degreeType: DegreeType;
  category: string;
  examSubjects: string;
}

export interface SchoolProgram {
  school: string;
  region: string;
  level: "985" | "211" | "双一流" | "普通";
  tags: string[];
  majorCode: string;
  majorName: string;
  degreeType: DegreeType;
  scores: number[];
  years: number[];
  examSubjects: string;
  note: string;
  heat: number;
}

export interface RecommendInput {
  degreeType: DegreeType;
  majorCode: string;
  targetScore: number;
  region?: string;
  level?: string;
  readinessScore?: number;
}

export interface RecommendedProgram extends SchoolProgram {
  category: "冲" | "稳" | "保";
  matchScore: number;
  gap: number;
  reasons: string[];
}

export const MAJOR_OPTIONS: MajorOption[] = [
  {
    code: "081200",
    name: "计算机科学与技术",
    degreeType: "学硕",
    category: "计算机类",
    examSubjects: "101 政治 / 201 英语一 / 301 数学一 / 408",
  },
  {
    code: "083500",
    name: "软件工程",
    degreeType: "学硕",
    category: "计算机类",
    examSubjects: "101 政治 / 201 英语一 / 301 数学一 / 408",
  },
  {
    code: "083900",
    name: "网络空间安全",
    degreeType: "学硕",
    category: "计算机类",
    examSubjects: "101 政治 / 201 英语一 / 301 数学一 / 408",
  },
  {
    code: "085404",
    name: "计算机技术",
    degreeType: "专硕",
    category: "电子信息",
    examSubjects: "101 政治 / 204 英语二 / 302 数学二 / 408",
  },
  {
    code: "085405",
    name: "软件工程",
    degreeType: "专硕",
    category: "电子信息",
    examSubjects: "101 政治 / 204 英语二 / 302 数学二 / 408",
  },
  {
    code: "085410",
    name: "人工智能",
    degreeType: "专硕",
    category: "电子信息",
    examSubjects: "101 政治 / 204 英语二 / 302 数学二 / 408",
  },
  {
    code: "085411",
    name: "大数据技术与工程",
    degreeType: "专硕",
    category: "电子信息",
    examSubjects: "101 政治 / 204 英语二 / 302 数学二 / 408",
  },
  {
    code: "085412",
    name: "网络与信息安全",
    degreeType: "专硕",
    category: "电子信息",
    examSubjects: "101 政治 / 204 英语二 / 302 数学二 / 408",
  },
];

interface SchoolSeed {
  school: string;
  region: string;
  level: SchoolProgram["level"];
  tags: string[];
  baseScores: [number, number, number];
  heat: number;
  note?: string;
}

const SCHOOL_SEEDS: SchoolSeed[] = [
  { school: "清华大学", region: "北京", level: "985", tags: ["C9", "顶尖"], baseScores: [385, 390, 395], heat: 98 },
  { school: "北京大学", region: "北京", level: "985", tags: ["C9", "顶尖"], baseScores: [380, 385, 390], heat: 97 },
  { school: "浙江大学", region: "浙江", level: "985", tags: ["C9", "计算机强校"], baseScores: [360, 365, 370], heat: 94 },
  { school: "上海交通大学", region: "上海", level: "985", tags: ["C9", "计算机强校"], baseScores: [375, 380, 385], heat: 95 },
  { school: "复旦大学", region: "上海", level: "985", tags: ["C9"], baseScores: [370, 375, 380], heat: 93 },
  { school: "南京大学", region: "江苏", level: "985", tags: ["C9", "软件强校"], baseScores: [360, 365, 370], heat: 92 },
  { school: "中国科学技术大学", region: "安徽", level: "985", tags: ["C9", "科研强校"], baseScores: [365, 370, 375], heat: 93 },
  { school: "哈尔滨工业大学", region: "黑龙江", level: "985", tags: ["C9", "工科强校"], baseScores: [345, 350, 355], heat: 86 },
  { school: "华中科技大学", region: "湖北", level: "985", tags: ["计算机强校"], baseScores: [350, 355, 360], heat: 88 },
  { school: "武汉大学", region: "湖北", level: "985", tags: ["综合强校"], baseScores: [345, 350, 355], heat: 87 },
  { school: "西安交通大学", region: "陕西", level: "985", tags: ["C9"], baseScores: [345, 350, 355], heat: 84 },
  { school: "北京航空航天大学", region: "北京", level: "985", tags: ["工科强校"], baseScores: [360, 365, 370], heat: 91 },
  { school: "北京邮电大学", region: "北京", level: "211", tags: ["计算机强校", "就业强"], baseScores: [340, 345, 350], heat: 89 },
  { school: "电子科技大学", region: "四川", level: "985", tags: ["电子信息强校"], baseScores: [345, 350, 355], heat: 88 },
  { school: "东南大学", region: "江苏", level: "985", tags: ["工科强校"], baseScores: [345, 350, 355], heat: 85 },
  { school: "同济大学", region: "上海", level: "985", tags: ["综合强校"], baseScores: [350, 355, 360], heat: 86 },
  { school: "中山大学", region: "广东", level: "985", tags: ["综合强校"], baseScores: [345, 350, 355], heat: 84 },
  { school: "华南理工大学", region: "广东", level: "985", tags: ["工科强校"], baseScores: [340, 345, 350], heat: 82 },
  { school: "南京航空航天大学", region: "江苏", level: "211", tags: ["国防特色", "性价比"], baseScores: [325, 330, 335], heat: 78 },
  { school: "南京理工大学", region: "江苏", level: "211", tags: ["国防特色"], baseScores: [320, 325, 330], heat: 76 },
  { school: "杭州电子科技大学", region: "浙江", level: "普通", tags: ["计算机强校", "就业强"], baseScores: [310, 315, 320], heat: 74 },
  { school: "深圳大学", region: "广东", level: "普通", tags: ["地域优势", "就业强"], baseScores: [315, 320, 325], heat: 80 },
  { school: "北京工业大学", region: "北京", level: "211", tags: ["地域优势"], baseScores: [315, 320, 325], heat: 72 },
  { school: "重庆大学", region: "重庆", level: "985", tags: ["综合强校"], baseScores: [330, 335, 340], heat: 76 },
  { school: "湖南大学", region: "湖南", level: "985", tags: ["综合强校"], baseScores: [330, 335, 340], heat: 75 },
  { school: "吉林大学", region: "吉林", level: "985", tags: ["综合强校"], baseScores: [325, 330, 335], heat: 73 },
  { school: "东北大学", region: "辽宁", level: "985", tags: ["工科强校"], baseScores: [325, 330, 335], heat: 72 },
  { school: "西北工业大学", region: "陕西", level: "985", tags: ["国防特色"], baseScores: [335, 340, 345], heat: 79 },
  { school: "兰州大学", region: "甘肃", level: "985", tags: ["性价比"], baseScores: [315, 320, 325], heat: 65 },
];

const PROGRAM_OFFSETS: Record<string, { offset: number; degreeType: DegreeType }> = {
  "081200": { offset: 0, degreeType: "学硕" },
  "083500": { offset: -5, degreeType: "学硕" },
  "083900": { offset: -8, degreeType: "学硕" },
  "085404": { offset: -8, degreeType: "专硕" },
  "085405": { offset: -12, degreeType: "专硕" },
  "085410": { offset: -6, degreeType: "专硕" },
  "085411": { offset: -10, degreeType: "专硕" },
  "085412": { offset: -9, degreeType: "专硕" },
};

const MAJOR_MAP = new Map(MAJOR_OPTIONS.map((item) => [item.code, item]));

function buildPrograms(seed: SchoolSeed): SchoolProgram[] {
  const codes = ["081200", "083500", "085404", "085405"];
  if (["清华大学", "北京大学", "浙江大学", "上海交通大学", "南京大学", "北京航空航天大学", "电子科技大学"].includes(seed.school)) {
    codes.push("085410");
  }
  if (["北京邮电大学", "西安交通大学", "华中科技大学"].includes(seed.school)) {
    codes.push("083900");
  }
  return codes.map((code) => {
    const major = MAJOR_MAP.get(code)!;
    const config = PROGRAM_OFFSETS[code];
    return {
      school: seed.school,
      region: seed.region,
      level: seed.level,
      tags: seed.tags,
      majorCode: code,
      majorName: major.name,
      degreeType: config.degreeType,
      scores: seed.baseScores.map((score) => score + config.offset),
      years: [2023, 2024, 2025],
      examSubjects: major.examSubjects,
      note: seed.note || "平台内置演示参考线，非院校官方发布；请以研招网和院校最新招生目录为准。",
      heat: seed.heat,
    };
  });
}

export const SCHOOL_PROGRAMS: SchoolProgram[] = SCHOOL_SEEDS.flatMap(buildPrograms);

export const REGIONS = Array.from(new Set(SCHOOL_PROGRAMS.map((item) => item.region))).sort();
export const SCHOOL_LEVELS = ["985", "211", "双一流", "普通"];

export function getMajorsByDegree(degreeType: DegreeType) {
  return MAJOR_OPTIONS.filter((item) => item.degreeType === degreeType);
}

export function recommendPrograms(input: RecommendInput): RecommendedProgram[] {
  const target = input.targetScore > 0 ? input.targetScore : 350;
  const readiness = input.readinessScore ?? 55;
  const filtered = SCHOOL_PROGRAMS.filter((program) => {
    if (program.degreeType !== input.degreeType) return false;
    if (input.majorCode && program.majorCode !== input.majorCode) return false;
    if (input.region && input.region !== "全部" && program.region !== input.region) return false;
    if (input.level && input.level !== "全部" && program.level !== input.level) return false;
    return true;
  });

  const scored = filtered.map((program) => {
    const reference = program.scores[program.scores.length - 1];
    const predictedUpper = reference + 8;
    const gap = target - predictedUpper;
    const category: RecommendedProgram["category"] = gap < 0 ? "冲" : gap <= 15 ? "稳" : "保";
    const levelBonus = program.level === "985" ? 4 : program.level === "211" ? 2 : 0;
    const matchScore = Math.max(
      35,
      Math.min(
        98,
        Math.round(62 + gap * 1.15 + (readiness - 55) * 0.25 + levelBonus - (program.heat - 70) * 0.08)
      )
    );
    const reasons = [
      `近三年参考线 ${program.scores.join(" / ")} 分`,
      gap >= 0 ? `目标分高于参考上沿 ${gap} 分` : `目标分低于参考上沿 ${Math.abs(gap)} 分`,
      program.level === "985" ? "985 院校，竞争热度较高" : program.level === "211" ? "211 院校，性价比较高" : "双非/普通院校，适合稳妥兜底",
    ];
    if (readiness >= 65) reasons.push("当前学习画像对冲刺形成正向支撑");
    else if (readiness < 50) reasons.push("当前学习画像仍处基础阶段，建议优先稳妥档");
    return { ...program, category, matchScore, gap, reasons };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore);
}

export function groupRecommendations(items: RecommendedProgram[]) {
  return {
    冲: items.filter((item) => item.category === "冲").slice(0, 4),
    稳: items.filter((item) => item.category === "稳").slice(0, 4),
    保: items.filter((item) => item.category === "保").slice(0, 4),
  };
}

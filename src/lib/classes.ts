export const CLASS_LIST = [
  { group: '중1', classes: ['중1S', '중1H', '중1A', '중1N', '중1K'] },
  { group: '중2', classes: ['중2S', '중2H', '중2A', '중2N', '중2K'] },
  { group: '중3', classes: ['중3S', '중3H', '중3A', '중3N', '중3K'] },
];

export const HIGH_CLASS_LIST = [
  { group: '고1', classes: ['고1S', '고1H', '고1A', '고1N', '고1K'] },
  { group: '고2', classes: ['고2S', '고2H', '고2A', '고2N', '고2K'] },
  { group: '고3', classes: ['고3S', '고3H', '고3A', '고3N', '고3K'] },
  { group: '중3', classes: ['중3S'] },
];

export const ALL_CLASS_LIST = [...CLASS_LIST, ...HIGH_CLASS_LIST];
export const ALL_CLASSES = ALL_CLASS_LIST.flatMap((g) => g.classes);
export const GRADE_LIST = [...new Set(ALL_CLASS_LIST.map((g) => g.group))];
export const SECTION_LIST = ['S', 'H', 'A', 'N', 'K'];

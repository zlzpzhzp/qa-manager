export const CLASS_LIST = [
  { group: '중1', classes: ['중1S', '중1H', '중1A', '중1N', '중1K'] },
  { group: '중2', classes: ['중2S', '중2H', '중2A', '중2N', '중2K'] },
  { group: '중3', classes: ['중3S', '중3H', '중3A', '중3N', '중3K'] },
];

export const ALL_CLASSES = CLASS_LIST.flatMap((g) => g.classes);
export const GRADE_LIST = CLASS_LIST.map((g) => g.group);
export const SECTION_LIST = ['S', 'H', 'A', 'N', 'K'];

export const MEDICINE_OPTIONS = [
  "ليدر",
  "مانع انسلاخ",
  "نصر لاثيون",
  "لمبدا",
  "كيمزيت",
] as const;

export type Medicine = (typeof MEDICINE_OPTIONS)[number];

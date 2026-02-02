export interface SectionData {
  status: 'normal' | 'abnormal' | null;
  expanded: boolean;
  data: Record<string, any>;
}

export interface Sections {
  [key: number]: SectionData;
}

export interface SectionGroupConfig {
  id: number;
  label: string;
  bulkLabel: string;
  sectionIds: number[];
}

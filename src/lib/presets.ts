import type { Person, Decedent } from '../types/models';

export interface Preset {
  label: string;
  description: string;
  decedent: Decedent;
  persons: Person[];
}

export const PRESETS: Preset[] = [
  {
    label: '配偶＋2名子女',
    description: '最常見的繼承情形，配偶與子女均分遺產',
    decedent: {
      id: 'preset_1_decedent',
      name: '王大明',
      deathDate: '2024-06-15',
    },
    persons: [
      {
        id: 'preset_1_1',
        name: '李小華',
        relation: '配偶',
        status: '一般繼承',
      },
      {
        id: 'preset_1_2',
        name: '王一郎',
        relation: '子女',
        status: '一般繼承',
      },
      {
        id: 'preset_1_3',
        name: '王二郎',
        relation: '子女',
        status: '一般繼承',
      },
    ],
  },
  {
    label: '配偶＋父母（無子女）',
    description: '無子女時由配偶與父母共同繼承',
    decedent: {
      id: 'preset_2_decedent',
      name: '陳志明',
      deathDate: '2024-03-20',
    },
    persons: [
      {
        id: 'preset_2_1',
        name: '林美玲',
        relation: '配偶',
        status: '一般繼承',
      },
      {
        id: 'preset_2_2',
        name: '陳國華',
        relation: '父',
        status: '一般繼承',
      },
      {
        id: 'preset_2_3',
        name: '張秀英',
        relation: '母',
        status: '一般繼承',
      },
    ],
  },
  {
    label: '代位繼承（子女死亡由孫代位）',
    description: '子女先於被繼承人死亡，由其子女代位繼承',
    decedent: {
      id: 'preset_3_decedent',
      name: '張文雄',
      deathDate: '2024-08-10',
    },
    persons: [
      {
        id: 'preset_3_1',
        name: '黃淑芬',
        relation: '配偶',
        status: '一般繼承',
      },
      {
        id: 'preset_3_2',
        name: '張大宏',
        relation: '子女',
        status: '一般繼承',
      },
      {
        id: 'preset_3_3',
        name: '張大偉',
        relation: '子女',
        status: '死亡',
        deathDate: '2024-01-05',
      },
      {
        id: 'preset_3_4',
        name: '張小明',
        relation: '子女',
        status: '代位繼承',
        parentId: 'preset_3_3',
      },
      {
        id: 'preset_3_5',
        name: '張小華',
        relation: '子女',
        status: '代位繼承',
        parentId: 'preset_3_3',
      },
    ],
  },
  {
    label: '再轉繼承（子女於被繼承人後死亡）',
    description: '子女於被繼承人死亡後才過世，遺產再轉由其繼承人繼承',
    decedent: {
      id: 'preset_4_decedent',
      name: '劉建國',
      deathDate: '2024-02-14',
    },
    persons: [
      {
        id: 'preset_4_1',
        name: '周雅琪',
        relation: '配偶',
        status: '一般繼承',
      },
      {
        id: 'preset_4_2',
        name: '劉家豪',
        relation: '子女',
        status: '一般繼承',
      },
      {
        id: 'preset_4_3',
        name: '劉家瑋',
        relation: '子女',
        status: '再轉繼承',
        deathDate: '2024-05-20',
      },
      {
        id: 'preset_4_4',
        name: '林佳蓉',
        relation: '子女之配偶',
        status: '再轉繼承',
        parentId: 'preset_4_3',
      },
      {
        id: 'preset_4_5',
        name: '劉小安',
        relation: '子女',
        status: '再轉繼承',
        parentId: 'preset_4_3',
      },
    ],
  },
];

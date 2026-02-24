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
      estateAmount: 18000000,
    },
    persons: [
      {
        id: 'preset_1_1',
        name: '李小華',
        relation: '配偶',
        status: '一般繼承',
        birthDate: '1965-09-12',
        marriageDate: '1990-11-03',
      },
      {
        id: 'preset_1_2',
        name: '王一郎',
        relation: '子女',
        status: '一般繼承',
        birthDate: '1992-03-18',
      },
      {
        id: 'preset_1_3',
        name: '王二郎',
        relation: '子女',
        status: '一般繼承',
        birthDate: '1995-07-22',
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
      estateAmount: 12000000,
    },
    persons: [
      {
        id: 'preset_2_1',
        name: '林美玲',
        relation: '配偶',
        status: '一般繼承',
        birthDate: '1988-04-05',
        marriageDate: '2015-10-10',
      },
      {
        id: 'preset_2_2',
        name: '陳國華',
        relation: '父',
        status: '一般繼承',
        birthDate: '1958-01-30',
      },
      {
        id: 'preset_2_3',
        name: '張秀英',
        relation: '母',
        status: '一般繼承',
        birthDate: '1960-08-14',
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
      estateAmount: 30000000,
    },
    persons: [
      {
        id: 'preset_3_1',
        name: '黃淑芬',
        relation: '配偶',
        status: '一般繼承',
        birthDate: '1960-12-25',
        marriageDate: '1985-06-08',
      },
      {
        id: 'preset_3_2',
        name: '張大宏',
        relation: '子女',
        status: '一般繼承',
        birthDate: '1987-02-14',
      },
      {
        id: 'preset_3_3',
        name: '張大偉',
        relation: '子女',
        status: '死亡',
        birthDate: '1989-11-03',
        deathDate: '2024-01-05',
      },
      {
        id: 'preset_3_4',
        name: '張小明',
        relation: '子女',
        status: '代位繼承',
        birthDate: '2015-05-20',
        parentId: 'preset_3_3',
      },
      {
        id: 'preset_3_5',
        name: '張小華',
        relation: '子女',
        status: '代位繼承',
        birthDate: '2018-09-08',
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
      estateAmount: 25000000,
    },
    persons: [
      {
        id: 'preset_4_1',
        name: '周雅琪',
        relation: '配偶',
        status: '一般繼承',
        birthDate: '1968-06-30',
        marriageDate: '1993-12-18',
      },
      {
        id: 'preset_4_2',
        name: '劉家豪',
        relation: '子女',
        status: '一般繼承',
        birthDate: '1995-04-12',
      },
      {
        id: 'preset_4_3',
        name: '劉家瑋',
        relation: '子女',
        status: '再轉繼承',
        birthDate: '1997-08-25',
        deathDate: '2024-05-20',
        marriageDate: '2020-03-15',
      },
      {
        id: 'preset_4_4',
        name: '林佳蓉',
        relation: '子女之配偶',
        status: '再轉繼承',
        birthDate: '1998-01-10',
        marriageDate: '2020-03-15',
        parentId: 'preset_4_3',
      },
      {
        id: 'preset_4_5',
        name: '劉小安',
        relation: '子女',
        status: '再轉繼承',
        birthDate: '2021-11-28',
        parentId: 'preset_4_3',
      },
    ],
  },
];

export interface Palette {
  id: string;
  name: string;
  bg: string; // background rect, visible in the gaps between cells
  ink: string; // stroke color in colored modes
  colors: string[];
}

export const PALETTES: Palette[] = [
  {
    id: 'terrazzo',
    name: 'Terrazzo',
    bg: '#f5efe4',
    ink: '#33302b',
    colors: ['#d96f4e', '#e8b64c', '#7ea172', '#41576e', '#c9b7a0', '#8c5b45'],
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    bg: '#0d3b4f',
    ink: '#082733',
    colors: ['#0f6f7a', '#2fa5a0', '#7fd0c4', '#bfe8dd', '#eaf6f0', '#17495c'],
  },
  {
    id: 'citrus',
    name: 'Citrus',
    bg: '#fff8e8',
    ink: '#4c4433',
    colors: ['#ef476f', '#f78c6b', '#ffd166', '#83d483', '#06d6a0', '#118ab2'],
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet',
    bg: '#181433',
    ink: '#0e0b22',
    colors: ['#5e60ce', '#6930c3', '#7400b8', '#5390d9', '#48bfe3', '#80ffdb'],
  },
  {
    id: 'terra',
    name: 'Terra',
    bg: '#efe6d8',
    ink: '#3f3128',
    colors: ['#7f4f24', '#936639', '#a68a64', '#b6ad90', '#656d4a', '#414833'],
  },
  {
    id: 'sorbet',
    name: 'Sorbet',
    bg: '#fdf3f6',
    ink: '#907a86',
    colors: ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#bdb2ff'],
  },
];

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

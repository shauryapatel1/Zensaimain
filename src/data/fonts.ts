export interface Font {
  name: string;
  className: string;
  description: string;
}

export const fonts: Font[] = [
  {
    name: 'Default',
    className: 'font-sans',
    description: 'Clean and modern (Inter & Poppins)'
  },
  {
    name: 'Serif',
    className: 'font-serif',
    description: 'Classic and elegant (Merriweather)'
  },
  {
    name: 'Monospace',
    className: 'font-mono',
    description: 'Clear and precise (JetBrains Mono)'
  },
  {
    name: 'Handwritten',
    className: 'font-handwritten',
    description: 'Personal and creative (Caveat)'
  },
  {
    name: 'Elegant',
    className: 'font-elegant',
    description: 'Sophisticated and refined (Playfair Display)'
  }
];
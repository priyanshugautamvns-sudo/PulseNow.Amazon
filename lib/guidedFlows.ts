/**
 * Guided shopping flows — for users who know the goal but not the items.
 * Each flow asks 1-3 small questions then assembles a goal-based cart
 * via the cart builder agent. Designed to look like an empathetic
 * conversation, not a 50-product browse.
 */
export type GuidedFlow = {
  id: string;
  label: string;
  icon: string;
  intro: string;
  questions: { id: string; text: string; options: string[] }[];
  scenario_id: string; // points at demoScenarios for cart assembly
  closing: string;
};

export const GUIDED_FLOWS: GuidedFlow[] = [
  {
    id: 'new_parent',
    label: "I'm a new parent",
    icon: '👶',
    intro: 'Congrats! Let me help you get set up without 30 search tabs.',
    questions: [
      { id: 'age', text: 'Baby age?', options: ['0-3 months', '3-6 months', '6-12 months', '12+ months'] },
      { id: 'need', text: 'Most urgent need today?', options: ['Diapers + wipes', 'Bath + skin', 'Feeding', 'All-in-one starter'] },
      { id: 'brand', text: 'Brand preference?', options: ['Pampers', 'Huggies', 'Trust Amazon to choose'] }
    ],
    scenario_id: 'new_parent',
    closing: 'Trusted starter kit ready. Every item has a "Why this?" tap.'
  },
  {
    id: 'house_cleaning',
    label: 'I want to clean my whole house',
    icon: '🧽',
    intro: 'Let me build a kit for the rooms you actually clean.',
    questions: [
      { id: 'size', text: 'Home size?', options: ['1BHK', '2BHK', '3BHK+'] },
      { id: 'rooms', text: 'Which rooms today?', options: ['Floor + bathroom', 'Kitchen', 'All rooms'] }
    ],
    scenario_id: 'house_cleaning',
    closing: 'Cleaning kit ready in one delivery.'
  },
  {
    id: 'vegan_snacks',
    label: 'I want vegan snacks',
    icon: '🌱',
    intro: 'Only 100% vegan SKUs, brand values verified.',
    questions: [
      { id: 'goal', text: 'Goal?', options: ['Healthy snacks', 'Protein boost', 'Indulgent treats'] }
    ],
    scenario_id: 'vegan_snacks',
    closing: 'Vegan picks ready. Every label checked.'
  },
  {
    id: 'high_protein',
    label: 'I want high-protein breakfast',
    icon: '💪',
    intro: 'Starts at 15g+ protein per serving.',
    questions: [
      { id: 'goal', text: 'Pick your style', options: ['Vegan', 'Vegetarian', 'Eggs ok'] }
    ],
    scenario_id: 'high_protein',
    closing: 'Protein-first picks ready.'
  },
  {
    id: 'hostel',
    label: "I'm going to college hostel",
    icon: '🎒',
    intro: '1-month survival kit. Built for shared kitchens and tight rooms.',
    questions: [
      { id: 'cooking', text: 'Cooking allowed?', options: ['Yes', 'No, only kettle / microwave'] }
    ],
    scenario_id: 'hostel',
    closing: 'Hostel kit ready. Welcome to college.'
  }
];

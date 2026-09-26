export const QUESTION_BANK = [
  // ================= EASY (5 Questions) =================
  {
    id: 'e1',
    category: 'Quantitative Aptitude',
    difficulty: 'EASY',
    question: 'A train 150 meters long is running at a speed of 54 km/h. In how many seconds will it cross an electric pole?',
    options: ['8 seconds', '10 seconds', '12 seconds', '15 seconds'],
    answer: 1, // 10 seconds (54 km/h = 15 m/s; 150 / 15 = 10)
    explanation: '54 km/h = 54 × (5/18) = 15 m/s. Time to cross pole = 150m / 15 m/s = 10 seconds.'
  },
  {
    id: 'e2',
    category: 'Logical Reasoning',
    difficulty: 'EASY',
    question: 'In a certain code, "ORANGE" is written as "PSBOHF". How is "GRAPES" written in that same code?',
    options: ['HSBQFT', 'HTBQFT', 'HSBQFS', 'GSBQFT'],
    answer: 0, // HSBQFT (+1 to each letter)
    explanation: 'Each character shifts forward by +1 position in the alphabet: G→H, R→S, A→B, P→Q, E→F, S→T.'
  },
  {
    id: 'e3',
    category: 'Verbal Ability',
    difficulty: 'EASY',
    question: 'Choose the word that is most nearly OPPOSITE in meaning to CANDID:',
    options: ['Blunt', 'Deceptive', 'Frank', 'Sincere'],
    answer: 1, // Deceptive
    explanation: 'Candid means truthful and straightforward. Deceptive is its direct antonym.'
  },
  {
    id: 'e4',
    category: 'Quantitative Aptitude',
    difficulty: 'EASY',
    question: 'A mechanical watch marked at $80 is sold at a clearance discount of 25%. What is the final selling price?',
    options: ['$55', '$60', '$64', '$70'],
    answer: 1, // $60
    explanation: '25% of 80 = 20. Selling price = 80 - 20 = $60.'
  },
  {
    id: 'e5',
    category: 'Logical Reasoning',
    difficulty: 'EASY',
    question: 'Identify the next number in the deterministic sequence: 3, 7, 15, 31, 63, ...',
    options: ['125', '127', '129', '131'],
    answer: 1, // 127
    explanation: 'Pattern: (N × 2) + 1. Next number = (63 × 2) + 1 = 126 + 1 = 127.'
  },

  // ================= MEDIUM (5 Questions) =================
  {
    id: 'm1',
    category: 'Quantitative Aptitude',
    difficulty: 'MEDIUM',
    question: 'Engineers A and B together complete a calibration task in 12 days. Engineer A alone takes 20 days. How many days will Engineer B alone require?',
    options: ['25 days', '28 days', '30 days', '36 days'],
    answer: 2, // 30 days
    explanation: '1/B = 1/12 - 1/20 = (5 - 3)/60 = 2/60 = 1/30. B requires 30 days.'
  },
  {
    id: 'm2',
    category: 'Logical Reasoning',
    difficulty: 'MEDIUM',
    question: 'Statements: All systems architects are problem solvers. Some problem solvers are data analysts.\nConclusions:\nI. Some systems architects are data analysts.\nII. Some problem solvers are systems architects.',
    options: ['Only Conclusion I follows', 'Only Conclusion II follows', 'Both I and II follow', 'Neither I nor II follows'],
    answer: 1, // Only II follows
    explanation: 'Conversion of "All architects are problem solvers" yields "Some problem solvers are architects" (Conclusion II). No direct link connects architects to data analysts.'
  },
  {
    id: 'm3',
    category: 'Verbal Ability',
    difficulty: 'MEDIUM',
    question: 'Select the precise term to complete the sentence: "The lead researcher’s proof was so ______ that even the strictest peer-review committee discovered zero vulnerabilities."',
    options: ['specious', 'lucid', 'tenuous', 'prolix'],
    answer: 1, // lucid
    explanation: 'Lucid means clear, rational, and easily understood, which matches the context.'
  },
  {
    id: 'm4',
    category: 'Quantitative Aptitude',
    difficulty: 'MEDIUM',
    question: 'If 40% of (A + B) equals 60% of (A - B), what percentage of A is B?',
    options: ['15%', '20%', '25%', '33.3%'],
    answer: 1, // 20%
    explanation: '0.4(A + B) = 0.6(A - B) ⇒ 0.4A + 0.4B = 0.6A - 0.6B ⇒ B = 0.2A ⇒ B/A = 1/5 = 20%.'
  },
  {
    id: 'm5',
    category: 'Logical Reasoning',
    difficulty: 'MEDIUM',
    question: 'Referencing a portrait, Priya notes: "He is the biological son of the only daughter of my paternal grandfather." How is the portrait related to Priya?',
    options: ['Brother', 'Uncle', 'Son', 'Nephew'],
    answer: 0, // Brother
    explanation: 'Assuming the daughter is her mother/father\'s sibling, paternal grandfather\'s daughter with Priya being the daughter makes the boy Priya\'s brother.'
  },

  // ================= HARD (5 Questions) =================
  {
    id: 'h1',
    category: 'Quantitative Aptitude',
    difficulty: 'HARD',
    question: 'A survey vessel travels 24 km upstream and 36 km downstream in 6 hours. It also navigates 36 km upstream and 24 km downstream in 6.5 hours. What is the river current speed?',
    options: ['1.5 km/h', '2.0 km/h', '2.5 km/h', '3.0 km/h'],
    answer: 1, // 2.0 km/h
    explanation: '24/u + 36/v = 6 and 36/u + 24/v = 6.5 yields upstream u = 8 km/h and downstream v = 12 km/h. Current speed = (v - u)/2 = (12 - 8)/2 = 2.0 km/h.'
  },
  {
    id: 'h2',
    category: 'Logical Reasoning',
    difficulty: 'HARD',
    question: 'Six nodes (P, Q, R, S, T, U) are configured in a ring facing center. P is second to the left of T. Q is diametrically opposite P. R sits between P and T. S is not adjacent to Q. Which node is immediately left of U?',
    options: ['P', 'Q', 'R', 'S'],
    answer: 1, // Q
    explanation: 'Assigning ring positions with T=1, R=2, P=3, Q=6: S cannot be at 5 (adjacent to 6), so S=4 and U=5. Node immediately to the left of U (at 5) facing center is Q (at 6).'
  },
  {
    id: 'h3',
    category: 'Verbal Ability',
    difficulty: 'HARD',
    question: 'Argument: "Enterprise firms that instituted asynchronous core hours observed a 22% surge in shipped features. Therefore, all engineering divisions should immediately discard synchronous standups." Which statement most critically weakens this deduction?',
    options: [
      'Engineers frequently report elevated job satisfaction during remote setups.',
      'The surveyed firms develop modular decoupled microservices requiring minimal cross-team coordination.',
      'Time-tracking tools introduce fractional administrative overhead.',
      'Asynchronous workflows require well-documented sprint tickets.'
    ],
    answer: 1, // Surveyed firms are modular decoupled
    explanation: 'If the observed benefit was contingent on modular decoupled architectures, the blanket prescription for all engineering teams is unjustified.'
  },
  {
    id: 'h4',
    category: 'Quantitative Aptitude',
    difficulty: 'HARD',
    question: 'A chemical reservoir holds ethanol and distilled water in ratio 4:3. When 5 liters of water is introduced, the ratio becomes 4:5. What was the original quantity of ethanol?',
    options: ['8 liters', '10 liters', '12 liters', '16 liters'],
    answer: 1, // 10 liters
    explanation: 'Ethanol = 4x, water = 3x. 4x / (3x + 5) = 4/5 ⇒ 20x = 12x + 20 ⇒ 8x = 20 ⇒ x = 2.5. Ethanol = 4 × 2.5 = 10 liters.'
  },
  {
    id: 'h5',
    category: 'Logical Reasoning',
    difficulty: 'HARD',
    question: 'Rule 1: If runtime heap exhausts, garbage collection triggers immediately.\nRule 2: Either stack fragmentation occurs or runtime heap exhausts.\nObserved: Garbage collection did NOT trigger.\nWhat MUST follow with logical certainty?',
    options: [
      'Stack fragmentation occurred',
      'Runtime heap exhausted silently',
      'The entire program terminated cleanly',
      'No deterministic deduction is possible'
    ],
    answer: 0, // Stack fragmentation occurred
    explanation: 'By Modus Tollens on Rule 1: runtime heap did NOT exhaust. From Rule 2 (disjunctive syllogism): stack fragmentation MUST have occurred.'
  }
];

import type {
  CoachProfile,
  PartnerProfile,
  PracticeMode,
  PracticeSessionRecord,
  ProficiencyLevel,
  SpeakingTopic,
  VocabularyItem,
} from "../types";

export const HERO_IMAGE_URL =
  "/src/assets/images/hero_communication_studio_1795592010624.jpg";

export const SPEAKING_TOPICS: {
  id: SpeakingTopic;
  mode: PracticeMode;
  description: string;
  starterPrompts: string[];
  defaultVocabulary: VocabularyItem;
}[] = [
  {
    id: "Daily Life",
    mode: "Friendly Conversation",
    description: "Everyday routines, campus life, travel, hobbies, and natural phrasing.",
    starterPrompts: [
      "I am go to college yesterday and met my friends.",
      "Every morning I wake up early to prepare for classes and review my notes.",
      "Last weekend I visited a local library to finish my presentation.",
    ],
    defaultVocabulary: {
      word: "consistent",
      partOfSpeech: "adjective",
      meaning: "Acting or done in the same reliable way over time to build steady progress.",
      example: "Staying consistent with 15 minutes of daily speaking improved my fluency.",
      topic: "Daily Life",
      mode: "Friendly Conversation",
    },
  },
  {
    id: "Job Interviews",
    mode: "HR Interview Practice",
    description: "Behavioral answers, strengths, career motivation, and STAR storytelling.",
    starterPrompts: [
      "I am working on my capstone project since six months and led a team of four.",
      "My biggest strength is breaking down complex tasks into clear milestones.",
      "I want to join your engineering team because I enjoy building reliable software.",
    ],
    defaultVocabulary: {
      word: "articulate",
      partOfSpeech: "verb",
      meaning: "To express an idea, goal, or feeling fluently and coherently in speech.",
      example: "She was able to articulate her project impact clearly during the panel interview.",
      topic: "Job Interviews",
      mode: "HR Interview Practice",
    },
  },
  {
    id: "Education",
    mode: "Public Speaking Practice",
    description: "Seminars, coursework summaries, academic presentations, and Q&A.",
    starterPrompts: [
      "Yesterday our professor explain us how neural networks learn from training data.",
      "In today's seminar I will present our survey findings on student study habits.",
      "Preparing an outline before class helps me participate more confidently.",
    ],
    defaultVocabulary: {
      word: "synthesize",
      partOfSpeech: "verb",
      meaning: "To combine multiple ideas or research findings into one clear summary.",
      example: "Good seminar speakers synthesize key readings into three memorable takeaways.",
      topic: "Education",
      mode: "Public Speaking Practice",
    },
  },
  {
    id: "Technology",
    mode: "Technical Interview Practice",
    description: "Explaining software projects, architecture choices, debugging, and AI trends.",
    starterPrompts: [
      "The database have high latency when many user connects at the same time.",
      "We added caching to reduce API response time during peak student registration.",
      "I debugged the issue by inspecting network requests and reproducing the edge case.",
    ],
    defaultVocabulary: {
      word: "scalability",
      partOfSpeech: "noun",
      meaning: "The capacity of a system to handle growing workload smoothly without slowing down.",
      example: "We evaluated database indexing early to guarantee scalability for campus launch.",
      topic: "Technology",
      mode: "Technical Interview Practice",
    },
  },
  {
    id: "General Conversation",
    mode: "Professional Workplace Communication",
    description: "Small talk, workplace standups, expressing opinions, and polite discussion.",
    starterPrompts: [
      "We discussed about the project timeline with manager during today's standup.",
      "Could we schedule a quick check-in tomorrow to align on the next deliverable?",
      "I really enjoyed reading an article about how remote teams collaborate effectively.",
    ],
    defaultVocabulary: {
      word: "concise",
      partOfSpeech: "adjective",
      meaning: "Giving clear, complete information in a few well-chosen words.",
      example: "Keeping standup updates concise helps everyone stay focused on blockers.",
      topic: "General Conversation",
      mode: "Professional Workplace Communication",
    },
  },
];

export const PRACTICE_MODES: {
  id: PracticeMode;
  shortTitle: string;
  description: string;
  samplePrompt: string;
}[] = [
  {
    id: "Friendly Conversation",
    shortTitle: "Daily Life",
    description:
      "Build everyday speaking fluency through relaxed dialogues on daily routines, campus life, travel, and personal interests.",
    samplePrompt: "Tell me about a memorable weekend or a book you enjoyed recently.",
  },
  {
    id: "HR Interview Practice",
    shortTitle: "Job Interviews",
    description:
      "Practice behavioral questions, career motivation, teamwork stories, and structured STAR responses.",
    samplePrompt: "Walk me through your background and why this role excites you.",
  },
  {
    id: "Technical Interview Practice",
    shortTitle: "Technology",
    description:
      "Articulate architecture choices, debugging approaches, and project trade-offs in clear, precise English.",
    samplePrompt: "Describe a technical challenge you solved and how you evaluated alternatives.",
  },
  {
    id: "Public Speaking Practice",
    shortTitle: "Education & Speaking",
    description:
      "Strengthen presentation openings, smooth transitions, audience engagement, and clear Q&A delivery.",
    samplePrompt: "Give a 45-second opening hook for a topic you care about.",
  },
  {
    id: "Professional Workplace Communication",
    shortTitle: "General Conversation",
    description:
      "Rehearse standup updates, polite disagreement, stakeholder summaries, and cross-team meetings.",
    samplePrompt: "Share a concise project status update including one current blocker.",
  },
];

export const PROFICIENCY_LEVELS: {
  level: ProficiencyLevel;
  displayLabel: string;
  subtitle: string;
}[] = [
  {
    level: "Beginner",
    displayLabel: "Beginner",
    subtitle: "Clear everyday sentences & foundational grammar guidance",
  },
  {
    level: "Intermediate",
    displayLabel: "Intermediate",
    subtitle: "Natural conversation flow, tense accuracy & practical vocabulary",
  },
  {
    level: "Advanced",
    displayLabel: "Interview Ready",
    subtitle: "Polished articulation, structured interview answers & executive clarity",
  },
];

export function formatLevelLabel(level: ProficiencyLevel): string {
  if (level === "Advanced") return "Interview Ready";
  return level;
}

export const CONVERSATION_TOPICS = [
  "Career & Interviews",
  "Technology & Engineering",
  "Everyday Life & Culture",
  "Business & Leadership",
  "Academic & Research",
  "Public Speaking & Presentations",
] as const;

export const PRACTICE_PURPOSES = [
  "Job Interview Preparation",
  "Daily Speaking Fluency",
  "Workplace Meetings & Emails",
  "Academic Presentations",
  "Confidence Building",
] as const;

export const AVAILABILITY_SLOTS = [
  "Weekday Mornings",
  "Weekday Evenings",
  "Weekend Mornings",
  "Weekend Afternoons",
  "Flexible Schedule",
] as const;

export const COMMUNICATION_GOALS = [
  "Speak fluently in job interviews",
  "Improve workplace meeting clarity",
  "Expand professional vocabulary",
  "Reduce recurring grammar mistakes",
  "Deliver confident presentations",
  "Hold natural everyday conversations",
] as const;

export const DEMO_PARTNERS: PartnerProfile[] = [
  {
    id: "demo-partner-1",
    name: "Ananya Deshmukh",
    initials: "AD",
    role: "Final-Year Computer Science Student",
    location: "Pune, India",
    proficiencyLevel: "Intermediate",
    primaryTopic: "Career & Interviews",
    secondaryTopics: ["Technology & Engineering", "Workplace Meetings & Emails"],
    practicePurpose: "Job Interview Preparation",
    availability: ["Weekday Evenings", "Weekend Mornings"],
    bio: "Preparing for graduate software engineering interviews and practicing clear explanations of technical projects using structured answers.",
    isDemoUser: true,
    starterPrompt:
      "Hi! I'm preparing for campus technical and HR rounds. Would you like to take turns answering behavioral interview questions for 15 minutes?",
  },
  {
    id: "demo-partner-2",
    name: "Daniel Okafor",
    initials: "DO",
    role: "Junior Product Analyst",
    location: "Lagos, Nigeria",
    proficiencyLevel: "Intermediate",
    primaryTopic: "Business & Leadership",
    secondaryTopics: ["Career & Interviews", "Public Speaking & Presentations"],
    practicePurpose: "Workplace Meetings & Emails",
    availability: ["Weekday Mornings", "Weekday Evenings", "Flexible Schedule"],
    bio: "Working with distributed product teams and looking to practice concise status updates, polite pushback, and stakeholder presentations.",
    isDemoUser: true,
    starterPrompt:
      "Hello! Let's practice giving crisp 2-minute project updates and asking clarifying questions as if we're in a weekly product sync.",
  },
  {
    id: "demo-partner-3",
    name: "Mei-Ling Zhou",
    initials: "MZ",
    role: "Master's Student in Data Science",
    location: "Taipei, Taiwan",
    proficiencyLevel: "Advanced",
    primaryTopic: "Academic & Research",
    secondaryTopics: ["Technology & Engineering", "Public Speaking & Presentations"],
    practicePurpose: "Academic Presentations",
    availability: ["Weekend Mornings", "Weekend Afternoons"],
    bio: "Refining thesis defense delivery and Q&A articulation. Happy to exchange structured peer feedback on clarity and transitions.",
    isDemoUser: true,
    starterPrompt:
      "Hi there! I'm rehearsing my research summary for an upcoming seminar. Shall we each pitch a complex concept in plain English?",
  },
  {
    id: "demo-partner-4",
    name: "Mateo Silva",
    initials: "MS",
    role: "Mechanical Engineering Undergraduate",
    location: "Bogota, Colombia",
    proficiencyLevel: "Beginner",
    primaryTopic: "Everyday Life & Culture",
    secondaryTopics: ["Career & Interviews", "Academic & Research"],
    practicePurpose: "Daily Speaking Fluency",
    availability: ["Weekday Evenings", "Weekend Afternoons", "Flexible Schedule"],
    bio: "Building confidence speaking English out loud every day. Looking for patient, supportive practice partners for casual topics.",
    isDemoUser: true,
    starterPrompt:
      "Hi! I want to build a daily speaking habit without worrying about mistakes. Let's talk about our study routines and favorite places to visit.",
  },
];

export const SAMPLE_COACHES: CoachProfile[] = [
  {
    id: "coach-elena",
    name: "Dr. Elena Rostova",
    title: "Executive Communication & Public Speaking Coach",
    expertise: "Public Speaking & Executive Presence",
    focusAreas: ["Keynote Structure", "Vocal Clarity", "Q&A Composure"],
    biography:
      "Specializes in helping graduate students and team leads organize complex ideas into compelling spoken narratives with calm pacing and clear signposting.",
    sampleExperience: "12 years in academic rhetoric and leadership communication training",
    avatarUrl: "/src/assets/images/coach_elena_1795592198805.jpg",
    availableSlots: ["09:00 AM", "11:30 AM", "04:00 PM"],
    isSampleCoach: true,
  },
  {
    id: "coach-marcus",
    name: "Marcus Vance",
    title: "HR & Technical Interview Strategist",
    expertise: "Interview Articulation & Career Storytelling",
    focusAreas: ["STAR Behavioral Answers", "Technical Explanations", "Salary & Role Discussions"],
    biography:
      "Coaches early-career engineers and analysts on turning resume milestones into concise, credible spoken stories during high-stakes interviews.",
    sampleExperience: "9 years in talent coaching and engineering hiring panels",
    avatarUrl: "/src/assets/images/coach_marcus_1795592198931.jpg",
    availableSlots: ["10:00 AM", "02:00 PM", "06:30 PM"],
    isSampleCoach: true,
  },
  {
    id: "coach-priya",
    name: "Priya Nair",
    title: "Workplace Fluency & Clarity Mentor",
    expertise: "Cross-Cultural Workplace Communication",
    focusAreas: ["Meeting Participation", "Diplomatic Feedback", "Pronunciation & Intonation"],
    biography:
      "Works with non-native English professionals to speak up clearly in fast-paced remote standups, stakeholder reviews, and cross-functional meetings.",
    sampleExperience: "8 years coaching global technology and consulting teams",
    avatarUrl: "/src/assets/images/coach_priya_1795592199048.jpg",
    availableSlots: ["08:30 AM", "01:30 PM", "05:30 PM"],
    isSampleCoach: true,
  },
  {
    id: "coach-david",
    name: "David Chen",
    title: "Academic Speaking & Fluency Mentor",
    expertise: "Academic Discussions & Structured Fluency",
    focusAreas: ["Seminar Discussions", "Thesis Defense", "Grammar Accuracy in Speech"],
    biography:
      "Helps university students bridge the gap between strong reading comprehension and confident, accurate spoken English in lectures and research defenses.",
    sampleExperience: "11 years in university ESL communication programs",
    avatarUrl: "/src/assets/images/coach_david_1795592201410.jpg",
    availableSlots: ["09:30 AM", "03:00 PM", "07:00 PM"],
    isSampleCoach: true,
  },
];

export function createSampleDemoSessions(userId: string): PracticeSessionRecord[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return [
    {
      id: `sample-sess-today-${userId}`,
      userId,
      mode: "HR Interview Practice",
      topic: "Job Interviews",
      level: "Intermediate",
      startedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      endedAt: new Date(now - 2 * 60 * 60 * 1000 + 18 * 60 * 1000).toISOString(),
      durationMinutes: 18,
      messageCount: 10,
      corrections: [
        {
          original: "I am working on this project since two years.",
          corrected: "I have been working on this project for two years.",
          explanation:
            "Use present perfect continuous with 'for' to describe a duration starting in the past and continuing now.",
          category: "Verb Tense",
        },
      ],
      vocabularyLearned: [
        {
          word: "proactive",
          partOfSpeech: "adjective",
          meaning: "Acting in advance to solve an expected challenge or seize an opportunity.",
          example: "I took a proactive approach by sharing a milestone plan before sprint kickoff.",
          mode: "HR Interview Practice",
          topic: "Job Interviews",
        },
        {
          word: "streamline",
          partOfSpeech: "verb",
          meaning: "To make a workflow simpler, faster, and more efficient.",
          example: "Our automation script helped streamline weekly student onboarding.",
          mode: "HR Interview Practice",
          topic: "Job Interviews",
        },
      ],
      summary: {
        overview:
          "Clear, structured STAR interview stories with strong ownership language and measurable results.",
        strengths: [
          "Used concrete project outcomes to support interview answers",
          "Maintained natural, confident pacing across follow-up questions",
        ],
        focusAreas: ["Using 'for' vs. 'since' accurately with present perfect continuous"],
        recommendedNextStep:
          "Practice two 90-second behavioral stories focused on teamwork under tight deadlines.",
      },
    },
    {
      id: `sample-sess-1d-${userId}`,
      userId,
      mode: "Technical Interview Practice",
      topic: "Technology",
      level: "Intermediate",
      startedAt: new Date(now - 1 * dayMs).toISOString(),
      endedAt: new Date(now - 1 * dayMs + 22 * 60 * 1000).toISOString(),
      durationMinutes: 22,
      messageCount: 12,
      corrections: [
        {
          original: "The database have high latency when many user connects.",
          corrected: "The database has high latency when many users connect.",
          explanation:
            "Match singular subjects ('database has') and plural subjects ('many users connect') with the right verb form.",
          category: "Subject-Verb Agreement",
        },
      ],
      vocabularyLearned: [
        {
          word: "trade-off",
          partOfSpeech: "noun",
          meaning: "A balanced compromise between two competing technical priorities.",
          example: "Caching improved response speed, though the trade-off was extra invalidation logic.",
          mode: "Technical Interview Practice",
          topic: "Technology",
        },
        {
          word: "resilient",
          partOfSpeech: "adjective",
          meaning: "Able to recover quickly and continue operating smoothly during faults.",
          example: "Adding retry logic made our payment webhook far more resilient.",
          mode: "Technical Interview Practice",
          topic: "Technology",
        },
      ],
      summary: {
        overview:
          "Strong technical clarity when explaining API bottlenecks and caching strategies step by step.",
        strengths: [
          "Explained cause-and-effect logically without jargon overload",
          "Used accurate software engineering terminology",
        ],
        focusAreas: ["Subject-verb agreement in longer multi-clause sentences"],
        recommendedNextStep:
          "Summarize a full-stack architecture project in under three minutes.",
      },
    },
    {
      id: `sample-sess-2d-${userId}`,
      userId,
      mode: "Friendly Conversation",
      topic: "Daily Life",
      level: "Intermediate",
      startedAt: new Date(now - 2 * dayMs).toISOString(),
      endedAt: new Date(now - 2 * dayMs + 15 * 60 * 1000).toISOString(),
      durationMinutes: 15,
      messageCount: 8,
      corrections: [
        {
          original: "I am go to college yesterday.",
          corrected: "I went to college yesterday.",
          explanation:
            "Use the simple past tense ('went') instead of 'am go' when referring to a completed action in the past ('yesterday').",
          category: "Verb Tense",
        },
      ],
      vocabularyLearned: [
        {
          word: "unwind",
          partOfSpeech: "verb",
          meaning: "To relax after a busy day of study or work.",
          example: "After evening classes, I like to unwind by taking a short walk.",
          mode: "Friendly Conversation",
          topic: "Daily Life",
        },
      ],
      summary: {
        overview:
          "Warm, engaging everyday conversation with smooth transitions between topics.",
        strengths: ["Natural conversational tone", "Asked thoughtful follow-up questions"],
        focusAreas: ["Irregular past tense verbs ('went', 'spoke', 'wrote')"],
        recommendedNextStep: "Narrate your weekend plans using both past and future time markers.",
      },
    },
    {
      id: `sample-sess-3d-${userId}`,
      userId,
      mode: "Professional Workplace Communication",
      topic: "General Conversation",
      level: "Intermediate",
      startedAt: new Date(now - 3 * dayMs).toISOString(),
      endedAt: new Date(now - 3 * dayMs + 25 * 60 * 1000).toISOString(),
      durationMinutes: 25,
      messageCount: 11,
      corrections: [
        {
          original: "We discussed about the deadline with manager.",
          corrected: "We discussed the deadline with our manager.",
          explanation:
            "'Discuss' is transitive and does not take 'about', and countable singular nouns need a determiner like 'our'.",
          category: "Prepositions",
        },
      ],
      vocabularyLearned: [
        {
          word: "alignment",
          partOfSpeech: "noun",
          meaning: "Shared agreement on priorities, goals, or next steps across a team.",
          example: "Let's hold a brief sync to confirm alignment before final submission.",
          mode: "Professional Workplace Communication",
          topic: "General Conversation",
        },
        {
          word: "bottleneck",
          partOfSpeech: "noun",
          meaning: "A point in a process where progress slows down.",
          example: "Manual review became our primary bottleneck before the demo.",
          mode: "Professional Workplace Communication",
          topic: "General Conversation",
        },
      ],
      summary: {
        overview:
          "Concise standup updates with clear signposting of completed tasks and current blockers.",
        strengths: ["Action-oriented phrasing", "Polite collaborative requests"],
        focusAreas: ["Omitting unnecessary prepositions after verbs like 'discuss'"],
        recommendedNextStep: "Practice politely proposing an alternative timeline in a meeting.",
      },
    },
    {
      id: `sample-sess-4d-${userId}`,
      userId,
      mode: "Public Speaking Practice",
      topic: "Education",
      level: "Intermediate",
      startedAt: new Date(now - 4 * dayMs).toISOString(),
      endedAt: new Date(now - 4 * dayMs + 14 * 60 * 1000).toISOString(),
      durationMinutes: 14,
      messageCount: 8,
      corrections: [
        {
          original: "Can you explain me how the model works?",
          corrected: "Could you explain to me how the model works?",
          explanation:
            "The verb 'explain' requires 'to' before the indirect object ('explain to me').",
          category: "Prepositions",
        },
      ],
      vocabularyLearned: [
        {
          word: "signpost",
          partOfSpeech: "verb",
          meaning: "To clearly guide listeners through the structure of a talk or answer.",
          example: "Starting with 'There are three key takeaways' helps signpost your presentation.",
          mode: "Public Speaking Practice",
          topic: "Education",
        },
      ],
      summary: {
        overview:
          "Well-paced academic presentation opening with clear transitions between key points.",
        strengths: ["Strong opening hook", "Clear summary statement"],
        focusAreas: ["Indirect object prepositions ('explain to me')"],
        recommendedNextStep: "Rehearse handling two unexpected audience Q&A questions.",
      },
    },
    {
      id: `sample-sess-5d-${userId}`,
      userId,
      mode: "HR Interview Practice",
      topic: "Job Interviews",
      level: "Intermediate",
      startedAt: new Date(now - 5 * dayMs).toISOString(),
      endedAt: new Date(now - 5 * dayMs + 20 * 60 * 1000).toISOString(),
      durationMinutes: 20,
      messageCount: 10,
      corrections: [
        {
          original: "I did many researches before choosing this field.",
          corrected: "I did a lot of research before choosing this field.",
          explanation:
            "'Research' is an uncountable noun in English, so use 'a lot of research' instead of 'many researches'.",
          category: "Articles & Determiners",
        },
      ],
      vocabularyLearned: [
        {
          word: "adaptable",
          partOfSpeech: "adjective",
          meaning: "Able to adjust effectively to new conditions, tools, or team priorities.",
          example: "Working across two internships taught me to stay adaptable in fast-moving teams.",
          mode: "HR Interview Practice",
          topic: "Job Interviews",
        },
      ],
      summary: {
        overview: "Confident career motivation explanation with clear enthusiasm for learning.",
        strengths: ["Clear personal narrative", "Good interview poise"],
        focusAreas: ["Uncountable nouns like 'research', 'feedback', and 'information'"],
        recommendedNextStep: "Practice answering 'Tell me about a challenge you overcame.'",
      },
    },
  ];
}

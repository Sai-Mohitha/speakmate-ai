import type {
  MatchBreakdownItem,
  MatchCriteria,
  MatchResult,
  PartnerProfile,
  ProficiencyLevel,
} from "../types";

const LEVEL_RANK: Record<ProficiencyLevel, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
};

/**
 * Transparent weighted partner compatibility scoring algorithm (100 points total):
 * 1. Proficiency Compatibility: 35 pts
 *    - Exact match: 35 pts
 *    - Adjacent level (1 step apart): 22 pts
 *    - Two steps apart: 8 pts
 * 2. Shared Topic / Interest: 30 pts
 *    - Matches partner's primary topic: 30 pts
 *    - Matches one of partner's secondary topics: 18 pts
 *    - General cross-topic exposure: 6 pts
 * 3. Similar Practice Purpose / Goal: 20 pts
 *    - Exact purpose match: 20 pts
 *    - Complementary goal match: 10 pts
 *    - Different goal: 4 pts
 * 4. Availability Overlap: 15 pts
 *    - Exact preferred slot match: 15 pts
 *    - Flexible schedule overlap: 10 pts
 *    - Different schedule: 3 pts
 */
export function computePartnerMatch(
  partner: PartnerProfile,
  criteria: MatchCriteria
): MatchResult {
  const breakdown: MatchBreakdownItem[] = [];

  // 1. Proficiency compatibility (35%)
  const levelDiff = Math.abs(
    LEVEL_RANK[partner.proficiencyLevel] - LEVEL_RANK[criteria.proficiencyLevel]
  );
  let levelScore = 8;
  let levelReason = `2 levels apart (${partner.proficiencyLevel} vs. ${criteria.proficiencyLevel})`;
  if (levelDiff === 0) {
    levelScore = 35;
    levelReason = `Exact match (${partner.proficiencyLevel})`;
  } else if (levelDiff === 1) {
    levelScore = 22;
    levelReason = `Adjacent level (${partner.proficiencyLevel} pairs well with ${criteria.proficiencyLevel})`;
  }
  breakdown.push({
    label: "Proficiency Compatibility",
    weight: 35,
    earned: levelScore,
    reason: levelReason,
  });

  // 2. Shared interests / topic (30%)
  let topicScore = 6;
  let topicReason = `Different primary focus (${partner.primaryTopic})`;
  if (partner.primaryTopic === criteria.topic) {
    topicScore = 30;
    topicReason = `Exact primary topic match (${criteria.topic})`;
  } else if (partner.secondaryTopics.includes(criteria.topic)) {
    topicScore = 18;
    topicReason = `Shared secondary interest (${criteria.topic})`;
  }
  breakdown.push({
    label: "Shared Interests",
    weight: 30,
    earned: topicScore,
    reason: topicReason,
  });

  // 3. Similar practice purpose (20%)
  const complementaryPairs: Record<string, string[]> = {
    "Job Interview Preparation": ["Workplace Meetings & Emails", "Confidence Building"],
    "Daily Speaking Fluency": ["Confidence Building", "Workplace Meetings & Emails"],
    "Workplace Meetings & Emails": ["Job Interview Preparation", "Academic Presentations"],
    "Academic Presentations": ["Confidence Building", "Workplace Meetings & Emails"],
    "Confidence Building": ["Daily Speaking Fluency", "Academic Presentations"],
  };
  let purposeScore = 4;
  let purposeReason = `Focused on ${partner.practicePurpose}`;
  if (partner.practicePurpose === criteria.purpose) {
    purposeScore = 20;
    purposeReason = `Shared goal (${criteria.purpose})`;
  } else if (complementaryPairs[criteria.purpose]?.includes(partner.practicePurpose)) {
    purposeScore = 10;
    purposeReason = `Complementary goal (${partner.practicePurpose})`;
  }
  breakdown.push({
    label: "Practice Goals",
    weight: 20,
    earned: purposeScore,
    reason: purposeReason,
  });

  // 4. Availability overlap (15%)
  let availabilityScore = 3;
  let availabilityReason = `Available ${partner.availability.join(", ")}`;
  if (partner.availability.includes(criteria.availability)) {
    availabilityScore = 15;
    availabilityReason = `Matches your slot (${criteria.availability})`;
  } else if (
    criteria.availability === "Flexible Schedule" ||
    partner.availability.includes("Flexible Schedule")
  ) {
    availabilityScore = 10;
    availabilityReason = "Flexible scheduling overlap";
  }
  breakdown.push({
    label: "Availability",
    weight: 15,
    earned: availabilityScore,
    reason: availabilityReason,
  });

  const totalScore = breakdown.reduce((sum, item) => sum + item.earned, 0);
  const statusLabel: MatchResult["statusLabel"] =
    totalScore >= 75 ? "Strong Match" : totalScore >= 52 ? "Good Match" : "Moderate Match";

  return {
    partner,
    score: totalScore,
    statusLabel,
    breakdown,
  };
}

export function rankDemoPartners(
  partners: PartnerProfile[],
  criteria: MatchCriteria
): MatchResult[] {
  return partners
    .map((partner) => computePartnerMatch(partner, criteria))
    .sort((a, b) => b.score - a.score);
}

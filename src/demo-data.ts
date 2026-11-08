import { CAMPUSES, type Professor } from "./model";

// Invented names and scores for UI/matching tests. Never presented as real RMP data.
export const DEMO_PROFESSORS: Professor[] = [
  { id: "demo-alex", legacyId: 1, firstName: "Alex", lastName: "Chen", schoolId: CAMPUSES.seattle.schoolId, department: "Informatics", rating: 4.6, difficulty: 3.2, wouldTakeAgain: 91, ratingCount: 42 },
  { id: "demo-jordan-a", legacyId: 2, firstName: "Jordan", lastName: "Lee", schoolId: CAMPUSES.seattle.schoolId, department: "Informatics", rating: 4.2, difficulty: 3.7, wouldTakeAgain: 84, ratingCount: 18 },
  { id: "demo-jordan-b", legacyId: 3, firstName: "Jordan", lastName: "Lee", schoolId: CAMPUSES.seattle.schoolId, department: "Computer Science", rating: 4.8, difficulty: 2.8, wouldTakeAgain: 96, ratingCount: 25 },
  { id: "demo-sam", legacyId: 4, firstName: "Sam", lastName: "Rivera", schoolId: CAMPUSES.seattle.schoolId, department: "Computer Science", rating: 4.4, difficulty: 3.6, wouldTakeAgain: 88, ratingCount: 29 },
  { id: "demo-other-campus", legacyId: 5, firstName: "Alex", lastName: "Chen", schoolId: CAMPUSES.bothell.schoolId, department: "Computing", rating: 3.9, difficulty: 4.1, wouldTakeAgain: 72, ratingCount: 11 },
];

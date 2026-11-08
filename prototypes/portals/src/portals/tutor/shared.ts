/**
 * Read-only reuse for the school portal (built after this one): the student
 * view and the class view, with their props. Both read the tutor portal's
 * mock data and the shared design system; the school portal passes its own
 * student or cohort id.
 */
export { StudentView, type StudentTab } from "./screens/Student";
export { ClassView } from "./screens/Class";
export { StudentHeader } from "./components/StudentHeader";
export { SkillMatrix } from "./components/Matrix";
export { RequirementRow } from "./components/Requirement";
export { Initials, InitialsStack } from "./components/Initials";
export { CheckItem, ChecklistHead } from "./components/Checklist";
export { Timeline } from "./components/Timeline";
export { TIcon, TUTOR_ICON_PATHS } from "./icons";
export { tutorLevelsFor, missesFor, classFocus } from "./mock-tests";
export { requirementsFor, isSlipping } from "./mock-work";

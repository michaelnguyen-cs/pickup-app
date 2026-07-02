// Navigation type definitions
// Stack params map to screen components 1:1

// CreateRun params use string[] / string to stay JSON-serializable across the stack.
// Cast to SportId / SportId[] inside CreateRunScreen.
export type RootStackParamList = {
  // Onboarding flow (rendered only when !hasOnboarded)
  OnboardingWelcome: undefined;
  OnboardingLocation: undefined;
  OnboardingSports: undefined;
  OnboardingSkillPrefs: undefined;
  // Main app — tab wrapper + modal screens
  MainTabs: undefined;
  Explore: undefined;
  Saved: undefined;
  Profile: undefined;
  VenueDetail: { venueId: string };
  RunDetail: { runId: string };
  // Auth modals — presented over the main app when a protected action needs a user
  SignIn: undefined;
  SignUp: undefined;
  // Admin-only — access enforced server-side by public.is_admin() on the RPCs this screen calls
  AdminCandidateReview: undefined;
  // App-level device/permission settings (distinct from user prefs in ProfileScreen)
  Settings: undefined;
  // Run creation modal — must be reached from a selected venue (enforced by caller)
  CreateRun: { venueId: string; venueName: string; sports: string[]; defaultSport?: string };
  // Age gate — shown when user is signed in but has not confirmed age.
  // Stores the pending CreateRun params so it can replace itself with CreateRun on confirm.
  AgeConfirm: { pendingCreateRun: { venueId: string; venueName: string; sports: string[]; defaultSport?: string } };
};

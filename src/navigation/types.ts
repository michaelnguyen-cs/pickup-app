// Navigation type definitions
// Stack params map to screen components 1:1

export type RootStackParamList = {
  // Onboarding flow (rendered only when !hasOnboarded)
  OnboardingWelcome: undefined;
  OnboardingLocation: undefined;
  OnboardingSports: undefined;
  OnboardingSkillPrefs: undefined;
  // Main app — tab wrapper + modal screens
  Home: undefined;
  Explore: undefined;
  Saved: undefined;
  Profile: undefined;
  VenueDetail: { venueId: string };
  RunDetail: { runId: string };
  // Auth modals — presented over the main app when a protected action needs a user
  SignIn: undefined;
  SignUp: undefined;
};

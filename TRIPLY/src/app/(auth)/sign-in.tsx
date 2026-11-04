import { SignInScreen } from "@/features/auth/sign-in-screen";
import { useSocialAuth } from "@/features/auth/use-social-auth";

export default function SignIn() {
  const { signInWithApple, signInWithGoogle } = useSocialAuth();

  return (
    <SignInScreen onApplePress={signInWithApple} onGooglePress={signInWithGoogle} />
  );
}

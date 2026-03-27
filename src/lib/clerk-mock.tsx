/**
 * Mock @clerk/clerk-react for local development without valid Clerk API key.
 * DELETE THIS FILE after UX audit is complete.
 */
import { createContext, useContext, ReactNode } from 'react';

const noop = () => {};
const asyncNoop = async () => {};

// Mock auth context
const MockAuthContext = createContext({
  isLoaded: true,
  isSignedIn: false,
  userId: null as string | null,
  sessionId: null as string | null,
  orgId: null as string | null,
  orgRole: null as string | null,
  orgSlug: null as string | null,
  actor: null,
  has: () => false,
  signOut: asyncNoop,
  getToken: async () => null as string | null,
});

const MockUserContext = createContext({
  isLoaded: true,
  isSignedIn: false,
  user: null as any,
});

const MockClerkContext = createContext({
  openSignIn: noop,
  openSignUp: noop,
  openUserProfile: noop,
  signOut: asyncNoop,
  session: null,
  client: null,
  loaded: true,
});

export function ClerkProvider({ children }: { children: ReactNode; publishableKey?: string; afterSignOutUrl?: string }) {
  return <>{children}</>;
}

export function useAuth() {
  return useContext(MockAuthContext);
}

export function useUser() {
  return useContext(MockUserContext);
}

export function useClerk() {
  return useContext(MockClerkContext);
}

export function useSession() {
  return { isLoaded: true, isSignedIn: false, session: null };
}

export function useOrganization() {
  return { isLoaded: true, organization: null, membership: null };
}

export function useSignIn() {
  return { isLoaded: true, signIn: null, setActive: asyncNoop };
}

export function useSignUp() {
  return { isLoaded: true, signUp: null, setActive: asyncNoop };
}

// Mock components
export function SignInButton({ children }: { children?: ReactNode; mode?: string }) {
  return <>{children || <button>Sign In</button>}</>;
}

export function SignUpButton({ children }: { children?: ReactNode; mode?: string }) {
  return <>{children || <button>Sign Up</button>}</>;
}

export function UserButton(_props: any) {
  return <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ddd', display: 'inline-block' }} />;
}

export function SignIn(_props: any) {
  return <div>Sign In (mock)</div>;
}

export function SignUp(_props: any) {
  return <div>Sign Up (mock)</div>;
}

export function UserProfile(_props: any) {
  return <div>User Profile (mock)</div>;
}

export function SignedIn({ children }: { children: ReactNode }) {
  return null; // Not signed in during audit
}

export function SignedOut({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function RedirectToSignIn() {
  return <div>Redirecting to sign in...</div>;
}

export function ClerkLoaded({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function ClerkLoading({ children }: { children: ReactNode }) {
  return null;
}

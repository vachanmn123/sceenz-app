import React, {
	createContext,
	PropsWithChildren,
	useContext,
	useEffect,
	useState,
} from "react";
import { SplashScreen, useRouter } from "expo-router";

import { User } from "@supabase/supabase-js";
import { supabase } from "@/config/supabase";

SplashScreen.preventAutoHideAsync();

type AuthState = {
	initialized: boolean;
	user: User | null;
	signUp: (email: string, password: string) => Promise<void>;
	signIn: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthState>({
	initialized: false,
	user: null,
	signUp: async () => {},
	signIn: async () => {},
	signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
	const [initialized, setInitialized] = useState(false);
	const [user, setUser] = useState<User | null>(null);
	const router = useRouter();

	const signUp = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
		});

		if (error) {
			console.error("Error signing up:", error);
			return;
		}

		// After sign up, try to sign in to get the user object
		const { data: signInData, error: signInError } =
			await supabase.auth.signInWithPassword({
				email,
				password,
			});

		if (signInError) {
			console.error("Error signing in after sign up:", signInError);
			return;
		}

		if (signInData.user) {
			setUser(signInData.user);
			console.log("User signed up:", signInData.user);
		} else {
			console.log("No user returned from sign up");
		}
	};

	const signIn = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			console.error("Error signing in:", error);
			return;
		}

		if (data.user) {
			setUser(data.user);
			console.log("User signed in:", data.user);
		} else {
			console.log("No user returned from sign in");
		}
	};

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();

		if (error) {
			console.error("Error signing out:", error);
			return;
		} else {
			setUser(null);
			console.log("User signed out");
		}
	};

	useEffect(() => {
		supabase.auth.getUser().then(({ data, error }) => {
			if (error) {
				setUser(null);
			} else {
				setUser(data.user);
			}
		});

		const { data: listener } = supabase.auth.onAuthStateChange(
			(_event, session) => {
				setUser(session?.user ?? null);
			},
		);

		setInitialized(true);

		return () => {
			listener?.subscription.unsubscribe();
		};
	}, []);

	useEffect(() => {
		if (initialized) {
			SplashScreen.hideAsync();
			if (user) {
				router.replace("/");
			} else {
				router.replace("/welcome");
			}
		}
		// eslint-disable-next-line
	}, [initialized, user]);

	return (
		<AuthContext.Provider
			value={{
				initialized,
				user,
				signUp,
				signIn,
				signOut,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

import { useEffect, useState, useMemo, useCallback } from "react";
import {
	View,
	TextInput,
	ScrollView,
	StyleSheet,
	Dimensions,
	ActivityIndicator,
	Pressable,
	RefreshControl,
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

type Event = {
	id: string | number;
	title: string;
	location: string;
	latitude: number;
	longitude: number;
	distance?: number;
	tag: string;
};

const DEFAULT_LOCATION = {
	latitude: 14.4443949,
	longitude: 75.9027655,
	latitudeDelta: 0.0922,
	longitudeDelta: 0.0421,
};

export default function Home() {
	const router = useRouter();
	const [location, setLocation] = useState<Location.LocationObject | null>(
		null,
	);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
		null,
	);
	const [initialLocation, setInitialLocation] = useState(DEFAULT_LOCATION);
	const [refreshing, setRefreshing] = useState(false);

	// Get user location permissions
	useEffect(() => {
		(async () => {
			try {
				let { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== "granted") {
					setErrorMsg("Permission to access location was denied");
					setPermissionGranted(false);
					return;
				}

				setPermissionGranted(true);

				// Only try to get location if permission is granted
				try {
					let loc = await Location.getCurrentPositionAsync({
						accuracy: Location.Accuracy.Balanced,
					});
					setLocation(loc);
				} catch (locationErr) {
					console.error("Location error:", locationErr);
					setErrorMsg("Failed to get location. Using default location.");
					// Don't fail completely, continue with default location
				}
			} catch (err) {
				console.error("Permission error:", err);
				setErrorMsg("Failed to request location permissions");
				setPermissionGranted(false);
			}
		})();
	}, []);

	// Update map region when location changes
	useEffect(() => {
		if (location) {
			setInitialLocation({
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
				latitudeDelta: 0.0922,
				longitudeDelta: 0.0421,
			});
		}
	}, [location]);

	// Calculate distance in kilometers between two coordinates
	const calculateDistance = useCallback(
		(lat1: number, lon1: number, lat2: number, lon2: number) => {
			const R = 6371; // Radius of the Earth in km
			const dLat = deg2rad(lat2 - lat1);
			const dLon = deg2rad(lon2 - lon1);
			const a =
				Math.sin(dLat / 2) * Math.sin(dLat / 2) +
				Math.cos(deg2rad(lat1)) *
					Math.cos(deg2rad(lat2)) *
					Math.sin(dLon / 2) *
					Math.sin(dLon / 2);
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			return R * c;
		},
		[],
	);

	const deg2rad = (deg: number) => deg * (Math.PI / 180);

	// Fetch events
	const {
		data: events,
		isLoading,
		refetch,
	} = useQuery<Event[]>({
		queryKey: ["events", initialLocation],
		queryFn: async () => {
			const { data, error } = await supabase.from("Events").select("*");
			if (error) {
				console.error("Error fetching events:", error);
				return [];
			}
			// Filter out events with missing coordinates
			const validEvents = (data as Event[]).filter(
				(event) =>
					typeof event.latitude === "number" &&
					typeof event.longitude === "number" &&
					!isNaN(event.latitude) &&
					!isNaN(event.longitude),
			);
			// Add distance calculation to each event
			const eventsWithDistance = validEvents.map((event) => ({
				...event,
				distance: calculateDistance(
					initialLocation.latitude,
					initialLocation.longitude,
					event.latitude,
					event.longitude,
				),
			}));
			// Sort by closest first
			return eventsWithDistance.sort(
				(a, b) => (a.distance ?? 0) - (b.distance ?? 0),
			);
		},
		enabled: true, // Always fetch events, even if using default location
	});

	// Handle refresh
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await refetch();
		setRefreshing(false);
	}, [refetch]);

	// Filter events based on search query
	const filteredEvents = useMemo(() => {
		if (!events) return [];
		if (!searchQuery.trim()) return events;
		const lowerQuery = searchQuery.toLowerCase();
		return events.filter(
			(event) =>
				event.tag?.toLowerCase().includes(lowerQuery) ||
				event.title.toLowerCase().includes(lowerQuery) ||
				event.location.toLowerCase().includes(lowerQuery),
		);
	}, [events, searchQuery]);

	return (
		<View className="flex-1 bg-background">
			{/* Map Section (Top Half) */}
			<View className="h-1/2 w-full">
				{errorMsg && permissionGranted === false ? (
					<View className="flex-1 items-center justify-center">
						<Text className="text-red-500">{errorMsg}</Text>
					</View>
				) : (
					<MapView
						provider={PROVIDER_GOOGLE}
						style={styles.map}
						initialRegion={initialLocation}
						showsUserLocation={permissionGranted === true}
						showsMyLocationButton={permissionGranted === true}
						loadingEnabled={true}
						loadingIndicatorColor="#666"
					></MapView>
				)}
			</View>

			{/* Drawer Section (Bottom Half) */}
			<View className="h-1/2 bg-card rounded-t-3xl p-4 shadow-lg">
				{/* Search Bar */}
				<View className="flex-row items-center bg-background rounded-full px-4 py-2 mb-4 border border-border">
					<Ionicons name="search" size={20} color="#666" />
					<TextInput
						className="flex-1 ml-2 text-foreground"
						placeholder="Search locations..."
						placeholderTextColor="#666"
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
				</View>

				{/* Drawer Content */}
				<ScrollView
					className="flex-1"
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							colors={["#666"]}
							tintColor="#666"
						/>
					}
				>
					<H1 className="text-xl mb-2">Nearby Events</H1>
					<Muted className="mb-4">
						{errorMsg && permissionGranted === false
							? "Using default location"
							: "Explore events around you"}
					</Muted>

					{isLoading ? (
						<ActivityIndicator size="small" color="#666" />
					) : filteredEvents.length === 0 ? (
						<Text className="text-center text-muted-foreground my-4">
							No events found
						</Text>
					) : (
						filteredEvents.map((item) => (
							<View
								key={item.id}
								className="bg-background p-4 rounded-lg mb-3 border border-border"
							>
								<Pressable onPress={() => router.push(`/event/${item.id}`)}>
									<Text className="font-bold text-lg">{item.title}</Text>
									{item.tag && (
										<View className="flex-row items-center mt-1">
											<Ionicons name="pricetag" size={16} color="#666" />
											<Text className="ml-1 text-muted-foreground">
												{item.tag}
											</Text>
										</View>
									)}
									<Text className="text-muted-foreground">{item.location}</Text>
									<Text className="text-primary">
										{item.distance?.toFixed(1)} km away
									</Text>
								</Pressable>
							</View>
						))
					)}
				</ScrollView>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	map: {
		width: Dimensions.get("window").width,
		height: "100%",
	},
});

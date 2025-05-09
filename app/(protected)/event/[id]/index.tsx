import { useEffect, useState } from "react";
import {
	View,
	StyleSheet,
	Dimensions,
	ScrollView,
	ActivityIndicator,
	Alert,
	Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/config/supabase";
import { H1, H2, Muted } from "@/components/ui/typography";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { RegisterModal } from "@/components/RegisterModal";
import QRCode from "react-native-qrcode-svg";

type Event = {
	id: string | number;
	title: string;
	location: string;
	latitude: number;
	longitude: number;
	description?: string;
	date?: string;
	time?: string;
	participantLimit?: number;
	ticketPrice?: number | null;
};

type Ticket = {
	id: string;
	event: string | number;
	name: string;
	email: string;
	created_at: string;
};

export default function EventDetail() {
	const { id } = useLocalSearchParams();
	const router = useRouter();
	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [ticket, setTicket] = useState<Ticket | null>(null);

	useEffect(() => {
		async function fetchEvent() {
			try {
				const { data, error } = await supabase
					.from("Events")
					.select("*")
					.eq("id", id)
					.single();

				if (error) {
					throw error;
				}

				setEvent(data as Event);

				// Check if the user already has a ticket
				const { data: userData, error: userError } =
					await supabase.auth.getUser();

				if (userError || !userData.user) {
					console.log("User not logged in or error fetching user");
					return;
				}

				// Get user email
				const userEmail = userData.user.email;

				if (userEmail) {
					// Check if user has a ticket for this event
					const { data: ticketData, error: ticketError } = await supabase
						.from("Tickets")
						.select("*")
						.eq("event", id)
						.eq("email", userEmail)
						.single();

					if (ticketError && ticketError.code !== "PGRST116") {
						// PGRST116 is "no rows returned" error
						console.error("Error checking for existing ticket:", ticketError);
					}

					if (ticketData) {
						setTicket(ticketData as Ticket);
					}
				}
			} catch (err) {
				console.error("Error fetching event:", err);
				setError("Failed to load event details");
			} finally {
				setLoading(false);
			}
		}

		fetchEvent();
	}, [id]);

	const handleRegister = () => {
		setShowModal(true);
	};

	const handleRegistrationComplete = async (name: string, email: string) => {
		setShowModal(false);

		try {
			// If there's a ticket price, handle payment flow
			if (event?.ticketPrice) {
				// In a real app, you would redirect to a payment gateway
				Alert.alert(
					"Payment Required",
					`This would redirect to payment for ${event.ticketPrice} INR`,
					[{ text: "OK" }],
				);
				return;
			}

			// For free events, register directly
			const { data: userData, error: userError } =
				await supabase.auth.getUser();

			if (userError || !userData.user) {
				Alert.alert("Error", "You must be logged in to register");
				return;
			}

			// Add registration to database
			const { data: ticketData, error: registrationError } = await supabase
				.from("Tickets")
				.insert({
					buyer: userData.user.id,
					event: id,
					email,
					name,
				})
				.select()
				.single();

			if (registrationError) {
				throw registrationError;
			}

			// Update the ticket state
			setTicket(ticketData as Ticket);

			Alert.alert(
				"Success",
				"You have successfully registered for this event!",
				[{ text: "OK" }],
			);
		} catch (err) {
			console.error("Registration error:", err);
			Alert.alert(
				"Registration Failed",
				"There was a problem with your registration. Please try again.",
				[{ text: "OK" }],
			);
		}
	};

	if (loading) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" color="#666" />
			</View>
		);
	}

	if (error || !event) {
		return (
			<View className="flex-1 items-center justify-center bg-background p-4">
				<Text className="text-red-500 text-lg mb-4">
					{error || "Event not found"}
				</Text>
				<Button onPress={() => router.back()}>Go Back</Button>
			</View>
		);
	}

	const mapRegion = {
		latitude: event.latitude,
		longitude: event.longitude,
		latitudeDelta: 0.01,
		longitudeDelta: 0.01,
	};

	return (
		<View className="flex-1 bg-background">
			{/* Map View */}
			<View className="h-1/3 w-full">
				<MapView
					provider={PROVIDER_GOOGLE}
					style={styles.map}
					initialRegion={mapRegion}
					loadingEnabled={true}
				>
					<Marker
						coordinate={{
							latitude: event.latitude,
							longitude: event.longitude,
						}}
						title={event.title}
						description={event.location}
						pinColor="#FF6347"
					/>
				</MapView>
				<Button
					className="absolute top-4 left-4 bg-background/80 rounded-full w-10 h-10 items-center justify-center"
					onPress={() => router.back()}
				>
					<Ionicons name="arrow-back" size={24} color="#000" />
				</Button>
			</View>

			{/* Event Details */}
			<ScrollView className="flex-1 p-4">
				<H1 className="mb-2">{event.title}</H1>
				<View className="flex-row items-center mb-4">
					<Ionicons name="location" size={18} color="#666" />
					<Text className="ml-2 text-muted-foreground">{event.location}</Text>
				</View>

				{event.date && (
					<View className="flex-row items-center mb-4">
						<Ionicons name="calendar" size={18} color="#666" />
						<Text className="ml-2 text-muted-foreground">
							{event.date} {event.time ? `at ${event.time}` : ""}
						</Text>
					</View>
				)}

				{/* Additional Event Information */}
				{event.participantLimit && (
					<View className="flex-row items-center mb-4">
						<Ionicons name="people" size={18} color="#666" />
						<Text className="ml-2 text-muted-foreground">
							Limited to {event.participantLimit} participants
						</Text>
					</View>
				)}

				{event.ticketPrice !== undefined && (
					<View className="flex-row items-center mb-4">
						<Ionicons name="ticket" size={18} color="#666" />
						<Text className="ml-2 text-muted-foreground">
							{event.ticketPrice ? `INR ${event.ticketPrice}` : "Free"}
						</Text>
					</View>
				)}

				<H2 className="mt-4 mb-2">About</H2>
				<Text className="text-foreground mb-6">
					{event.description || "No description available for this event."}
				</Text>

				{ticket ? (
					<View className="bg-gray-100 p-4 rounded-lg mb-8">
						<View className="items-center mb-4">
							<H2 className="text-green-600 mb-2">You&apos;re Registered!</H2>
							<Text className="text-center mb-1">Ticket ID: {ticket.id}</Text>
							<Text className="text-center mb-4">
								Registered as: {ticket.name}
							</Text>

							<View className="bg-white p-4 rounded-lg">
								<QRCode value={`${event.id}:${ticket.id}`} size={150} />
							</View>

							<Muted className="text-center mt-4">
								Present this QR code at the event entrance
							</Muted>
						</View>
					</View>
				) : (
					<Button className="mt-4 mb-8" onPress={handleRegister}>
						<Text className="text-white font-bold">I&apos;m Interested</Text>
					</Button>
				)}
			</ScrollView>

			{/* Registration Modal */}
			<RegisterModal
				isVisible={showModal}
				onClose={() => setShowModal(false)}
				onSubmit={handleRegistrationComplete}
				hasTicketPrice={!!event.ticketPrice}
				price={event.ticketPrice}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	map: {
		width: Dimensions.get("window").width,
		height: "100%",
	},
});

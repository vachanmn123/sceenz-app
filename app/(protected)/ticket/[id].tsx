import {
	View,
	ScrollView,
	TextInput,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Text } from "@/components/ui/text";
import { H2 } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/config/supabase";
import { format } from "date-fns";
import {
	CalendarIcon,
	Clock,
	MapPin,
	Share2Icon,
	ChevronLeft,
	Star,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { useState } from "react";

export default function TicketDetails() {
	const { id } = useLocalSearchParams();
	const queryClient = useQueryClient();
	const [rating, setRating] = useState(0);
	const [review, setReview] = useState("");
	const [reviewSubmitted, setReviewSubmitted] = useState(false);

	const { data: ticket, isLoading } = useQuery({
		queryKey: ["ticket", id],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("Tickets")
				.select("*, Events(id, title, location, dateTime, description)")
				.eq("id", id)
				.single();

			if (error) {
				console.log(error);
				throw new Error(error.message);
			}

			return data;
		},
	});

	const { data: existingReview } = useQuery({
		queryKey: ["review", id],
		queryFn: async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return null;

			const { data, error } = await supabase
				.from("Ratings")
				.select("*")
				.eq("event", ticket?.Events?.id)
				.eq("reviewer", user.id)
				.single();

			if (error && error.code !== "PGSQL_NO_ROWS_RETURNED") {
				console.log(error);
			}

			return data;
		},
		enabled: !!ticket?.Events?.id,
	});

	const submitReview = useMutation({
		mutationFn: async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("You must be logged in to submit a review");
			if (!rating) throw new Error("Please select a rating");

			const reviewData = {
				reviewer: user.id,
				event: ticket.Events.id,
				review: review.trim(),
				stars: rating,
			};

			const { data, error } = await supabase
				.from("Ratings")
				.upsert(reviewData)
				.select();

			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			setReviewSubmitted(true);
			setReview("");
			queryClient.invalidateQueries({
				queryKey: ["review", ticket?.Events?.id],
			});
		},
	});

	const handleSubmitReview = () => {
		submitReview.mutate();
	};

	const renderStars = () => {
		return (
			<View className="flex-row mb-4">
				{[1, 2, 3, 4, 5].map((starValue) => (
					<TouchableOpacity
						key={starValue}
						onPress={() => setRating(starValue)}
						className="mr-2"
					>
						<Star
							size={30}
							fill={starValue <= rating ? "#FFD700" : "transparent"}
							color={starValue <= rating ? "#FFD700" : "#71717a"}
						/>
					</TouchableOpacity>
				))}
			</View>
		);
	};

	const handleShare = () => {
		// Implement share functionality here
		console.log("Share ticket");
	};

	if (isLoading) {
		return (
			<View className="flex-1 justify-center items-center">
				<Text>Loading ticket information...</Text>
			</View>
		);
	}

	if (!ticket) {
		return (
			<View className="flex-1 justify-center items-center p-4">
				<Text className="text-center mb-4">Ticket not found</Text>
				<Button onPress={() => router.back()}>Go Back</Button>
			</View>
		);
	}

	const event = ticket.Events;

	return (
		<>
			<Stack.Screen
				options={{
					headerTitle: "Ticket Details",
					headerLeft: () => (
						<Button variant="ghost" onPress={() => router.back()}>
							<ChevronLeft size={20} className="" />
							<Text className="ml-1">Back</Text>
						</Button>
					),
					headerRight: () => (
						<Button variant="ghost" onPress={handleShare}>
							<Share2Icon size={20} className="text-foreground" />
						</Button>
					),
				}}
			/>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
				className="bg-background"
				keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
			>
				<ScrollView className="flex-1 bg-background">
					<View className="bg-primary p-8 items-center">
						<View className="pt-12 rounded-lg">
							<QRCode
								value={`TICKET:${ticket.id}`}
								size={200}
								backgroundColor="white"
								color="black"
							/>
						</View>
						<Text className="mt-4 text-white font-medium">
							Ticket #{ticket.id}
						</Text>
					</View>

					<View className="p-6 gap-6">
						<View>
							<H2>{event?.title || ticket.event_name}</H2>
							{event?.dateTime && (
								<View className="flex-row items-center mt-2">
									<CalendarIcon
										size={16}
										className="text-muted-foreground mr-2"
									/>
									<Text className="text-muted-foreground">
										{format(new Date(event.dateTime), "EEEE, MMMM d, yyyy")}
									</Text>
								</View>
							)}
							{event?.dateTime && (
								<View className="flex-row items-center mt-2">
									<Clock size={16} className="text-muted-foreground mr-2" />
									<Text className="text-muted-foreground">
										{format(new Date(event.dateTime), "h:mm a")}
									</Text>
								</View>
							)}
							{event?.location && (
								<View className="flex-row items-center mt-2">
									<MapPin size={16} className="text-muted-foreground mr-2" />
									<Text className="text-muted-foreground">
										{event.location}
									</Text>
								</View>
							)}
						</View>

						<View className="h-px bg-border" />

						<View>
							<Text className="font-medium mb-1">Ticket Information</Text>
							<View className="flex-row justify-between mt-2">
								<Text className="text-muted-foreground">Ticket ID</Text>
								<Text>{ticket.id}</Text>
							</View>
							<View className="flex-row justify-between mt-2">
								<Text className="text-muted-foreground">Purchase Date</Text>
								<Text>
									{format(new Date(ticket.created_at), "MMM d, yyyy")}
								</Text>
							</View>
							{ticket.ticket_type && (
								<View className="flex-row justify-between mt-2">
									<Text className="text-muted-foreground">Ticket Type</Text>
									<Text>{ticket.ticket_type}</Text>
								</View>
							)}
							{ticket.amount && (
								<View className="flex-row justify-between mt-2">
									<Text className="text-muted-foreground">Amount Paid</Text>
									<Text>${ticket.amount.toFixed(2)}</Text>
								</View>
							)}
						</View>

						{event?.description && (
							<>
								<View className="h-px bg-border" />
								<View>
									<Text className="font-medium mb-1">Event Description</Text>
									<Text className="text-muted-foreground">
										{event.description}
									</Text>
								</View>
							</>
						)}

						{/* Review Section */}
						<View className="h-px bg-border" />
						<View>
							<Text className="font-medium mb-3">Leave a Review</Text>

							{existingReview ? (
								<View>
									<Text className="text-muted-foreground mb-2">
										You&apos;ve already rated this event:
									</Text>
									<View className="flex-row mb-2">
										{[1, 2, 3, 4, 5].map((starValue) => (
											<Star
												key={starValue}
												size={20}
												fill={
													starValue <= existingReview.stars
														? "#FFD700"
														: "transparent"
												}
												color={
													starValue <= existingReview.stars
														? "#FFD700"
														: "#71717a"
												}
											/>
										))}
									</View>
									{existingReview.review && (
										<Text className="text-muted-foreground italic">
											&quot;{existingReview.review}&quot;
										</Text>
									)}
								</View>
							) : reviewSubmitted ? (
								<View className="items-center py-4">
									<Text className="text-center text-primary mb-2">
										Thank you for your review!
									</Text>
								</View>
							) : null}

							{!reviewSubmitted && !existingReview && (
								<>
									<Text className="mb-1 text-muted-foreground">Rating:</Text>
									{renderStars()}

									<Text className="mb-1 text-muted-foreground">Comments:</Text>
									<TextInput
										className="border border-input rounded-md p-2 h-36 text-white"
										placeholder="Share your experience..."
										multiline
										numberOfLines={4}
										textAlignVertical="top"
										value={review}
										onChangeText={setReview}
									/>

									<Button
										onPress={handleSubmitReview}
										disabled={submitReview.isPending || rating === 0}
									>
										<Text>
											{submitReview.isPending
												? "Submitting..."
												: existingReview
													? "Update Review"
													: "Submit Review"}
										</Text>
									</Button>

									{submitReview.isError && (
										<Text className="mt-2 text-destructive">
											Error: {submitReview.error.message}
										</Text>
									)}
								</>
							)}
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</>
	);
}

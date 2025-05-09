import { View, Pressable, RefreshControl, ScrollView } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/config/supabase";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin } from "lucide-react-native";
import { useState } from "react";

export default function Tickets() {
	const [refreshing, setRefreshing] = useState(false);

	const {
		data: tickets,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["tickets"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("Tickets")
				.select("*, Events(id, title, location, dateTime)")
				.order("created_at", { ascending: false });

			console.log(data);

			if (error) {
				console.log(error);
				throw new Error(error.message);
			}

			return data;
		},
	});

	const onRefresh = async () => {
		setRefreshing(true);
		await refetch();
		setRefreshing(false);
	};

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="py-24 px-5 gap-y-4"
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
			}
		>
			<H1 className="">Your Tickets</H1>
			<Muted className="">
				Manage your tickets and view your purchase history.
			</Muted>

			{isLoading && <Text className="text-center">Loading...</Text>}
			{tickets?.length === 0 && (
				<View className="items-center justify-center py-10">
					<Text className="text-center text-7xl py-2">🙁</Text>
					<Text className="text-center mb-2">
						You haven&apos;t purchased any tickets yet.
					</Text>
					<Button onPress={() => router.push("/")}>
						<Text>Browse Events</Text>
					</Button>
				</View>
			)}

			<View className="gap-y-4">
				{tickets?.map((ticket) => (
					<Pressable
						key={ticket.id}
						className="bg-card rounded-xl overflow-hidden shadow border-gray-600 border-2 p-2"
						onPress={() => router.push(`/ticket/${ticket.id}`)}
					>
						<View className="border-b border-border">
							<View className="p-4 flex-row justify-between items-center">
								<View className="flex-1">
									<Text className="text-lg font-semibold">
										{ticket.Events?.title || ticket.event_name}
									</Text>
									{ticket.Events?.dateTime && (
										<View className="flex-row items-center mt-1">
											<CalendarIcon
												size={14}
												className="text-muted-foreground mr-1"
											/>
											<Text className="text-xs text-muted-foreground">
												{format(
													new Date(ticket.Events?.dateTime),
													"MMM d, yyyy",
												)}
											</Text>
											<Clock
												size={14}
												className="text-muted-foreground ml-3 mr-1"
											/>
											<Text className="text-xs text-muted-foreground">
												{format(new Date(ticket.Events?.dateTime), "h:mm a")}
											</Text>
										</View>
									)}
									{ticket.Events?.location && (
										<View className="flex-row items-center mt-1">
											<MapPin
												size={14}
												className="text-muted-foreground mr-1"
											/>
											<Text className="text-xs text-muted-foreground">
												{ticket.Events?.location}
											</Text>
										</View>
									)}
								</View>
							</View>
						</View>
						<View className="p-4 flex-row items-center justify-between">
							<View>
								<Text className="text-sm text-muted-foreground">
									Ticket #{ticket.id}
								</Text>
								<Text className="text-xs text-muted-foreground">
									Purchased on{" "}
									{format(new Date(ticket.created_at), "MMM d, yyyy")}
								</Text>
							</View>
							<Text className="text-sm font-medium text-primary">
								View Ticket →
							</Text>
						</View>
					</Pressable>
				))}
			</View>
		</ScrollView>
	);
}

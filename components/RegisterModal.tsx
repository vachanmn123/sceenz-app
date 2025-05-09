import React, { useState } from "react";
import { View, Modal, TextInput, StyleSheet } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H2 } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";

interface RegisterModalProps {
	isVisible: boolean;
	onClose: () => void;
	onSubmit: (name: string, email: string) => void;
	hasTicketPrice: boolean;
	price?: number | null;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
	isVisible,
	onClose,
	onSubmit,
	hasTicketPrice,
	price,
}) => {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");

	const handleSubmit = () => {
		if (!name.trim() || !email.trim()) {
			alert("Please fill in all fields");
			return;
		}

		// Validate email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			alert("Please enter a valid email address");
			return;
		}

		onSubmit(name, email);
		// Reset form
		setName("");
		setEmail("");
	};

	return (
		<Modal
			animationType="slide"
			transparent={true}
			visible={isVisible}
			onRequestClose={onClose}
		>
			<View style={styles.centeredView}>
				<View style={styles.modalView}>
					<View style={styles.modalHeader}>
						<H2 className="text-black">Register for Event</H2>
						<Button onPress={onClose} className="p-0">
							<Ionicons name="close" size={24} color="#000" />
						</Button>
					</View>

					<Text className="mb-4 text-black">
						{hasTicketPrice
							? `This event requires payment of ${price || 0} INR.`
							: "Register to confirm your spot for this free event."}
					</Text>

					<TextInput
						style={styles.input}
						placeholder="Your Name"
						value={name}
						onChangeText={setName}
						className="placeholder:text-muted-foreground"
					/>

					<TextInput
						style={styles.input}
						placeholder="Your Email"
						value={email}
						keyboardType="email-address"
						autoCapitalize="none"
						onChangeText={setEmail}
						className="placeholder:text-muted-foreground"
					/>

					<View style={styles.buttonContainer}>
						<Button className="flex-1 mr-2" onPress={onClose}>
							<Text>Cancel</Text>
						</Button>
						<Button
							className="flex-1 ml-2"
							variant="outline"
							onPress={handleSubmit}
						>
							<Text className="">
								{hasTicketPrice ? "Proceed to Payment" : "Register"}
							</Text>
						</Button>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	centeredView: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	modalView: {
		width: "90%",
		backgroundColor: "white",
		borderRadius: 12,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	input: {
		width: "100%",
		height: 50,
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 8,
		marginBottom: 16,
		paddingHorizontal: 12,
	},
	buttonContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 16,
	},
});

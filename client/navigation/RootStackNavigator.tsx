import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import QuizSessionScreen from "@/screens/QuizSessionScreen";
import SessionSummaryScreen from "@/screens/SessionSummaryScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import TopicDetailScreen from "@/screens/TopicDetailScreen";

export type RootStackParamList = {
  Main: undefined;
  QuizSession: { topicId?: string };
  SessionSummary: {
    score: number;
    total: number;
    topicId?: string;
    answers: { questionId: string; correct: boolean; correctAnswer: string }[];
  };
  Settings: undefined;
  TopicDetail: { topicId: string; topicName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false, title: "" }}
      />
      <Stack.Screen
        name="QuizSession"
        component={QuizSessionScreen}
        options={{
          presentation: "modal",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="SessionSummary"
        component={SessionSummaryScreen}
        options={{
          presentation: "modal",
          gestureEnabled: false,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="TopicDetail" component={TopicDetailScreen} />
    </Stack.Navigator>
  );
}

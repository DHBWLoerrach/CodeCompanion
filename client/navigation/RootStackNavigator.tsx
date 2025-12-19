import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import QuizSessionScreen from "@/screens/QuizSessionScreen";
import SessionSummaryScreen from "@/screens/SessionSummaryScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import TopicDetailScreen from "@/screens/TopicDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

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
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QuizSession"
        component={QuizSessionScreen}
        options={{
          presentation: "modal",
          headerTitle: "Quiz",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="SessionSummary"
        component={SessionSummaryScreen}
        options={{
          presentation: "modal",
          headerTitle: "Session Complete!",
          gestureEnabled: false,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          ...opaqueScreenOptions,
          headerTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="TopicDetail"
        component={TopicDetailScreen}
        options={{
          ...opaqueScreenOptions,
          headerTitle: "",
        }}
      />
    </Stack.Navigator>
  );
}

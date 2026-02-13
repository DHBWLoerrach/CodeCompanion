import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useProgrammingLanguage } from "@/contexts/ProgrammingLanguageContext";

export default function Index() {
  const { isLoading, isLanguageSelected } = useProgrammingLanguage();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isLanguageSelected) {
    return <Redirect href="/language-select" />;
  }

  return <Redirect href="/learn" />;
}

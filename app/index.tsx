import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProgrammingLanguage } from "@/contexts/ProgrammingLanguageContext";
import { storage } from "@/lib/storage";

export default function Index() {
  const { isLoading: isProgrammingLanguageLoading, isLanguageSelected } =
    useProgrammingLanguage();
  const { isLoading: isAppLanguageLoading } = useLanguage();
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadWelcomeState = async () => {
      const seenWelcome = await storage.hasSeenWelcome();
      if (isMounted) {
        setHasSeenWelcome(seenWelcome);
      }
    };

    loadWelcomeState();

    return () => {
      isMounted = false;
    };
  }, []);

  if (
    isProgrammingLanguageLoading ||
    isAppLanguageLoading ||
    hasSeenWelcome === null
  ) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!hasSeenWelcome) {
    return <Redirect href="/welcome" />;
  }

  if (!isLanguageSelected) {
    return <Redirect href="/language-select" />;
  }

  return <Redirect href="/learn" />;
}

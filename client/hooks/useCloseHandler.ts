import { useRouter } from "expo-router";

export function useCloseHandler(fallbackRoute = "/learn") {
  const router = useRouter();

  return () => {
    if (router.canDismiss()) {
      router.dismiss();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackRoute as any);
  };
}

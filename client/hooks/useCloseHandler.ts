import { useRouter } from 'expo-router';

const FALLBACK_ROUTES = [
  '/learn',
  '/practice',
  '/progress',
  '/settings',
] as const;
type FallbackRoute = (typeof FALLBACK_ROUTES)[number];

export function useCloseHandler(fallbackRoute: FallbackRoute = '/learn') {
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
    router.replace(fallbackRoute);
  };
}

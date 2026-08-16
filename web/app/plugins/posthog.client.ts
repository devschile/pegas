import posthog from 'posthog-js';

/**
 * Solo cliente (.client.ts): PostHog no debe correr en SSR. Captura de
 * pageview manual (capture_pageview: false + router.afterEach) porque en una
 * SPA/SSR app la navegacion entre paginas no recarga el documento -- el
 * autocapture de posthog-js solo veria el primer load.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const router = useRouter();

  posthog.init(config.public.posthogKey, {
    api_host: config.public.posthogHost,
    person_profiles: 'identified_only',
    capture_pageview: false,
  });

  router.afterEach(to => {
    posthog.capture('$pageview', { $current_url: to.fullPath });
  });

  return {
    provide: { posthog },
  };
});

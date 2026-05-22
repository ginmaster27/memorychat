import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { clearMediaCache } from '../../services/cache/mediaCache';
import { MEDIA_CONFIG } from '../../services/media/config';

export function useMediaLifecycle() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        timer.current = setTimeout(clearMediaCache, MEDIA_CONFIG.backgroundClearMs);
      } else if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    });

    return () => {
      if (timer.current) clearTimeout(timer.current);
      subscription.remove();
    };
  }, []);
}

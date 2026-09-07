import { useAuthStore } from '../stores/authStore';
import { useMapStore } from '../stores/mapStore';

export function mountLocationVisibilityLifecycle(): () => void {
  const syncLocationPolling = () => {
    const user = useAuthStore.getState().user;
    const mapState = useMapStore.getState();

    if (!user || user.status !== 'active') {
      mapState.stopLocationWatch();
      return;
    }

    if (document.hidden) {
      // Keep Presence/Reatime alive, but stop GPS + nearby polling while the app is backgrounded.
      mapState.stopLocationWatch();
      return;
    }

    // Travel mode uses saved coordinates and does not need a physical GPS polling interval.
    if (!user.is_traveling && mapState.watchId === null) {
      mapState.requestLocationPermission();
    }
  };

  document.addEventListener('visibilitychange', syncLocationPolling);
  syncLocationPolling();

  return () => {
    document.removeEventListener('visibilitychange', syncLocationPolling);
  };
}

import { create } from 'zustand';

interface MediaSettingsState {
  autoDownloadImages: boolean;
  uploadOnWifiOnly: boolean;
  toggleAutoDownloadImages: () => void;
  toggleUploadOnWifiOnly: () => void;
}

export const useMediaSettingsStore = create<MediaSettingsState>((set) => ({
  autoDownloadImages: true,
  uploadOnWifiOnly: false,
  toggleAutoDownloadImages: () => set((state) => ({ autoDownloadImages: !state.autoDownloadImages })),
  toggleUploadOnWifiOnly: () => set((state) => ({ uploadOnWifiOnly: !state.uploadOnWifiOnly })),
}));

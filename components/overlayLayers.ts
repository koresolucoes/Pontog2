export const OVERLAY_Z = {
  dock: 40,
  modalBackdrop: 80,
  modal: 90,
  nestedModal: 110,
  mediaViewer: 130,
  toast: 99999,
} as const;

export const MODAL_SAFE_BOTTOM = 'max(16px, env(safe-area-inset-bottom))';

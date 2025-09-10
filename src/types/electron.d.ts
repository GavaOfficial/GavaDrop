export {}; // ensure this file is a module

declare global {
  interface Window {
    electronAPI?: {
      notify: (title: string, body?: string, peerId?: string) => Promise<{ ok: boolean; error?: string }>;
      notifyWithActions: (title: string, body?: string, actions?: Array<{ type: 'button'; text: string }>, requestId?: string) => Promise<{ ok: boolean; error?: string }>;
      onNotificationClick: (callback: (data: { peerId?: string; requestId?: string }) => void) => void;
      onNotificationAction: (callback: (data: { requestId: string; action: string; index: number }) => void) => void;
      removeNotificationClickListener: () => void;
      removeNotificationActionListener: () => void;
    };
  }
}


export async function notifyNative(title: string, body?: string, peerId?: string) {
  // In Electron
  if (typeof window !== 'undefined' && window.electronAPI?.notify) {
    return window.electronAPI.notify(title, body, peerId);
  }

  // Fallback to Web Notifications in browser
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') new Notification(title, { body });
      }
    } catch {
      // ignore
    }
  }

  return { ok: true };
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface ActionNotificationOptions {
  body?: string;
  icon?: string;
  actions?: NotificationAction[];
  onAction?: (action: string) => void;
  onNotificationClick?: () => void;
}

export async function notifyWithActions(
  title: string, 
  options: ActionNotificationOptions = {}
): Promise<{ ok: boolean; notification?: Notification }> {
  
  // In Electron - use native notification with actions if supported
  if (typeof window !== 'undefined' && window.electronAPI?.notifyWithActions) {
    try {
      // Convert actions to Electron format
      const electronActions = options.actions?.map(action => ({
        type: 'button' as const,
        text: action.title
      })) || [];
      
      const requestId = Math.random().toString(36).substring(2, 11);
      
      const result = await window.electronAPI.notifyWithActions(
        title, 
        options.body, 
        electronActions,
        requestId
      );
      
      // Set up action listener if callback provided
      if (options.onAction && window.electronAPI?.onNotificationAction) {
        window.electronAPI.onNotificationAction((data: { requestId: string; action: string; index: number }) => {
          if (data.requestId === requestId) {
            const actionId = options.actions?.[data.index]?.action || `action_${data.index}`;
            options.onAction?.(actionId);
            
            // Clean up listener
            window.electronAPI?.removeNotificationActionListener?.();
          }
        });
      }
      
      return { ok: result.ok };
    } catch (error) {
      console.warn('Electron notification with actions failed, falling back:', error);
    }
  }

  // For web browsers - show normal notification and handle actions via in-app dialogs
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, { 
          body: options.body,
          icon: options.icon 
        });

        // Handle notification click
        if (options.onNotificationClick) {
          notification.onclick = () => {
            options.onNotificationClick?.();
            notification.close();
          };
        }

        // Auto-close after 5 seconds if no click handler
        if (!options.onNotificationClick) {
          setTimeout(() => notification.close(), 5000);
        }

        return { ok: true, notification };
        
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          const notification = new Notification(title, { 
            body: options.body,
            icon: options.icon 
          });

          if (options.onNotificationClick) {
            notification.onclick = () => {
              options.onNotificationClick?.();
              notification.close();
            };
          }

          if (!options.onNotificationClick) {
            setTimeout(() => notification.close(), 5000);
          }

          return { ok: true, notification };
        }
      }
    } catch (error) {
      console.warn('Web notification failed:', error);
    }
  }

  return { ok: false };
}


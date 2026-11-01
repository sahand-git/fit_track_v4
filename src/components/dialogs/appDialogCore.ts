export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export interface NotifyDialogOptions {
  title: string;
  message: string;
  buttonText?: string;
}

export interface AppDialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  notify: (options: NotifyDialogOptions) => Promise<void>;
}

export type DialogConfig =
  | {
      type: 'confirm';
      options: ConfirmDialogOptions;
      resolve: (val: boolean) => void;
    }
  | {
      type: 'notify';
      options: NotifyDialogOptions;
      resolve: () => void;
    };

export class AppDialogManager {
  private currentDialog: DialogConfig | null = null;
  private queue: DialogConfig[] = [];
  private listeners: ((dialog: DialogConfig | null) => void)[] = [];

  subscribe(listener: (dialog: DialogConfig | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentDialog);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getCurrentDialog(): DialogConfig | null {
    return this.currentDialog;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const item: DialogConfig = { type: 'confirm', options, resolve };
      if (!this.currentDialog) {
        this.currentDialog = item;
        this.notifyListeners();
      } else {
        this.queue.push(item);
      }
    });
  }

  notify(options: NotifyDialogOptions): Promise<void> {
    return new Promise<void>((resolve) => {
      const item: DialogConfig = { type: 'notify', options, resolve };
      if (!this.currentDialog) {
        this.currentDialog = item;
        this.notifyListeners();
      } else {
        this.queue.push(item);
      }
    });
  }

  resolveCurrent(value?: boolean): void {
    if (!this.currentDialog) return;
    const dialog = this.currentDialog;
    if (dialog.type === 'confirm') {
      dialog.resolve(Boolean(value));
    } else {
      dialog.resolve();
    }
    this.showNext();
  }

  dismissCurrent(): void {
    if (!this.currentDialog) return;
    const dialog = this.currentDialog;
    if (dialog.type === 'confirm') {
      dialog.resolve(false);
    } else {
      dialog.resolve();
    }
    this.showNext();
  }

  private showNext(): void {
    if (this.queue.length > 0) {
      this.currentDialog = this.queue.shift()!;
    } else {
      this.currentDialog = null;
    }
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l(this.currentDialog));
  }

  reset(): void {
    this.currentDialog = null;
    this.queue = [];
    this.notifyListeners();
  }
}

export const globalDialogManager = new AppDialogManager();

export const appDialog: AppDialogContextValue = {
  confirm: (options) => globalDialogManager.confirm(options),
  notify: (options) => globalDialogManager.notify(options),
};

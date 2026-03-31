interface TelegramWebApp {
  ready(): void;
  expand(): void;
  close(): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor(color: string): void;
  isVersionAtLeast(version: string): boolean;
  openInvoice(url: string, callback?: (status: string) => void): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
  showPopup(params: Record<string, unknown>, callback?: (id: string) => void): void;
  shareMessage(msgId: string, callback?: (shared: boolean) => void): void;
  addToHomeScreen(): void;
  requestFullscreen(): void;
  exitFullscreen(): void;
  sendData(data: string): void;

  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
    };
    start_param?: string;
    chat_type?: string;
    auth_date?: number;
    hash?: string;
  };

  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  isFullscreen: boolean;
  platform: string;
  version: string;

  BackButton: {
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
    isVisible: boolean;
  };

  MainButton: {
    setText(text: string): void;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
    setParams(params: Record<string, unknown>): void;
    isVisible: boolean;
    isActive: boolean;
    text: string;
  };

  HapticFeedback: {
    impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
    notificationOccurred(type: "error" | "success" | "warning"): void;
    selectionChanged(): void;
  };

  CloudStorage: {
    setItem(
      key: string,
      value: string,
      callback?: (err: string | null, stored: boolean) => void,
    ): void;
    getItem(key: string, callback: (err: string | null, value: string) => void): void;
    removeItem(key: string, callback?: (err: string | null, removed: boolean) => void): void;
    getKeys(callback: (err: string | null, keys: string[]) => void): void;
  };
}

interface Window {
  Telegram: {
    WebApp: TelegramWebApp;
  };
}

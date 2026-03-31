import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramContextValue {
  webApp: typeof window.Telegram.WebApp | null;
  user: TelegramUser | null;
  initData: string;
  startParam: string | null;
  isReady: boolean;
}

const TelegramContext = createContext<TelegramContextValue>({
  webApp: null,
  user: null,
  initData: "",
  startParam: null,
  isReady: false,
});

export function useTelegram() {
  return useContext(TelegramContext);
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TelegramContextValue>({
    webApp: null,
    user: null,
    initData: "",
    startParam: null,
    isReady: false,
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setState((s) => ({ ...s, isReady: true }));
      return;
    }

    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();

    const user = tg.initDataUnsafe?.user ?? null;
    const startParam = tg.initDataUnsafe?.start_param ?? null;

    setState({
      webApp: tg,
      user: user as TelegramUser | null,
      initData: tg.initData || "",
      startParam,
      isReady: true,
    });
  }, []);

  return <TelegramContext.Provider value={state}>{children}</TelegramContext.Provider>;
}

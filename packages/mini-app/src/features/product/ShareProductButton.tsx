import type { Product } from "@flowers-tg/shared";
import { useTelegram } from "@/app/TelegramProvider";
import { Button } from "@/design-system/components/Button";

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME as string | undefined;

export function ShareProductButton({ product }: { product: Product }) {
  const { webApp } = useTelegram();

  const handleShare = () => {
    if (!BOT_USERNAME) {
      void navigator.clipboard?.writeText(window.location.href);
      return;
    }
    const miniAppLink = `https://t.me/${BOT_USERNAME}?startapp=product_${product.id}`;
    const text = encodeURIComponent(`${product.title} — Цветы Любимого Города`);
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(miniAppLink)}&text=${text}`;

    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(shareUrl);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({
        title: product.title,
        text: "Посмотри этот букет в «Цветы Любимого Города»",
        url: miniAppLink,
      });
      return;
    }
    void navigator.clipboard?.writeText(miniAppLink);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full gap-2"
      onClick={handleShare}
    >
      <svg
        className="w-5 h-5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 5.314 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
        />
      </svg>
      Поделиться
    </Button>
  );
}

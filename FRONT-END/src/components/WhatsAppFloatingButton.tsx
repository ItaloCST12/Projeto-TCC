const WHATSAPP_URL = "https://wa.me/5500000000000";

const WhatsAppFloatingButton = () => {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir WhatsApp da empresa"
      title="Falar no WhatsApp"
      className="fixed right-4 bottom-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card hover:opacity-90 transition-opacity"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path d="M19.05 4.94A9.88 9.88 0 0 0 12 2a10 10 0 0 0-8.69 14.94L2 22l5.2-1.36A10 10 0 1 0 19.05 4.94ZM12 20a8 8 0 0 1-4.09-1.12l-.29-.17-3.09.81.82-3.01-.19-.31A8 8 0 1 1 12 20Zm4.39-6.02c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.17a7.2 7.2 0 0 1-1.34-1.67c-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.31-.74-1.8-.2-.48-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 1.99s.86 2.31.98 2.47c.12.16 1.69 2.58 4.1 3.62.57.25 1.01.4 1.36.51.57.18 1.09.15 1.5.09.46-.07 1.4-.57 1.6-1.13.2-.56.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28Z" />
      </svg>
    </a>
  );
};

export default WhatsAppFloatingButton;

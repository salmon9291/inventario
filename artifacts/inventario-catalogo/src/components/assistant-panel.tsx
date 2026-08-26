import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Bot, CornerDownLeft, RotateCcw, Send, X } from 'lucide-react';
import {
  useChatWithInventoryAssistant,
  type AssistantChatMessage,
  type AssistantChatResponse,
} from '@workspace/api-client-react';

const suggestions = [
  '¿Qué productos tienen stock bajo?',
  '¿Cuál es el valor total del inventario?',
  '¿Qué productos dejan más margen?',
];

type AssistantPanelProps = {
  open: boolean;
  onClose: () => void;
};

export default function AssistantPanel({ open, onClose }: AssistantPanelProps) {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [requestError, setRequestError] = useState('');
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chat = useChatWithInventoryAssistant();

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, chat.isPending]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const sendMessage = (content: string) => {
    const message = content.trim();
    if (!message || chat.isPending) return;

    const history = messages.slice(-12);
    const nextMessage: AssistantChatMessage = { role: 'user', content: message };
    setMessages((current) => [...current, nextMessage]);
    setDraft('');
    setRequestError('');
    setFailedMessage(null);

    chat.mutate(
      { data: { message, history } },
      {
        onSuccess: (response: AssistantChatResponse) => {
          if (response.reply?.trim()) {
            setMessages((current) => [
              ...current,
              { role: 'assistant', content: response.reply.trim() },
            ]);
          } else {
            setRequestError('El asistente no devolvió una respuesta. Puedes intentarlo de nuevo.');
            setFailedMessage(message);
          }
        },
        onError: () => {
          setRequestError('No pudimos consultar el catálogo. Revisa tu conexión e inténtalo de nuevo.');
          setFailedMessage(message);
        },
      },
    );
  };

  const handleSubmit = () => {
    sendMessage(draft);
  };

  const retry = () => {
    if (!failedMessage) return;
    const failedIndex = messages.findIndex(
      (message, index) => message.role === 'user' && message.content === failedMessage
        && index === messages.length - 1,
    );
    const history = failedIndex >= 0 ? messages.slice(Math.max(0, failedIndex - 12), failedIndex) : messages.slice(-12);
    setRequestError('');
    setFailedMessage(null);
    chat.mutate(
      { data: { message: failedMessage, history } },
      {
        onSuccess: (response: AssistantChatResponse) => {
          if (response.reply?.trim()) {
            setMessages((current) => [
              ...current,
              { role: 'assistant', content: response.reply.trim() },
            ]);
          } else {
            setRequestError('El asistente no devolvió una respuesta. Puedes intentarlo de nuevo.');
            setFailedMessage(failedMessage);
          }
        },
        onError: () => {
          setRequestError('No pudimos consultar el catálogo. Revisa tu conexión e inténtalo de nuevo.');
          setFailedMessage(failedMessage);
        },
      },
    );
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  if (!open) return null;

  return (
    <aside
      className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col border-l border-card-border bg-card md:left-auto md:w-[410px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-panel-title"
      data-testid="panel-inventory-assistant"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-card-border px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-primary">
            <Bot size={19} />
          </div>
          <div>
            <p className="font-mono-data text-[9px] uppercase tracking-[.16em] text-muted-foreground">Casa Mercado</p>
            <h2 id="assistant-panel-title" className="mt-0.5 font-display text-lg font-bold tracking-tight">Asistente de inventario</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="icon-button"
          aria-label="Cerrar asistente"
          data-testid="button-close-assistant"
        >
          <X size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-background/45 px-4 py-5 sm:px-5" data-testid="assistant-message-list">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-center py-8" data-testid="status-assistant-empty">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-card-border bg-card text-primary">
              <Bot size={20} />
            </div>
            <p className="font-display text-xl font-bold tracking-tight">Consulta tu catálogo</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Pregunta por existencias, valor o margen. Respondo con la información actual de Casa Mercado.
            </p>
            <div className="mt-7 space-y-2">
              <p className="font-mono-data text-[9px] uppercase tracking-[.15em] text-muted-foreground">Sugerencias</p>
              {suggestions.map((suggestion, index) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="flex w-full items-start justify-between gap-3 border border-card-border bg-card px-3 py-3 text-left text-xs font-semibold transition hover:border-primary/45 hover:bg-secondary"
                  data-testid={`button-assistant-suggestion-${index}`}
                >
                  <span>{suggestion}</span>
                  <CornerDownLeft size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-assistant-${message.role}-${index}`}
              >
                <div className={`max-w-[88%] ${message.role === 'user'
                  ? 'bg-primary px-3.5 py-2.5 text-primary-foreground'
                  : 'border border-card-border bg-card px-3.5 py-3 text-foreground'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="mb-1.5 flex items-center gap-1.5 font-mono-data text-[9px] uppercase tracking-[.12em] text-primary">
                      <Bot size={12} />
                      Asistente
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex justify-start" data-testid="status-assistant-loading" aria-live="polite">
                <div className="border border-card-border bg-card px-3.5 py-3">
                  <div className="flex items-center gap-1.5" aria-label="Consultando inventario">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:240ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
        {requestError && (
          <div className="mt-5 border border-[hsl(var(--destructive)/.28)] bg-[hsl(var(--destructive)/.06)] px-3 py-3 text-xs text-destructive" role="alert" data-testid="status-assistant-error">
            <p>{requestError}</p>
            {failedMessage && (
              <button
                type="button"
                onClick={retry}
                disabled={chat.isPending}
                className="mt-2 inline-flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline disabled:opacity-60"
                data-testid="button-retry-assistant"
              >
                <RotateCcw size={13} />
                Reintentar consulta
              </button>
            )}
          </div>
        )}
      </div>

      <form
        className="shrink-0 border-t border-card-border bg-card p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex items-end gap-2 border border-input bg-background px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={2000}
            rows={2}
            className="min-h-[42px] flex-1 resize-none bg-transparent py-1 text-sm leading-5 outline-none placeholder:text-muted-foreground/70"
            placeholder="Escribe una pregunta sobre tu inventario…"
            aria-label="Pregunta para el asistente"
            data-testid="input-assistant-message"
          />
          <button
            type="submit"
            disabled={!draft.trim() || chat.isPending}
            className="button-primary h-9 w-9 shrink-0 p-0"
            aria-label="Enviar pregunta"
            data-testid="button-send-assistant-message"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Enter para enviar · Shift + Enter para salto de línea
        </p>
      </form>
    </aside>
  );
}
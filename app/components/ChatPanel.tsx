"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  onRetry?: () => void;
}

export default function ChatPanel({
  messages,
  isLoading,
  error,
  onSendMessage,
  onRetry,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInputValue("");
  }, [inputValue, isLoading, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleRetryClick = useCallback(() => {
    onRetry?.();
  }, [onRetry]);

  return (
    <div className="chat-panel" aria-label="Chat panel">
      <div className="chat-panel__messages" role="log" aria-live="polite">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-panel__message chat-panel__message--${msg.role}`}
          >
            <span className="chat-panel__message-role">
              {msg.role === "user" ? "You" : "Agent"}
            </span>
            <span className="chat-panel__message-content">{msg.content}</span>
          </div>
        ))}

        {isLoading && (
          <div className="chat-panel__typing-indicator" role="status" aria-label="Agent is typing">
            <span className="chat-panel__typing-dot" />
            <span className="chat-panel__typing-dot" />
            <span className="chat-panel__typing-dot" />
          </div>
        )}

        {error && (
          <div
            className="chat-panel__error"
            role="alert"
            onClick={handleRetryClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleRetryClick();
            }}
            tabIndex={0}
            aria-label={`Error: ${error}. Tap to retry.`}
          >
            <span className="chat-panel__error-text">
              {error}
            </span>
            <span className="chat-panel__error-retry">Tap to retry.</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-panel__input-area">
        <input
          ref={inputRef}
          className="chat-panel__input"
          type="text"
          placeholder="Type a message…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          aria-label="Chat message input"
        />
        <button
          className="chat-panel__send-btn"
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
}

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface UseTriageChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  startSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  retry: () => Promise<void>;
}

interface ChatApiResponse {
  response?: string;
  error?: string;
}

async function postChat(body: {
  start?: boolean;
  history: ChatMessage[];
  message: string;
}): Promise<{ ok: boolean; data: ChatApiResponse; status: number }> {
  const res = await fetch("/api/triage/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: ChatApiResponse = await res.json();
  return { ok: res.ok, data, status: res.status };
}

export function useTriageChat(): UseTriageChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track last failed request for retry
  const lastFailedRequest = useRef<{
    type: "start" | "message";
    message: string;
    history: ChatMessage[];
  } | null>(null);

  const startSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    lastFailedRequest.current = null;

    const requestBody = { start: true, history: [] as ChatMessage[], message: "" };

    try {
      const { ok, data } = await postChat(requestBody);

      if (ok && data.response) {
        setMessages([{ role: "model", content: data.response }]);
      } else {
        const errorMsg = data.error || "Failed to start session";
        setError(errorMsg);
        lastFailedRequest.current = { type: "start", message: "", history: [] };
      }
    } catch {
      const errorMsg = "Network error. Failed to connect to chat service.";
      setError(errorMsg);
      lastFailedRequest.current = { type: "start", message: "", history: [] };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    setError(null);
    lastFailedRequest.current = null;

    // Optimistically append the user message
    const userMessage: ChatMessage = { role: "user", content: message };
    const currentHistory = [...messages];

    setMessages((prev) => [...prev, userMessage]);

    const requestBody = {
      history: currentHistory,
      message,
    };

    try {
      const { ok, data } = await postChat(requestBody);

      if (ok && data.response) {
        const agentMessage: ChatMessage = { role: "model", content: data.response };
        setMessages((prev) => [...prev, agentMessage]);
      } else {
        const errorMsg = data.error || "Failed to get response";
        setError(errorMsg);
        // Remove the optimistically added user message on failure
        setMessages(currentHistory);
        lastFailedRequest.current = { type: "message", message, history: currentHistory };
      }
    } catch {
      const errorMsg = "Network error. Failed to connect to chat service.";
      setError(errorMsg);
      // Remove the optimistically added user message on failure
      setMessages(currentHistory);
      lastFailedRequest.current = { type: "message", message, history: currentHistory };
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const retry = useCallback(async () => {
    const failedReq = lastFailedRequest.current;
    if (!failedReq) return;

    setIsLoading(true);
    setError(null);

    if (failedReq.type === "start") {
      const requestBody = { start: true, history: [] as ChatMessage[], message: "" };
      try {
        const { ok, data } = await postChat(requestBody);
        if (ok && data.response) {
          setMessages([{ role: "model", content: data.response }]);
          lastFailedRequest.current = null;
        } else {
          const errorMsg = data.error || "Failed to start session";
          setError(errorMsg);
        }
      } catch {
        setError("Network error. Failed to connect to chat service.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Retry the last failed message
      const userMessage: ChatMessage = { role: "user", content: failedReq.message };
      setMessages((prev) => [...prev, userMessage]);

      const requestBody = {
        history: failedReq.history,
        message: failedReq.message,
      };

      try {
        const { ok, data } = await postChat(requestBody);
        if (ok && data.response) {
          const agentMessage: ChatMessage = { role: "model", content: data.response };
          setMessages((prev) => [...prev, agentMessage]);
          lastFailedRequest.current = null;
        } else {
          const errorMsg = data.error || "Failed to get response";
          setError(errorMsg);
          // Remove optimistically added message again
          setMessages(failedReq.history);
        }
      } catch {
        setError("Network error. Failed to connect to chat service.");
        setMessages(failedReq.history);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  return { messages, isLoading, error, startSession, sendMessage, retry };
}

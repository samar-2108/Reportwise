"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth/context";
import { ConfirmedItem } from "@/types/report";

export interface AttachedReportItem {
  id: string;
  title: string;
  reportDate?: string;
  reportType?: string;
  tests?: ConfirmedItem[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  feedback?: "helpful" | "unhelpful" | null;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleChat: () => void;
  conversations: ChatConversation[];
  activeConversationId: string | null;
  activeConversationTitle: string;
  messages: ChatMessage[];
  attachedReports: AttachedReportItem[];
  availableReports: AttachedReportItem[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  startNewChat: () => void;
  selectConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  attachReport: (report: AttachedReportItem) => void;
  detachReport: (reportId: string) => void;
  clearAttachedReports: () => void;
  sendFeedback: (messageId: string, feedback: "helpful" | "unhelpful") => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState("New Chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachedReports, setAttachedReports] = useState<AttachedReportItem[]>([]);
  const [availableReports, setAvailableReports] = useState<AttachedReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedUserRef = useRef<string | null>(null);

  // Lazy-load chat data ONLY when the user actually opens the chat drawer, and only once per user session
  useEffect(() => {
    if (!userId) {
      loadedUserRef.current = null;
      Promise.resolve().then(() => {
        setConversations([]);
        setMessages([]);
        setActiveConversationId(null);
        setAttachedReports([]);
        setAvailableReports([]);
      });
      return;
    }

    if (isOpen && loadedUserRef.current !== userId) {
      loadedUserRef.current = userId;

      let isMounted = true;

      Promise.all([
        fetch("/api/chat/conversations").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/reports/list").then((r) => (r.ok ? r.json() : null)),
      ])
        .then(([convData, repData]) => {
          if (!isMounted) return;
          if (convData?.conversations) {
            setConversations(convData.conversations);
          }
          if (repData?.reports) {
            const reps: AttachedReportItem[] = repData.reports.map((r: {
              id: string;
              title?: string;
              report_type?: string;
              report_date?: string;
              confirmed_data?: ConfirmedItem[];
              extracted_data?: { tests?: ConfirmedItem[] };
            }) => ({
              id: r.id,
              title: r.report_type || r.title || "Lab Report",
              reportDate: r.report_date || undefined,
              reportType: r.report_type || r.title || "Lab Report",
              tests: r.confirmed_data || r.extracted_data?.tests || [],
            }));
            setAvailableReports(reps);
          }
        })
        .catch((err) => {
          console.warn("Error loading chat data:", err);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, userId]);

  // Load messages when a conversation is chosen from history
  const selectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setError(null);
    const target = conversations.find((c) => c.id === convId);
    if (target) setActiveConversationTitle(target.title);

    try {
      setIsLoading(true);
      const res = await fetch(`/api/chat/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const formatted: ChatMessage[] = (data.messages || []).map((m: {
          id: string;
          role: "user" | "assistant" | "system";
          content: string;
          feedback?: "helpful" | "unhelpful" | null;
          created_at: string;
        }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          feedback: m.feedback,
          createdAt: m.created_at,
        }));
        setMessages(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch conversation messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setActiveConversationTitle("New Chat");
    setMessages([]);
    setError(null);
  };

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Keyboard shortcut listener: Ctrl+K, Cmd+K, or "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === "input" || targetTag === "textarea" || (e.target as HTMLElement)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "/" && !isInput) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Report attachment helpers
  const attachReport = (report: AttachedReportItem) => {
    setAttachedReports((prev) => {
      if (prev.some((r) => r.id === report.id)) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, report];
    });
  };

  const detachReport = (reportId: string) => {
    setAttachedReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const clearAttachedReports = () => {
    setAttachedReports([]);
  };

  // Send message
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    setError(null);
    setIsLoading(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId || undefined,
          message: content.trim(),
          attachedReportIds: attachedReports.map((r) => r.id),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get AI response.");
      }

      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId);
        setActiveConversationTitle(data.conversationTitle || "New Chat");
        setConversations((prev) => [
          {
            id: data.conversationId,
            title: data.conversationTitle || "New Chat",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...withoutTemp, data.userMessage, data.message];
      });

      if (data.autoAttachedReport) {
        const auto = data.autoAttachedReport as AttachedReportItem;
        attachReport(auto);
      }
    } catch (err: unknown) {
      console.error("Chat error:", err);
      const errMsg = err instanceof Error ? err.message : "Error communicating with ReportWise AI.";
      setError(errMsg);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Rename conversation
  const renameConversation = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title } : c))
        );
        if (activeConversationId === id) {
          setActiveConversationTitle(title);
        }
      }
    } catch (err) {
      console.error("Rename conversation error:", err);
    }
  };

  // Delete conversation
  const deleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          startNewChat();
        }
      }
    } catch (err) {
      console.error("Delete conversation error:", err);
    }
  };

  // Feedback on assistant response
  const sendFeedback = async (messageId: string, feedback: "helpful" | "unhelpful") => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
    );

    try {
      await fetch(`/api/chat/messages/${messageId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
    } catch (err) {
      console.warn("Feedback submission error:", err);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggleChat,
        conversations,
        activeConversationId,
        activeConversationTitle,
        messages,
        attachedReports,
        availableReports,
        isLoading,
        error,
        sendMessage,
        startNewChat,
        selectConversation,
        renameConversation,
        deleteConversation,
        attachReport,
        detachReport,
        clearAttachedReports,
        sendFeedback,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}

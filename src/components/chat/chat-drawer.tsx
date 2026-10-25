"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth/context";
import { useChat } from "@/lib/chat/context";
import { generateSuggestedQuestions } from "@/lib/chat/suggested-questions";
import {
  MessageSquare,
  Sparkles,
  X,
  Plus,
  Send,
  Paperclip,
  Trash2,
  Edit2,
  Check,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";

export function ChatDrawer() {
  const { user } = useAuth();
  const {
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
    sendFeedback,
  } = useChat();

  const [inputMessage, setInputMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Suggest attaching current report if viewing /reports/[id]
  const currentReportSuggestion = React.useMemo(() => {
    if (!isOpen || typeof window === "undefined") return null;
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith("/reports/")) return null;
    const reportId = currentPath.replace("/reports/", "").trim();
    if (!reportId) return null;
    if (attachedReports.some((r) => r.id === reportId)) return null;
    return availableReports.find((r) => r.id === reportId) || null;
  }, [isOpen, attachedReports, availableReports]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && !showHistory && !showAttachPicker) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, showHistory, showAttachPicker]);

  // Lock background body & html scroll when chatbot drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalDocOverflow = document.documentElement.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Prevent layout shift from scrollbar disappearing
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalDocOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // Hide on public / landing / auth pages or if unauthenticated
  const isAuthPage = typeof window !== "undefined" ? window.location.pathname.startsWith("/auth") : false;
  if (!user || isAuthPage) {
    return null;
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || isLoading) return;

    setInputMessage("");
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = generateSuggestedQuestions(attachedReports);

  const startRename = () => {
    setEditedTitle(activeConversationTitle);
    setIsEditingTitle(true);
  };

  const saveRename = () => {
    if (activeConversationId && editedTitle.trim()) {
      renameConversation(activeConversationId, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <>
      {/* 1. FLOATING CHAT BUTTON (Appears on every authenticated page) */}
      {!isOpen && (
        <button
          type="button"
          onClick={toggleChat}
          className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-40 group flex items-center gap-2 rounded-full bg-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-700/25 transition-all hover:bg-teal-700 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          aria-label="Ask ReportWise AI Chatbot"
          title="Ask ReportWise (Ctrl/Cmd+K or /)"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
          </div>
          <span className="font-semibold tracking-wide">Ask ReportWise</span>
          <span className="hidden sm:inline-block rounded-md bg-teal-700/80 px-1.5 py-0.5 text-[10px] text-teal-100 font-mono">
            ⌘K
          </span>
        </button>
      )}

      {/* 2. CHAT OVERLAY PANEL (Side panel on Desktop, Full-screen sheet on Mobile) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden overscroll-contain">
          {/* Backdrop on desktop */}
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity sm:block overscroll-contain"
            onClick={() => setIsOpen(false)}
            onWheel={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            aria-hidden="true"
          />

          {/* Side Drawer Container */}
          <div className="fixed inset-y-0 right-0 flex max-w-full overscroll-contain">
            <div className="w-screen sm:w-[440px] flex flex-col bg-white shadow-2xl border-l border-slate-200 overscroll-contain">
              {/* HEADER */}
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 bg-slate-50/80">
                <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div className="truncate flex-1">
                    {isEditingTitle ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveRename()}
                          className="w-full text-xs font-semibold px-2 py-1 rounded border border-teal-500 bg-white focus:outline-none"
                          autoFocus
                          maxLength={60}
                        />
                        <button
                          type="button"
                          onClick={saveRename}
                          className="p-1 text-teal-600 hover:bg-teal-50 rounded"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group/title">
                        <h2 className="text-xs font-bold text-slate-800 truncate">
                          {activeConversationTitle}
                        </h2>
                        {activeConversationId && (
                          <button
                            type="button"
                            onClick={startRename}
                            className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-400 hover:text-slate-600 transition-opacity"
                            title="Rename chat"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 truncate">
                      Health Education Assistant
                    </p>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHistory((prev) => !prev);
                      setShowAttachPicker(false);
                    }}
                    className={`p-2 rounded-xl text-xs font-semibold transition-colors ${
                      showHistory
                        ? "bg-teal-100 text-teal-800"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                    title="Past conversations"
                  >
                    <Clock className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      startNewChat();
                      setShowHistory(false);
                    }}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    title="Start new chat"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    title="Close (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* PAST CONVERSATIONS DRAWER */}
              {showHistory ? (
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-700">Chat History</span>
                    <button
                      type="button"
                      onClick={() => {
                        startNewChat();
                        setShowHistory(false);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800"
                    >
                      <Plus className="h-3 w-3" />
                      <span>New Chat</span>
                    </button>
                  </div>

                  {conversations.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No previous conversations found.
                    </div>
                  ) : (
                    conversations.map((c) => (
                      <div
                        key={c.id}
                        className={`group flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                          activeConversationId === c.id
                            ? "border-teal-200 bg-teal-50/80 text-teal-900 font-semibold"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                        onClick={() => {
                          selectConversation(c.id);
                          setShowHistory(false);
                        }}
                      >
                        <div className="flex items-center gap-2 truncate mr-2">
                          <MessageSquare className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{c.title}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(c.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete conversation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : showAttachPicker ? (
                /* REPORT ATTACHMENT PICKER DRAWER */
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Attach Lab Reports</div>
                      <div className="text-[11px] text-slate-500">
                        Select up to 3 reports to provide clinical context for this conversation.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAttachPicker(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {availableReports.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No uploaded reports found in your account. Upload a report first to attach it.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableReports.map((rep) => {
                        const isAttached = attachedReports.some((r) => r.id === rep.id);
                        return (
                          <div
                            key={rep.id}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                              isAttached
                                ? "border-teal-300 bg-teal-50/60"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate mr-2">
                              <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                              <div className="truncate">
                                <div className="font-semibold text-slate-800 truncate">
                                  {rep.title}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {rep.reportDate || "Recent"} · {rep.tests?.length || 0} biomarkers
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (isAttached) {
                                  detachReport(rep.id);
                                } else {
                                  attachReport(rep);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                isAttached
                                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                  : "bg-teal-600 text-white hover:bg-teal-700 shadow-2xs"
                              }`}
                            >
                              {isAttached ? "Remove" : "Attach"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAttachPicker(false)}
                      className="w-full py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* MAIN MESSAGES AREA */
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
                  {/* Empty state with suggested starter chips */}
                  {messages.length === 0 ? (
                    <div className="space-y-6 pt-4">
                      <div className="text-center space-y-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/60">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">
                          Ask ReportWise Anything
                        </h3>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                          Get clear, plain-language explanations of your blood tests, normal ranges, and everyday health habits.
                        </p>
                      </div>

                      {/* Smart Suggestion Chip if on /reports/[id] */}
                      {currentReportSuggestion && (
                        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 flex items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-200">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                            <span className="text-xs font-semibold text-teal-950 truncate">
                              Attach this report ({currentReportSuggestion.title})?
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => attachReport(currentReportSuggestion)}
                            className="shrink-0 rounded-lg bg-teal-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-teal-700 shadow-2xs transition-colors"
                          >
                            Attach
                          </button>
                        </div>
                      )}

                      {/* Suggested Questions Chips */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {attachedReports.length > 0 ? "Suggested based on attached report" : "Suggested questions"}
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {suggestedQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => sendMessage(q)}
                              className="text-left p-2.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40 text-xs text-slate-700 transition-colors shadow-2xs group flex items-center justify-between"
                            >
                              <span>{q}</span>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-teal-600 transition-colors shrink-0 ml-2" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Render Message List */
                    messages.map((m) => {
                      const isUser = m.role === "user";
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                              isUser
                                ? "bg-teal-600 text-white rounded-br-xs"
                                : "bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/80"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          </div>

                          {/* Assistant feedback controls */}
                          {!isUser && (
                            <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-400">
                              <span>Was this helpful?</span>
                              <button
                                type="button"
                                onClick={() => sendFeedback(m.id, "helpful")}
                                className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                                  m.feedback === "helpful" ? "text-teal-600 font-bold" : "text-slate-400"
                                }`}
                                title="Helpful"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => sendFeedback(m.id, "unhelpful")}
                                className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                                  m.feedback === "unhelpful" ? "text-rose-600 font-bold" : "text-slate-400"
                                }`}
                                title="Not helpful"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
                      <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                      <span>Thinking & consulting health guidelines...</span>
                    </div>
                  )}

                  {/* Error banner */}
                  {error && (
                    <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* INPUT FOOTER */}
              <div className="border-t border-slate-200 p-3 bg-white space-y-2">
                {/* Attached Reports Chips */}
                {attachedReports.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Attached:
                    </span>
                    {attachedReports.map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800"
                      >
                        <FileText className="h-3 w-3 text-teal-600" />
                        <span className="max-w-[120px] truncate">{r.title}</span>
                        <button
                          type="button"
                          onClick={() => detachReport(r.id)}
                          className="hover:text-rose-600 ml-0.5"
                          title="Remove report"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Input Textarea & Controls */}
                <form onSubmit={handleSend} className="relative">
                  <div className="relative rounded-xl border border-slate-300 bg-white shadow-2xs focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500">
                    <textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value.slice(0, 500))}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        attachedReports.length > 0
                          ? "Ask about your attached report (or enter to send)..."
                          : "Ask any health or medical test question..."
                      }
                      rows={2}
                      maxLength={500}
                      className="w-full resize-none bg-transparent px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                    />

                    {/* Bottom Toolbar inside input */}
                    <div className="flex items-center justify-between border-t border-slate-100 px-2 py-1.5 bg-slate-50/50 rounded-b-xl">
                      <div className="flex items-center gap-1">
                        {/* Attach Report Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachPicker((prev) => !prev);
                            setShowHistory(false);
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                            attachedReports.length > 0
                              ? "bg-teal-100/70 text-teal-800"
                              : "text-slate-600 hover:bg-slate-200/60"
                          }`}
                          title="Attach report (Max 3)"
                        >
                          <Paperclip className="h-3.5 w-3.5 text-teal-600" />
                          <span>
                            {attachedReports.length > 0
                              ? `Attach (${attachedReports.length}/3)`
                              : "Attach report"}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {inputMessage.length}/500
                        </span>

                        <button
                          type="submit"
                          disabled={!inputMessage.trim() || isLoading}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white shadow-2xs hover:bg-teal-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          title="Send message"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Safety Micro-Disclaimer */}
                <p className="text-[10px] text-center text-slate-400 leading-tight">
                  Educational AI assistant. Not official medical diagnosis. For medical emergencies, immediately call 112/108.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

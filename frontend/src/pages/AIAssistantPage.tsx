import { useState, useRef, useEffect } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { AIChatMessage } from "@hcm-lite/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Send,
  User,
  Sparkles,
  RotateCcw,
} from "lucide-react";

export function AIAssistantPage() {
  const { company, user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: "assistant",
      content: `Hello ${user?.fullName || "there"}! I am **HCM Lite's AI Workforce Assistant** for **${
        company?.name || "your organization"
      }**.\n\nI can answer questions regarding leave quotas, attendance statistics, company hours, and verified payroll records. How can I assist you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(
    user?.role === "EMPLOYEE"
      ? [
          "What is my remaining leave balance?",
          "What are our official office hours and grace period?",
          "Show details of my latest payslip",
        ]
      : [
          "What is the workforce attendance rate today?",
          "What is our total headcount across departments?",
          "How many leave requests are awaiting approval?",
          "What is the total payout of our latest payroll run?",
        ]
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: AIChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const resp = await api.sendAIChat(text);
      const assistantMsg: AIChatMessage = {
        role: "assistant",
        content: resp.response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (resp.suggestedPrompts && resp.suggestedPrompts.length > 0) {
        setSuggestedPrompts(resp.suggestedPrompts);
      }
    } catch (err: any) {
      const errorMsg: AIChatMessage = {
        role: "assistant",
        content: `I encountered an issue retrieving that information: ${err.message || "Server error"}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: "assistant",
        content: `Conversation reset. I am ready to answer your questions grounded in **${company?.name || "your organization"}'s** real-time data.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-500 text-white flex items-center justify-center shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              AI HR & Workforce Helpdesk
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-brand-700 border border-indigo-200">
                Grounded LLM
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Company-aware assistant answering queries strictly from validated database records.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleResetChat} className="text-xs">
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Reset Chat
        </Button>
      </div>

      {/* Main Chat Feed */}
      <Card className="flex-1 flex flex-col border-slate-200 shadow-sm bg-slate-50/50 overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs ${
                  m.role === "user"
                    ? "bg-slate-800"
                    : "bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-sm"
                }`}
              >
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-800 shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{m.content}</div>
                {m.timestamp && (
                  <div
                    className={`text-[9px] mt-1.5 text-right ${
                      m.role === "user" ? "text-indigo-200" : "text-slate-400"
                    }`}
                  >
                    {m.timestamp}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm text-xs text-slate-500 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand-600 animate-spin" />
                <span>Consulting verified company records...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips */}
        {suggestedPrompts.length > 0 && !isLoading && (
          <div className="p-2.5 bg-white border-t border-slate-100 flex flex-wrap gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 self-center mr-1">
              Suggestions:
            </span>
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 border border-slate-200 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about leave balance, office hours, attendance, or payroll..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              className="flex-1 text-xs rounded-xl border border-slate-200 px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white transition-colors"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl h-10 px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

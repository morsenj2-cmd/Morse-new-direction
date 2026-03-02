import { Link } from "wouter";
import { Users, MessageCircle, Send } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useConversations, useConversation, useSendMessage, useCurrentUser } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

export const MessagesPage = (): JSX.Element => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: currentUser } = useCurrentUser();
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const { data: messages = [], isLoading: messagesLoading } = useConversation(selectedConversationId || "");
  const sendMessage = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId) return;
    setSendError("");
    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConversationId,
        content: messageInput.trim(),
      });
      setMessageInput("");
    } catch (err: any) {
      setSendError(err?.message || "Failed to send message");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedConversation = conversations.find((c: any) => c.id === selectedConversationId);

  return (
    <div className="bg-[#1a1a1a] w-full h-screen flex flex-col overflow-hidden">
      <header className="flex-shrink-0 w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" data-testid="link-logo" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>

        <div className="flex-1 max-w-md mx-2 sm:mx-8"></div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden pb-16 sm:pb-20">
        <aside className={`${selectedConversationId ? 'hidden md:block' : 'block'} w-full md:w-80 border-r border-gray-800 p-3 sm:p-4 overflow-y-auto`}>
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-teal-500" />
            <h2 className="text-white font-medium">Messages</h2>
          </div>
          
          {conversationsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2" data-testid="text-no-messages">No messages yet</p>
              <p className="text-gray-500 text-sm">
                Visit a user's profile and click Message to start a conversation
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv: any) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversationId === conv.id ? "bg-[#3a3a3a]" : "hover:bg-[#2a2a2a]"
                  }`}
                  data-testid={`card-chat-${conv.id}`}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                    {conv.otherUser?.avatarUrl ? (
                      <img src={conv.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate" data-testid={`text-chat-name-${conv.id}`}>
                      {conv.otherUser?.displayName || conv.otherUser?.username || "Unknown User"}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-gray-400 text-sm truncate">
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        <main className={`${selectedConversationId ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden`}>
          {selectedConversationId && selectedConversation ? (
            <>
              <div className="flex-shrink-0 p-3 sm:p-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden text-gray-400 hover:text-white"
                    onClick={() => setSelectedConversationId(null)}
                    data-testid="button-back-to-conversations"
                  >
                    <span className="text-lg">←</span>
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                    {selectedConversation.otherUser?.avatarUrl ? (
                      <img src={selectedConversation.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm sm:text-base" data-testid="text-chat-header-name">
                      {selectedConversation.otherUser?.displayName || selectedConversation.otherUser?.username}
                    </p>
                    <p className="text-gray-400 text-xs">
                      @{selectedConversation.otherUser?.username}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto min-h-0">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12" data-testid="text-no-conversation-messages">
                    No messages in this conversation yet. Say hello!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg: any) => {
                      const isOwnMessage = msg.senderId === currentUser?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwnMessage
                                ? "bg-teal-700 text-white"
                                : "bg-[#3a3a3a] text-white"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isOwnMessage ? "text-teal-200" : "text-gray-400"}`}>
                              {msg.createdAt && formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-800 bg-[#1a1a1a]">
                {sendError && (
                  <p className="text-red-400 text-sm mb-2 px-1">{sendError}</p>
                )}
                <div className="flex gap-2 sm:gap-3">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    data-testid="input-message"
                    className="flex-1 bg-[#2a2a2a] border border-gray-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-white focus:outline-none focus:border-gray-400"
                  />
                  <Button 
                    className="bg-teal-700 hover:bg-teal-600 px-3 sm:px-4" 
                    data-testid="button-send-message"
                    onClick={handleSendMessage}
                    disabled={sendMessage.isPending || !messageInput.trim()}
                  >
                    <Send className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">{sendMessage.isPending ? "Sending..." : "Send"}</span>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-lg" data-testid="text-select-conversation">Select a conversation</p>
                <p className="text-gray-500 text-sm mt-2">
                  Choose from your existing conversations or visit a profile to start a new one
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <BottomNav activePage="/messages" />
    </div>
  );
};

"use client";
import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

import {
  LogOut,
  MessageSquare,
  UserCircle,
  Calendar,
  FileText,
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Bot,
  User,
} from "lucide-react";

// ✅ Import Review Component
import PatientReview from "./PatientReview";

// ✅ Ensure Supabase exists
if (!supabase) {
  console.error("Supabase client could not be initialized.");
}

/* ---------------------------------------------------------------------- */
/* ✅ INLINE CHAT COMPONENT (UI Updated)                                   */
/* ---------------------------------------------------------------------- */
const PatientChat = () => {
  const { user } = useAuth();

  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hello! I'm your AI medical assistant. How can I help you today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ Log high severity to Supabase
  const logHighSeverityCase = async (
    prompt,
    imageBase64,
    aiResponse,
    severity,
    user
  ) => {
    const { data, error } = await supabase.from("chats").insert([
      {
        user_id: user.id,
        user_email: user.email,
        prompt: prompt,
        image_base64: imageBase64 || null,
        ai_response: aiResponse,
        severity: severity,
        doctor_response: null,
        doctor_id: null,
      },
    ]);

    if (error) console.error("Error logging case:", error);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
      imageUrl: imagePreview || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentText = inputText;
    let imageBase64 = "";

    setInputText("");
    setIsLoading(true);

    try {
      if (selectedImage) {
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(selectedImage);
        });

        removeImage();
      }

      const response = await fetch(
        selectedImage
          ? "http://localhost:5000/chat"
          : "http://localhost:5000/analyze-text",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            selectedImage
              ? { message: currentText, image: imageBase64 }
              : { text: currentText }
          ),
        }
      );

      // --- Mock Response (for testing without server) ---
      // const data = {
      //   disease: "Mock Dermatitis",
      //   confidence: "95.5",
      //   severity: "High",
      //   info: "This is a mock response.\n\n### Remedies\n- Avoid irritants.\n- Use moisturizer.\n\n**Disclaimer:** See a doctor."
      // };
      // await new Promise(res => setTimeout(res, 1500));
      // --- End Mock Response ---
      
      const data = await response.json();

      let aiText = "";
      if (data.disease) aiText += `🩺 Disease: ${data.disease}\n`;
      if (data.confidence) aiText += `🎯 Confidence: ${data.confidence}%\n`;
      if (data.severity) aiText += `⚕️ Severity: ${data.severity}\n\n`;
      if (data.info) aiText += `💊 Remedies & Info:\n${data.info}`;

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: aiText.trim(), // Use trimmed text
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // ✅ Log HIGH severity cases
      if (data.severity === "High") {
        await logHighSeverityCase(
          currentText,
          imageBase64,
          aiText.trim(), // Log trimmed text
          "High",
          user
        );
      }
    } catch (err) {
      console.error("Chat error:", err);
      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Sorry, I encountered an error. Please make sure the Flask server is running on port 5000.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[75vh] flex flex-col bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      {/* CHAT MESSAGES */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex space-x-3 max-w-[85%] ${
                  msg.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                    msg.sender === "user" ? "bg-blue-600" : "bg-green-500"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <User className="text-white w-5 h-5" />
                  ) : (
                    <Bot className="text-white w-5 h-5" />
                  )}
                </div>

                {/* Message */}
                <div className="flex flex-col space-y-1">
                  <div
                    className={`px-5 py-4 rounded-2xl shadow-md ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-200 text-gray-900"
                    }`}
                  >
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        className="rounded-lg mb-3 max-w-full h-auto border border-gray-100 shadow-sm"
                        alt="Uploaded"
                      />
                    )}

                    {/* ✅ Re-added AI response parsing */}
                    {msg.sender === 'ai' && msg.text.includes('🩺 Disease:') ? (
                      <div className="space-y-3 text-sm leading-relaxed">
                        {/* Disease Summary Card */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <p className="font-semibold text-blue-800">
                            {msg.text.match(/🩺 Disease: (.*)/)?.[0] || ''}
                          </p>
                          <p className="text-blue-700">
                            {msg.text.match(/🎯 Confidence: (.*)/)?.[0] || ''}
                          </p>
                          <p className="text-blue-700">
                            {msg.text.match(/⚕️ Severity: (.*)/)?.[0] || ''}
                          </p>
                        </div>
                        {/* Remedies Section */}
                        {msg.text.includes('💊 Remedies') && (
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <p className="font-semibold text-green-800 mb-2">
                              💊 Remedies & Information
                            </p>
                            <div
                              className="prose prose-sm max-w-none text-gray-800"
                              dangerouslySetInnerHTML={{
                                __html: msg.text
                                  .substring(msg.text.indexOf('💊 Remedies & Info:') + 19)
                                  .trim()
                                  .replace(/\n/g, '<br/>')
                                  .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                                  .replace(/### (.*?)<br\/>/g, '<h3 class="text-lg font-semibold text-gray-900 mb-2 mt-3">$1</h3>'),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    )}
                  </div>
                  <p
                    className={`text-xs text-gray-500 mt-1 ${
                      msg.sender === "user" ? "text-right" : ""
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* ✅ Re-added Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex space-x-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-gray-700" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT (Styling Updated) */}
        <div className="border-t bg-white px-4 py-4 flex-shrink-0">
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img src={imagePreview} className="h-20 rounded-lg" alt="Preview" />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Upload image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageSelect}
              accept="image/*"
            />

            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())
              }
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />

            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputText.trim() && !selectedImage)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------- */
/* ✅ MAIN DASHBOARD PAGE (Unchanged)                                      */
/* ---------------------------------------------------------------------- */

export default function PatientPage() {
  const { signOut, profile } = useAuth();

  const [openChat, setOpenChat] = useState(false);
  const [openReview, setOpenReview] = useState(false); // ✅ New State

  const handleLogout = async () => {
    await signOut();
    console.log("Logged out.");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-blue-700">
          Welcome, {profile?.full_name || "Patient"}
        </h1>

        <div className="flex items-center gap-4">
          {(openChat || openReview) && (
            <button
              onClick={() => {
                setOpenChat(false);
                setOpenReview(false);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* ✅ CONDITIONAL RENDERING */}
      {openChat ? (
        <div className="bg-white p-4 rounded-xl shadow-lg">
          <PatientChat />
        </div>
      ) : openReview ? (
        <div className="bg-white p-4 rounded-xl shadow-lg">
          <PatientReview />
        </div>
      ) : (
        /* ✅ DASHBOARD */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chat With Doctor */}
          <div
            className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-shadow flex items-center gap-4"
            onClick={() => setOpenChat(true)}
          >
            <MessageSquare size={40} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Chat With AI</h2>
              <p className="text-gray-600 text-sm">Start an AI conversation.</p>
            </div>
          </div>

          {/* Reviews */}
          <div
            className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-shadow flex items-center gap-4"
            onClick={() => setOpenReview(true)}
          >
            <FileText size={40} className="text-indigo-600" />
            <div>
              <h2 className="text-xl font-semibold">My Reviews</h2>
              <p className="text-gray-600 text-sm">
                View doctor responses & feedback.
              </p>
            </div>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-md flex items-center gap-4">
            <UserCircle size={40} className="text-green-600" />
            <div>
              <h2 className="text-xl font-semibold">My Profile</h2>
              <p className="text-gray-600 text-sm">View personal details.</p>
            </div>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-md flex items-center gap-4">
            <Calendar size={40} className="text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold">Appointments</h2>
              <p className="text-gray-600 text-sm">Your schedule.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

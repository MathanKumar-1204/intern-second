"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Send, Image as ImageIcon, Bot, User } from 'lucide-react';

const PatientChat = () => {
  const { profile, signOut } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hello! I'm your AI medical assistant. How can I help you today?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      imageUrl: imagePreview || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      let imageBase64 = '';
      if (selectedImage) {
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(selectedImage);
        });
      }

    const response = await fetch(
      selectedImage ? "http://localhost:5000/chat" : "http://localhost:5000/analyze-text",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          selectedImage
            ? { message: inputText, image: imageBase64 }
            : { text: inputText }
        ),
      }
    );


      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();

      let aiText = "";
      if (data.disease) {
        aiText += `🩺 Disease: ${data.disease}\n`;
        aiText += `🎯 Confidence: ${data.confidence}%\n`;
      }
      if (data.severity) {
        aiText += `⚕️ Severity: ${data.severity}\n\n`;
      }
      if (data.info) {
        aiText += `💊 Remedies & Info:\n${data.info}`;
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: aiText.trim(),
        sender: 'ai',
        timestamp: new Date(),
      };


      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please make sure the Flask server is running on port 5000.',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      removeImage();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {profile?.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{profile?.full_name}</h2>
              <p className="text-sm text-gray-500">Patient</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Chat Window */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((message) => (
  <div
    key={message.id}
    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`flex space-x-3 max-w-[85%] ${
        message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
          message.sender === 'user' ? 'bg-blue-600' : 'bg-green-500'
        }`}
      >
        {message.sender === 'user' ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message bubble */}
      <div className="flex flex-col space-y-1">
        <div
          className={`rounded-2xl px-5 py-4 shadow-md ${
            message.sender === 'user'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          }`}
        >
          {/* Image (if any) */}
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Uploaded"
              className="rounded-lg mb-3 max-w-full h-auto border border-gray-100 shadow-sm"
            />
          )}

          {/* Text message (AI or user) */}
          {message.sender === 'ai' && message.text.includes('🩺 Disease:') ? (
            <div className="space-y-3 text-sm leading-relaxed">
              {/* ✅ Disease Summary Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="font-semibold text-blue-800">
                  {message.text.match(/🩺 Disease: (.*)/)?.[0] || ''}
                </p>
                <p className="text-blue-700">
                  {message.text.match(/🎯 Confidence: (.*)/)?.[0] || ''}
                </p>
                <p className="text-blue-700">
                  {message.text.match(/⚕️ Severity: (.*)/)?.[0] || ''}
                </p>
              </div>

              {/* ✅ Remedies Section */}
              {message.text.includes('💊 Remedies') && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="font-semibold text-green-800 mb-2">
                    💊 Remedies & Information
                  </p>
                  <div
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{
                      __html: message.text
                        .replace(/\n/g, '<br/>')
                        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                        .replace(/### (.*?)<br\/>/g, '<h3 class="text-lg font-semibold text-gray-900 mb-2 mt-3">$1</h3>'),
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
          )}
        </div>

        {/* Timestamp */}
        <p
          className={`text-xs text-gray-500 mt-1 ${
            message.sender === 'user' ? 'text-right' : ''
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  </div>
))}

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

        {/* Input Section */}
        <div className="border-t bg-white px-4 py-4 flex-shrink-0">
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 rounded-lg" />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Upload image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputText.trim() && !selectedImage)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientChat;

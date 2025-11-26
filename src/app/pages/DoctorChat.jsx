"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Assumes supabase client is exported from this file
import { useAuth } from '../contexts/AuthContext'; // Assumes useAuth hook is exported from this file

// Import required icons
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Activity,
  AlertTriangle,
} from 'lucide-react';

const DoctorChatReview = () => {
  const { user } = useAuth(); // Get the logged-in doctor's details

  // State management
  const [view, setView] = useState('list'); // 'list' or 'detail'
  const [pendingChats, setPendingChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [doctorResponseText, setDoctorResponseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch pending chats (High severity, no doctor response)
  const fetchPendingChats = async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError("Supabase client not available.");
      setLoading(false);
      return;
    }

    try {
      // Fetch all high-severity cases that haven't been responded to
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('severity', 'High')
        .is('doctor_response', null);
      
      if (error) {
        throw error;
      }

      // Sort in JavaScript to avoid index issues
      const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setPendingChats(sortedData);

    } catch (err) {
      console.error("Error fetching pending chats:", err);
      setError(err.message || "Failed to fetch pending chats.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch chats when the component mounts
  useEffect(() => {
    fetchPendingChats();
  }, []);

  // Handle submitting the doctor's response
  const handleSubmitResponse = async () => {
    if (!doctorResponseText.trim() || !selectedChat || !user) {
      setError("Response text is empty or user/chat is not selected.");
      return;
    }

    setSubmitLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('chats')
        .update({
          doctor_response: doctorResponseText,
          doctor_id: user.id, // Store which doctor responded
        })
        .eq('id', selectedChat.id); // Update the specific chat entry

      if (error) {
        throw error;
      }

      // Success: Clear the form, go back to the list, and refresh
      setDoctorResponseText("");
      setSelectedChat(null);
      setView('list');
      await fetchPendingChats(); // Refresh the list to remove the completed item

    } catch (err) {
      console.error("Error submitting response:", err);
      setError(err.message || "Failed to submit response.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // --- Render View 1: List of Pending Chats ---
  const renderChatList = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">High Severity Cases</h2>
      
      {loading && <p className="text-gray-600">Loading pending cases...</p>}
      
      {error && (
        <p className="text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      {!loading && !error && pendingChats.length === 0 && (
        <p className="text-gray-600">No pending cases found. Great job!</p>
      )}

      <div className="space-y-4">
        {pendingChats.map(chat => (
          <div
            key={chat.id}
            onClick={() => {
              setSelectedChat(chat);
              setView('detail');
              setError(null); // Clear previous errors
            }}
            className="p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md hover:bg-white transition-all"
          >
            <div className="flex justify-between items-center">
              <p className="font-semibold text-gray-900">{chat.user_email}</p>
              <span className="flex items-center gap-1.5 text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                <AlertTriangle size={14} />
                {chat.severity}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate mt-1">
              {chat.prompt || "Image submission"}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Reported: {new Date(chat.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // --- Render View 2: Detailed Chat Review ---
  const renderChatDetail = () => {
    if (!selectedChat) {
      // This should not happen if view is 'detail', but as a safeguard
      setView('list');
      return null;
    }

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Review Case</h2>
          <button
            onClick={() => {
              setView('list');
              setSelectedChat(null);
              setDoctorResponseText("");
              setError(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to List
          </button>
        </div>

        {/* Patient & AI Chat History */}
        <div className="space-y-5 mb-8">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Case Details</h3>
            <p className="text-gray-700">Patient Email: <span className="font-medium">{selectedChat.user_email}</span></p>
            <p className="text-gray-700">Patient ID: <span className="font-medium">{selectedChat.user_id}</span></p>
            <p className="text-gray-600 text-sm">Reported: {new Date(selectedChat.created_at).toLocaleString()}</p>
          </div>

          {/* Patient Prompt */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 mb-1">Patient Submission</p>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm">
                <p className="text-sm whitespace-pre-wrap break-words text-gray-900">
                  {selectedChat.prompt || <span className="italic">No text submitted with image.</span>}
                </p>
                {selectedChat.image_base64 && (
                  <img
                    src={selectedChat.image_base64}
                    alt="Patient upload"
                    className="rounded-lg mt-3 max-w-xs h-auto border-2 border-white shadow-md"
                  />
                )}
              </div>
            </div>
          </div>

          {/* AI Response */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 mb-1">AI Analysis</p>
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl shadow-sm">
                <p className="text-sm whitespace-pre-wrap break-words text-gray-900">
                  {selectedChat.ai_response}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Response Section */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            <Activity size={20} className="inline-block mr-2 text-blue-600" />
            Your Response
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Your response will be logged. Please provide clear instructions or advice for the patient.
          </p>
          <textarea
            value={doctorResponseText}
            onChange={(e) => setDoctorResponseText(e.target.value)}
            placeholder="Enter your professional advice or next steps for the patient..."
            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            disabled={submitLoading}
          />
          <button
            onClick={handleSubmitResponse}
            disabled={submitLoading || !doctorResponseText.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            {submitLoading ? "Submitting..." : "Submit Response"}
          </button>
          {error && <p className="text-red-600 mt-3">{error}</p>}
        </div>
      </div>
    );
  };

  // Main component render logic
  return (
    <div className="container mx-auto px-4 py-8">
      {view === 'list' ? renderChatList() : renderChatDetail()}
    </div>
  );
};

export default DoctorChatReview;

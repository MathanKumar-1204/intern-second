"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabase"; // Ensure this path is correct
import {
  ArrowLeft,
  Bot,
  User,
  Activity,
} from 'lucide-react';

const PatientCaseReview = () => {
  const [userId, setUserId] = useState(null);
  
  // State management
  const [view, setView] = useState('list'); // 'list' or 'detail'
  const [reviewedCases, setReviewedCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. GET REAL USER SESSION ON MOUNT
  useEffect(() => {
    const getUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.log("No active session found");
        setLoading(false);
        return;
      }
      setUserId(session.user.id);
    };
    getUser();
  }, []);

  // 2. FETCH ONLY THIS USER'S CASES
  useEffect(() => {
    if (userId) {
      fetchReviewedCases();
    }
  }, [userId]);

  const fetchReviewedCases = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching cases for User ID:", userId);

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)                 // STRICT FILTER: Only current user
        .eq('severity', 'High')                // Only High severity
        .not('doctor_response', 'is', null)    // Only with responses
        .order('created_at', { ascending: false }); // Order by database (newest first)

      if (error) throw error;

      console.log("Cases found:", data); // Debugging
      setReviewedCases(data || []);

    } catch (err) {
      console.error("Error fetching cases:", err);
      setError("Failed to load your cases.");
    } finally {
      setLoading(false);
    }
  };

  // --- Render View 1: List of Reviewed Cases ---
  const renderCaseList = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Doctor Responses</h2>
      
      {loading && <p className="text-gray-600 animate-pulse">Loading your cases...</p>}
      
      {/* Error State */}
      {error && (
        <p className="text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</p>
      )}

      {/* Empty State */}
      {!loading && !error && reviewedCases.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No doctor responses found for your high-severity cases yet.</p>
        </div>
      )}

      {/* List of Cases */}
      <div className="space-y-4">
        {reviewedCases.map(chat => (
          <div
            key={chat.id}
            onClick={() => {
              setSelectedCase(chat);
              setView('detail');
              setError(null);
            }}
            className="p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md hover:bg-blue-50 hover:border-blue-200 transition-all"
          >
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-gray-900">
                {new Date(chat.created_at).toLocaleDateString()} at {new Date(chat.created_at).toLocaleTimeString()}
              </p>
              <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
                <Activity size={12} />
                Doctor Reviewed
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">
              <span className="font-medium text-gray-800">Query: </span>
              {chat.prompt || "Image submission"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // --- Render View 2: Detailed Case Review ---
  const renderCaseDetail = () => {
    if (!selectedCase) return null;

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Case Details</h2>
          <button
            onClick={() => {
              setView('list');
              setSelectedCase(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <ArrowLeft size={18} />
            Back to List
          </button>
        </div>

        <div className="space-y-6">
          {/* 1. Patient Submission */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-700 mb-2">Your Submission</p>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {selectedCase.prompt || <span className="italic text-gray-500">No description provided.</span>}
                </p>
                {selectedCase.image_base64 && (
                  <div className="mt-4">
                    <img
                      src={selectedCase.image_base64}
                      alt="Your upload"
                      className="rounded-lg max-w-sm w-full h-auto border border-gray-200 shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. AI Analysis */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-700 mb-2">AI Analysis</p>
              <div className="bg-gray-100 border border-gray-200 p-4 rounded-xl">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {selectedCase.ai_response}
                </p>
              </div>
            </div>
          </div>
          
          {/* 3. Doctor Response (Highlighted) */}
          <div className="flex gap-4 pt-2">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 shadow-md ring-4 ring-purple-100">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-2">
                Doctor's Official Advice
                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">Verified</span>
              </p>
              <div className="bg-gradient-to-r from-purple-50 to-white border border-purple-200 p-5 rounded-xl shadow-sm">
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {selectedCase.doctor_response}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!userId && !loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Please log in to view your cases.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {view === 'list' ? renderCaseList() : renderCaseDetail()}
    </div>
  );
};

export default PatientCaseReview;
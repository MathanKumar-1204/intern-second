"use client";
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Users, MessageSquare, Activity, Clock, ArrowLeft } from 'lucide-react';
import DoctorChatReview from './DoctorChat';

const DoctorDashboard = () => {
  const { profile, signOut } = useAuth();
  const [view, setView] = useState("dashboard"); 
  // dashboard | review

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* TOP NAV */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {profile?.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Dr. {profile?.full_name}</h2>
              <p className="text-sm text-gray-500">Medical Professional</p>
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

      {/* ✅ CONDITIONAL RENDERING */}
      <div className="container mx-auto px-4 py-8">

        {view === "dashboard" && (
          <>
            {/* DASHBOARD HOME */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Doctor Dashboard</h1>
              <p className="text-gray-600">Welcome back, Dr. {profile?.full_name}</p>
            </div>

            {/* STATS CARDS */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">24</h3>
                <p className="text-gray-600 text-sm">Total Patients</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">12</h3>
                <p className="text-gray-600 text-sm">Active Chats</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">3</h3>
                <p className="text-gray-600 text-sm">Pending Reviews</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">98%</h3>
                <p className="text-gray-600 text-sm">Response Rate</p>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid lg:grid-cols-2 gap-6">

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

                <div className="space-y-3">
                  <button className="w-full p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200">
                    <p className="font-medium text-blue-900">View Patient Records</p>
                    <p className="text-sm text-blue-700 mt-1">Access patient history and files</p>
                  </button>

                  <button className="w-full p-4 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200">
                    <p className="font-medium text-green-900">Start New Consultation</p>
                    <p className="text-sm text-green-700 mt-1">Begin a new patient session</p>
                  </button>

                  {/* ✅ Button to open DoctorChatReview */}
                  <button
                    onClick={() => setView("review")}
                    className="w-full p-4 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200"
                  >
                    <p className="font-medium text-orange-900">Review Pending Cases</p>
                    <p className="text-sm text-orange-700 mt-1">Check cases awaiting your review</p>
                  </button>

                </div>
              </div>

            </div>
          </>
        )}

        {/* ✅ RENDER DOCTOR CHAT REVIEW */}
        {view === "review" && (
          <div>
            <button
              onClick={() => setView("dashboard")}
              className="mb-6 flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>

            <DoctorChatReview />
          </div>
        )}

      </div>

    </div>
  );
};

export default DoctorDashboard;

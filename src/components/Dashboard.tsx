/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  Pause,
  Trash2,
  Edit2,
  Search,
  LogOut,
  Settings,
  Bell,
  Clock,
  Folder,
  BarChart,
  Grid,
  Plus,
  Check,
  X,
  SlidersHorizontal,
  FolderKanban,
  DollarSign
} from "lucide-react";
import { User, Session } from "../types";
import {
  formatTimeHMS,
  formatFriendlyDuration,
  formatDate,
  calculateEarnings,
  isWithinLast7Days,
  getInitialMockSessions
} from "../utils";
import { motion, AnimatePresence } from "motion/react";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const AVAILABLE_PROJECTS = [
  "Brand Identity",
  "Product Design",
  "UX Writing",
  "No Project"
];

const PROJECT_BADGE_COLORS: Record<string, string> = {
  "Brand Identity": "bg-[#e2dfff] text-[#1f108e]",
  "Product Design": "bg-[#d3e4fe] text-[#0f0069]",
  "UX Writing": "bg-[#ffdbcc] text-[#7a3003]",
  "No Project": "bg-gray-100 text-gray-600"
};

export default function Dashboard({ user, onLogout }: DashboardProps) {
  // Navigation State: 'timer' | 'history' | 'projects' | 'reports'
  const [activeTab, setActiveTab] = useState<"timer" | "history" | "projects" | "reports">("timer");

  // User Profile States
  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    const savedRate = localStorage.getItem(`rate_${user.id}`);
    return savedRate ? Number(savedRate) : user.hourlyRate;
  });

  // Trackers
  const [description, setDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState("Brand Identity");
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Database / State Memory for Sessions
  const [sessions, setSessions] = useState<Session[]>([]);

  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "duration-desc" | "duration-asc">("date-desc");
  const [filterProject, setFilterProject] = useState<string>("All");

  // Edit Session States
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editProj, setEditProj] = useState("");
  const [editHours, setEditHours] = useState(0);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editSeconds, setEditSeconds] = useState(0);
  const [editRate, setEditRate] = useState(60);

  // Timer Ref for native setInterval
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load user sessions on boot
  useEffect(() => {
    const storedKey = `sessions_${user.id}`;
    const raw = localStorage.getItem(storedKey);
    if (raw) {
      try {
        setSessions(JSON.parse(raw));
      } catch (err) {
        console.error("Failed to parse sessions", err);
      }
    } else {
      // populate with pristine mockup sessions
      const initial = getInitialMockSessions(user.id);
      setSessions(initial);
      localStorage.setItem(storedKey, JSON.stringify(initial));
    }
  }, [user.id]);

  // Persist sessions whenever they modify
  const saveSessionsToStorage = (updatedSessions: Session[]) => {
    setSessions(updatedSessions);
    localStorage.setItem(`sessions_${user.id}`, JSON.stringify(updatedSessions));
  };

  // Persist Hourly Rate
  const handleRateChange = (newRate: number) => {
    setHourlyRate(newRate);
    localStorage.setItem(`rate_${user.id}`, String(newRate));
  };

  // Timer loop controllers
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const handleStartTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      setIsPaused(false);
    } else {
      // Toggle pause/resume
      setIsPaused(!isPaused);
    }
  };

  const handleStopTimer = () => {
    if (!isRunning) return;

    // Save current session
    const newSession: Session = {
      id: "session-" + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      description: description.trim() || "Untitled Task Session",
      project: selectedProject,
      secondsElapsed: seconds,
      hourlyRate: hourlyRate,
      createdAt: new Date().toISOString()
    };

    const updated = [newSession, ...sessions];
    saveSessionsToStorage(updated);

    // Reset Tracking Board
    setIsRunning(false);
    setIsPaused(false);
    setSeconds(0);
    setDescription("");
    // Show toast or navigate to history
    setActiveTab("timer");
  };

  const handleDeleteSession = (id: string) => {
    if (confirm("Are you sure you want to delete this tracked session?")) {
      const filtered = sessions.filter((s) => s.id !== id);
      saveSessionsToStorage(filtered);
    }
  };

  const handleStartEdit = (session: Session) => {
    setEditingSession(session);
    setEditDesc(session.description);
    setEditProj(session.project);
    setEditRate(session.hourlyRate !== undefined ? session.hourlyRate : hourlyRate);
    
    // Convert seconds elapsed back to hours/mins/secs
    const h = Math.floor(session.secondsElapsed / 3600);
    const m = Math.floor((session.secondsElapsed % 3600) / 60);
    const s = session.secondsElapsed % 60;
    
    setEditHours(h);
    setEditMinutes(m);
    setEditSeconds(s);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    const totalSecs = (editHours * 3600) + (editMinutes * 60) + editSeconds;

    const updated = sessions.map((s) => {
      if (s.id === editingSession.id) {
        return {
          ...s,
          description: editDesc.trim() || "Untitled Task Session",
          project: editProj,
          secondsElapsed: totalSecs,
          hourlyRate: editRate
        };
      }
      return s;
    });

    saveSessionsToStorage(updated);
    setEditingSession(null);
  };

  // Filtering & Sorting computations
  const filteredSessions = sessions
    .filter((s) => {
      const matchSearch = s.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchProject = filterProject === "All" || s.project === filterProject;
      return matchSearch && matchProject;
    })
    .sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "date-asc") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "duration-desc") {
        return b.secondsElapsed - a.secondsElapsed;
      }
      if (sortBy === "duration-asc") {
        return a.secondsElapsed - b.secondsElapsed;
      }
      return 0;
    });

  // Weekly Stats calculation (last 7 days from relative date May 29, 2026)
  const currentRefTime = "2026-05-29T13:54:20Z";
  const weeklySessions = sessions.filter((s) => isWithinLast7Days(s.createdAt, currentRefTime));
  
  const totalWeeklySeconds = weeklySessions.reduce((acc, s) => acc + s.secondsElapsed, 0);
  
  const weeklyHours = Math.floor(totalWeeklySeconds / 3600);
  const weeklyMins = Math.floor((totalWeeklySeconds % 3600) / 60);
  const formattedWeeklyTime = `${weeklyHours}h ${weeklyMins}min`;
  
  // Total Estimated Earnings weekly
  const totalWeeklyEarnings = weeklySessions.reduce((acc, s) => acc + calculateEarnings(s.secondsElapsed, s.hourlyRate !== undefined ? s.hourlyRate : hourlyRate), 0);

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col font-sans selection:bg-[#c3c0ff] selection:text-[#0f0069]">
      
      {/* Top Header navbar */}
      <header className="bg-white border-b border-[#dae2fd] fixed top-0 left-0 w-full z-45 h-16">
        <div className="flex justify-between items-center h-full px-6 md:px-12 max-w-[1280px] mx-auto w-full">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold text-[#1f108e] tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#1f108e] animate-pulse" />
              ChronoFocus
            </span>
            <nav className="hidden md:flex gap-6 h-16 items-center">
              <button
                onClick={() => setActiveTab("timer")}
                className={`h-full flex items-center px-2 transition-colors border-b-2 font-medium text-sm ${
                  activeTab === "timer"
                    ? "text-[#1f108e] border-[#1f108e]"
                    : "text-[#464553] border-transparent hover:text-[#1f108e]"
                }`}
              >
                Timer
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`h-full flex items-center px-2 transition-colors border-b-2 font-medium text-sm ${
                  activeTab === "history"
                    ? "text-[#1f108e] border-[#1f108e]"
                    : "text-[#464553] border-transparent hover:text-[#1f108e]"
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab("projects")}
                className={`h-full flex items-center px-2 transition-colors border-b-2 font-medium text-sm ${
                  activeTab === "projects"
                    ? "text-[#1f108e] border-[#1f108e]"
                    : "text-[#464553] border-transparent hover:text-[#1f108e]"
                }`}
              >
                Projects
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-[#464553] hover:bg-[#f2f3ff] p-2 transition-colors duration-150 cursor-pointer rounded-full relative">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full"></span>
            </button>
            <button className="text-[#464553] hover:bg-[#f2f3ff] p-2 transition-colors duration-150 cursor-pointer rounded-full">
              <Settings className="w-4.5 h-4.5" />
            </button>
            <div className="h-8 w-px bg-[#dae2fd] hidden md:block"></div>
            <div className="flex items-center gap-2">
              <img
                alt={user.name}
                className="w-8 h-8 rounded-full border border-[#dae2fd]"
                src={user.avatarUrl}
              />
              <span className="hidden md:block text-xs font-semibold text-[#131b2e]">{user.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Structural Frame */}
      <div className="flex flex-1 pt-16 pb-20">
        
        {/* Sidebar for Desktop */}
        <aside className="fixed left-0 top-16 h-[calc(100vh-120px)] w-64 bg-[#f2f3ff] border-r border-[#dae2fd] hidden lg:flex flex-col p-6 overflow-y-auto">
          
          {/* Identity Widget */}
          <div className="flex items-center gap-3 mb-8">
            <img
              alt={user.name}
              className="w-10 h-10 rounded-lg object-cover"
              src={user.avatarUrl}
            />
            <div>
              <p className="font-bold text-[#1f108e] text-sm leading-tight">{user.name}</p>
              <p className="text-[11px] font-semibold text-[#464553] uppercase tracking-wide mt-0.5">{user.role}</p>
            </div>
          </div>

          {/* Hourly Rate Tool */}
          <div className="mb-8 border-b border-[#dae2fd] pb-6">
            <label className="block text-[10px] font-bold tracking-wider text-[#464553] uppercase mb-2">
              Hourly Rate
            </label>
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-xs">$</span>
              <input
                className="w-full bg-white border border-[#c8c4d5] pl-7 pr-12 py-2 text-xs focus:border-[#1f108e] focus:ring-0 outline-none transition-colors duration-150 rounded"
                id="hourlyRateInput"
                placeholder="0.00"
                type="number"
                min="0"
                value={hourlyRate}
                onChange={(e) => handleRateChange(Number(e.target.value) || 0)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">/HR</span>
            </div>
          </div>

          {/* Sidebar Nav links */}
          <nav className="flex flex-col gap-1 gap-y-1.5 flex-1">
            <button
              onClick={() => setActiveTab("timer")}
              className={`flex items-center gap-3 p-3 rounded font-semibold text-xs leading-none transition-all duration-150 text-left ${
                activeTab === "timer"
                  ? "bg-[#dae2fd] text-[#1f108e]"
                  : "text-[#464553] hover:bg-[#eaedff] hover:text-[#1f108e]"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Active Timer</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-3 p-3 rounded font-semibold text-xs leading-none transition-all duration-150 text-left ${
                activeTab === "history"
                  ? "bg-[#dae2fd] text-[#1f108e]"
                  : "text-[#464553] hover:bg-[#eaedff] hover:text-[#1f108e]"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Full History</span>
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={`flex items-center gap-3 p-3 rounded font-semibold text-xs leading-none transition-all duration-150 text-left ${
                activeTab === "projects"
                  ? "bg-[#dae2fd] text-[#1f108e]"
                  : "text-[#464553] hover:bg-[#eaedff] hover:text-[#1f108e]"
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Projects ({AVAILABLE_PROJECTS.length - 1})</span>
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex items-center gap-3 p-3 rounded font-semibold text-xs leading-none transition-all duration-150 text-left ${
                activeTab === "reports"
                  ? "bg-[#dae2fd] text-[#1f108e]"
                  : "text-[#464553] hover:bg-[#eaedff] hover:text-[#1f108e]"
              }`}
            >
              <BarChart className="w-4 h-4" />
              <span>Earnings Report</span>
            </button>
          </nav>

          <div className="mt-auto border-t border-[#dae2fd] pt-4">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 p-3 rounded font-semibold text-xs text-[#464553] hover:bg-red-50 hover:text-[#ba1a1a] transition-all duration-150"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Content View Canvas Area */}
        <main className="flex-grow lg:ml-64 px-6 md:px-12 py-8 max-w-[1024px] mx-auto w-full">
          
          {/* Active Timer view */}
          {activeTab === "timer" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-full max-w-2xl mb-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-bold tracking-wider text-[#464553] mb-1.5 uppercase">
                      Current Task Description
                    </label>
                    <input
                      className="w-full bg-transparent border border-[#c8c4d5] px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#1f108e] focus:ring-1 focus:ring-[#1f108e] outline-none transition-all duration-150"
                      placeholder="What are you working on?"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold tracking-wider text-[#464553] mb-1.5 uppercase">
                      Classification Tag
                    </label>
                    <select
                      className="w-full bg-white border border-[#c8c4d5] px-3 py-2.5 text-sm focus:border-[#1f108e] outline-none rounded-none text-gray-700"
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                    >
                      {AVAILABLE_PROJECTS.map((proj) => (
                        <option key={proj} value={proj}>
                          📂 {proj}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold tracking-wider text-[#464553] mb-1.5 uppercase">
                      Active Rate ($/hr)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">$</span>
                      <input
                        className="w-full bg-white border border-[#c8c4d5] pl-7 pr-12 py-2.5 text-sm focus:border-[#1f108e] outline-none transition-all duration-150 rounded-none text-[#131b2e] font-semibold tabular-nums"
                        placeholder="0.00"
                        type="number"
                        min="0"
                        value={hourlyRate}
                        onChange={(e) => handleRateChange(Number(e.target.value) || 0)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">/HR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Massive Clock Trigger */}
              <div className="flex flex-col items-center mb-12">
                <h2
                  className={`text-[68px] md:text-[84px] font-semibold tracking-tighter tabular-nums leading-none select-none my-4 transition-colors duration-300 ${
                    isRunning && !isPaused ? "text-[#1f108e]" : "text-[#131b2e]"
                  }`}
                >
                  {formatTimeHMS(seconds)}
                </h2>

                <div className="flex gap-4 w-full max-w-sm mt-4">
                  <button
                    onClick={handleStartTimer}
                    className={`flex-1 font-bold py-4 px-6 focus:outline-none flex items-center justify-center gap-2 text-sm transition-all duration-150 ${
                      isRunning && !isPaused
                        ? "bg-[#505f76] text-white hover:opacity-90"
                        : "bg-[#1f108e] text-white hover:opacity-90 active:opacity-100"
                    }`}
                  >
                    {isRunning && !isPaused ? (
                      <>
                        <Pause className="w-4 h-4 fill-white" />
                        <span>PAUSE</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>{seconds > 0 ? "RESUME" : "START"}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleStopTimer}
                    disabled={!isRunning}
                    className={`flex-1 font-bold py-4 px-6 border focus:outline-none flex items-center justify-center gap-2 text-sm transition-all duration-150 ${
                      isRunning
                        ? "border-[#ba1a1a] text-[#ba1a1a] bg-white hover:bg-red-50 cursor-pointer"
                        : "border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed opacity-40"
                    }`}
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>STOP</span>
                  </button>
                </div>
              </div>

              {/* Small inline Mini-History (Preview below tracking space) */}
              <div className="w-full mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-sm text-[#131b2e] uppercase tracking-wider">
                    Recent Work Logs
                  </h3>
                  <button
                    onClick={() => setActiveTab("history")}
                    className="text-xs text-[#1f108e] font-bold hover:underline"
                  >
                    View All Logs
                  </button>
                </div>

                <div className="bg-white border border-[#dae2fd] overflow-hidden">
                  {sessions.slice(0, 3).map((sess) => (
                    <div
                      key={sess.id}
                      className="border-b border-gray-100 last:border-b-0 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 hover:bg-[#faf8ff] transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-sm text-[#131b2e]">
                            {sess.description}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                              PROJECT_BADGE_COLORS[sess.project] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {sess.project}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 mt-1 block">
                          {formatDate(sess.createdAt)} • {formatFriendlyDuration(sess.secondsElapsed)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <span className="text-sm font-semibold tabular-nums">
                          ${calculateEarnings(sess.secondsElapsed, sess.hourlyRate !== undefined ? sess.hourlyRate : hourlyRate).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleStartEdit(sess)}
                            className="text-gray-400 hover:text-[#1f108e] p-1 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(sess.id)}
                            className="text-gray-400 hover:text-[#ba1a1a] p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="p-8 text-center text-sm text-gray-400">
                      No tracked sessions found. Start the timer to begin!
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Full History with Filters, Search, Sorts & Bulk edits */}
          {activeTab === "history" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-[#c8c4d5]"
            >
              {/* Filter Suite */}
              <div className="p-6 border-b border-[#dae2fd] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#131b2e]">Detailed Time Card History</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Manage and edit tracked designer labor sessions.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className="w-full pl-9 pr-4 py-2 bg-[#faf8ff] border border-[#c8c4d5] text-xs focus:border-[#1f108e] focus:ring-0 outline-none rounded-none"
                      placeholder="Filter by description..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <select
                    className="bg-[#faf8ff] border border-[#c8c4d5] text-xs px-3 py-2 outline-none"
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                  >
                    <option value="All">All Projects</option>
                    {AVAILABLE_PROJECTS.map((proj) => (
                      <option key={proj} value={proj}>
                        {proj}
                      </option>
                    ))}
                  </select>

                  <select
                    className="bg-[#faf8ff] border border-[#c8c4d5] text-xs px-3 py-2 outline-none cursor-pointer"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="duration-desc">Longest Session</option>
                    <option value="duration-asc">Shortest Session</option>
                  </select>
                </div>
              </div>

              {/* Session Grid/Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f2f3ff] border-b border-[#dae2fd]">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#464553] uppercase">
                        Date
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#464553] uppercase">
                        Description & Category
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#464553] uppercase">
                        Duration
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#464553] uppercase">
                        Amount (Rate)
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#464553] uppercase text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSessions.map((sess) => (
                      <tr
                        key={sess.id}
                        className="hover:bg-[#faf8ff] transition-all duration-100 group"
                      >
                        <td className="px-6 py-4 text-xs text-[#464553] whitespace-nowrap">
                          {formatDate(sess.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-[13px] text-[#131b2e]">
                              {sess.description}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm w-fit mt-1 ${
                                PROJECT_BADGE_COLORS[sess.project] || "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {sess.project}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold tabular-nums text-[#131b2e]">
                              {formatTimeHMS(sess.secondsElapsed)}
                            </span>
                            <span className="text-[10px] text-gray-400 mt-0.5">
                              {formatFriendlyDuration(sess.secondsElapsed)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-[#1f108e] tabular-nums">
                          <div className="flex flex-col">
                            <span>
                              ${calculateEarnings(sess.secondsElapsed, sess.hourlyRate !== undefined ? sess.hourlyRate : hourlyRate).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                            <span className="text-[9px] font-semibold text-gray-400 mt-0.5">
                              ${sess.hourlyRate !== undefined ? sess.hourlyRate : hourlyRate}/hr
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleStartEdit(sess)}
                              className="text-gray-400 hover:text-[#1f108e] p-1.5 transition-colors rounded-full hover:bg-[#faf8ff]"
                              title="Edit record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(sess.id)}
                              className="text-gray-400 hover:text-[#ba1a1a] p-1.5 transition-colors rounded-full hover:bg-red-50"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredSessions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-sm text-gray-400">
                          No sessions match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Dynamic projects view */}
          {activeTab === "projects" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-[#c8c4d5] p-6"
            >
              <h2 className="text-lg font-bold text-[#131b2e] mb-2">Workspace Project Portfolios</h2>
              <p className="text-xs text-gray-400 mb-6 border-b border-[#dae2fd] pb-4">
                Hourly tracking metrics breakdown by active creative fields.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_PROJECTS.map((proj) => {
                  const projSessions = sessions.filter((s) => s.project === proj);
                  const totalSecsComp = projSessions.reduce((acc, s) => acc + s.secondsElapsed, 0);
                  const earningsComp = projSessions.reduce((acc, s) => acc + calculateEarnings(s.secondsElapsed, s.hourlyRate !== undefined ? s.hourlyRate : hourlyRate), 0);
                  
                  return (
                    <div
                      key={proj}
                      className="border border-[#dae2fd] p-5 flex flex-col justify-between hover:border-[#1f108e] transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 ${
                            PROJECT_BADGE_COLORS[proj] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {proj}
                        </span>
                        <span className="text-[10px] font-bold text-[#464553] uppercase">
                          {projSessions.length} sessions
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline mt-2">
                        <div>
                          <p className="text-[10px] text-[#464553] font-bold uppercase">Time Tracked</p>
                          <p className="text-lg font-bold tabular-nums text-[#131b2e]">
                            {formatTimeHMS(totalSecsComp)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[#464553] font-bold uppercase">Estimated Billable</p>
                          <p className="text-lg font-bold text-[#1f108e] tabular-nums">
                            ${earningsComp.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Earnings & Reports section */}
          {activeTab === "reports" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-[#c8c4d5] p-6"
            >
              <h2 className="text-lg font-bold text-[#131b2e] mb-2">Designer Financial Statement</h2>
              <p className="text-xs text-gray-400 mb-6 border-b border-[#dae2fd] pb-4">
                Detailed report of total hours tracked and estimated billings.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#f2f3ff] p-5 border border-[#dae2fd]">
                  <p className="text-[10px] text-[#464553] font-bold uppercase mb-1">Lifetime Sessions</p>
                  <p className="text-[32px] font-bold text-[#131b2e] leading-none tracking-tight">
                    {sessions.length}
                  </p>
                </div>
                <div className="bg-[#f2f3ff] p-5 border border-[#dae2fd]">
                  <p className="text-[10px] text-[#464553] font-bold uppercase mb-1">Total Hours Tracked</p>
                  <p className="text-[32px] font-bold text-[#131b2e] leading-none tracking-tight tabular-nums">
                    {formatFriendlyDuration(sessions.reduce((acc, s) => acc + s.secondsElapsed, 0))}
                  </p>
                </div>
                <div className="bg-[#eaedff] p-5 border border-[#1f108e]/35">
                  <p className="text-[10px] text-[#1f108e] font-bold uppercase mb-1">Estimated Billings</p>
                  <p className="text-[32px] font-bold text-[#1f108e] leading-none tracking-tight tabular-nums">
                    ${sessions
                      .reduce((acc, s) => acc + calculateEarnings(s.secondsElapsed, s.hourlyRate !== undefined ? s.hourlyRate : hourlyRate), 0)
                      .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Breakdown List */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase text-[#464553] tracking-wide mb-3">
                  Billable Breakdown (Last 7 Days)
                </h4>
                <div className="border border-[#dae2fd] divide-y divide-[#dae2fd]">
                  {weeklySessions.map((sess) => (
                    <div key={sess.id} className="p-4 flex justify-between items-center bg-white text-xs">
                      <div>
                        <p className="font-semibold text-sm">{sess.description}</p>
                        <p className="text-gray-400 mt-1">
                          {formatDate(sess.createdAt)} • {formatFriendlyDuration(sess.secondsElapsed)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#1f108e] text-sm">
                          ${calculateEarnings(sess.secondsElapsed, sess.hourlyRate !== undefined ? sess.hourlyRate : hourlyRate).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                        <p className="text-gray-400 mt-1 uppercase text-[9px] font-bold">{sess.project}</p>
                      </div>
                    </div>
                  ))}
                  {weeklySessions.length === 0 && (
                    <p className="p-8 text-center text-gray-400">No billable sessions found in the last 7 days.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </main>
      </div>

      {/* Persistent Widget Footer (Weekly summary in real-time) */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-[#dae2fd] py-4 px-6 md:px-12 h-14 select-none">
        <div className="max-w-[1024px] mx-auto flex flex-col md:flex-row justify-between items-center gap-2 h-full">
          <p className="text-xs text-[#464553] text-center md:text-left">
            © 2026 ChronoFocus. Weekly Summary:{" "}
            <span className="font-bold text-[#1f108e]">{formattedWeeklyTime} tracking active.</span>
            <span className="ml-3 font-medium">Estimated bookings: </span>
            <span className="font-bold text-[#1f108e]" id="weeklyEarnings">
              ${totalWeeklyEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </p>
          <div className="hidden sm:flex gap-6 text-xs text-[#464553]">
            <a href="#" className="hover:text-[#1f108e] transition-colors">Support</a>
            <a href="#" className="hover:text-[#1f108e] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#1f108e] transition-colors">Terms</a>
          </div>
        </div>
      </footer>

      {/* Editing Modal (Elegant Backdrop) */}
      <AnimatePresence>
        {editingSession && (
          <div className="fixed inset-0 bg-[#131b2e]/40 backdrop-blur-xs flex items-center justify-center p-4 z-55">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white w-full max-w-md border border-[#c8c4d5] shadow-lg overflow-hidden"
            >
              <div className="p-6 border-b border-[#dae2fd] flex justify-between items-center bg-[#f2f3ff]">
                <h3 className="font-bold text-sm uppercase tracking-wide text-[#1f108e]">
                  Edit Worked Session
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#464553] uppercase mb-1.5">
                    Session Description
                  </label>
                  <input
                    className="w-full bg-transparent border border-[#c8c4d5] px-3 py-2 text-sm focus:border-[#1f108e] focus:ring-0 outline-none"
                    type="text"
                    required
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#464553] uppercase mb-1.5">
                    Project tag / Classification
                  </label>
                  <select
                    className="w-full bg-white border border-[#c8c4d5] px-2.5 py-2 text-sm focus:border-[#1f108e] outline-none"
                    value={editProj}
                    onChange={(e) => setEditProj(e.target.value)}
                  >
                    {AVAILABLE_PROJECTS.map((proj) => (
                      <option key={proj} value={proj}>
                        {proj}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#464553] uppercase mb-1.5">
                    Adjust Labor Duration Time (HH:MM:SS)
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Hours</span>
                      <input
                        className="w-full bg-transparent border border-[#c8c4d5] px-2.5 py-1.5 text-sm outline-none focus:border-[#1f108e] text-center"
                        type="number"
                        min="0"
                        value={editHours}
                        onChange={(e) => setEditHours(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Minutes</span>
                      <input
                        className="w-full bg-transparent border border-[#c8c4d5] px-2.5 py-1.5 text-sm outline-none focus:border-[#1f108e] text-center"
                        type="number"
                        min="0"
                        max="59"
                        value={editMinutes}
                        onChange={(e) =>
                          setEditMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))
                        }
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Seconds</span>
                      <input
                        className="w-full bg-transparent border border-[#c8c4d5] px-2.5 py-1.5 text-sm outline-none focus:border-[#1f108e] text-center"
                        type="number"
                        min="0"
                        max="59"
                        value={editSeconds}
                        onChange={(e) =>
                          setEditSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#464553] uppercase mb-1.5">
                    Adjust Labor Rate ($/hr)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">$</span>
                    <input
                      className="w-full bg-transparent border border-[#c8c4d5] pl-7 pr-12 py-2 text-sm focus:border-[#1f108e] outline-none"
                      type="number"
                      min="0"
                      value={editRate}
                      onChange={(e) => setEditRate(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">/HR</span>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingSession(null)}
                    className="border border-[#c8c4d5] text-xs font-semibold px-4 py-2.5 text-gray-500 hover:bg-gray-50 uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#1f108e] text-white text-xs font-semibold px-5 py-2.5 hover:opacity-90 active:opacity-100 uppercase tracking-wider"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getRooms, createRoom, joinRoom, getMe } from "../api/index";
import { useAuthStore } from "../store/authStore";
import {
  BookOpen, Plus, Link2, RefreshCw, LogOut,
  Star, Home, ChevronRight, Music, Lock, Globe,
  Layers, Hash, X, Users, AlertCircle
} from "lucide-react";

const AMBIENTS = ["none","lofi","rain","cafe","forest"];
const ACCENT_COLORS = ["#7c6af7","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6"];

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", ambient_sound: "lofi", is_public: true });
  const [createLoading, setCreateLoading] = useState(false);

  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const [roomsData, meData] = await Promise.all([
        getRooms().catch(() => []),
        getMe().catch(() => null),
      ]);
      setRooms(Array.isArray(roomsData) ? roomsData : roomsData?.rooms || []);
      setUser(meData);
    } catch (e) {
      setError("Failed to load dashboard: " + (e?.response?.data?.detail || e.message));
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreateLoading(true); setError(null);
    try {
      const room = await createRoom(form);
      setRooms([room, ...rooms]);
      setShowCreate(false);
      setForm({ name: "", subject: "", ambient_sound: "lofi", is_public: true });
      navigate(`/room/${room.id}`);
    } catch (e) {
      setError("Failed to create room: " + (e?.response?.data?.detail || e.message));
    } finally { setCreateLoading(false); }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true); setError(null);
    try {
      const room = await joinRoom(joinCode.trim().toUpperCase());
      navigate(`/room/${room.id}`);
    } catch (e) {
      setError("Invalid invite code: " + (e?.response?.data?.detail || e.message));
    } finally { setJoinLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d14", color: "#e2e8f0", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Navbar */}
      <nav style={{ padding: "0 32px", height: 64, display: "flex", alignItems: "center", background: "#13131f", borderBottom: "1px solid #222238", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c6af7,#5b4bd4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#e2e8f0", letterSpacing: "-0.3px" }}>StudyRoom</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: user.avatar_color || "#7c6af7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff" }}>
                {user.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.2 }}>{user.username}</div>
                <div style={{ fontSize: 11, color: "#fbbf24", display: "flex", alignItems: "center", gap: 3 }}>
                  <Star style={{ width: 10, height: 10, fill: "#fbbf24" }} />
                  {user.xp || 0} XP
                </div>
              </div>
            </div>
          )}
          <button onClick={() => { logout(); navigate("/login"); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "1px solid #333355", background: "transparent", color: "#9090b0", cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#555577"; e.currentTarget.style.color = "#e2e8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#333355"; e.currentTarget.style.color = "#9090b0"; }}>
            <LogOut style={{ width: 14, height: 14 }} />
            Sign out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 32px" }}>
        {/* Page header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 30, fontWeight: 800, letterSpacing: "-0.5px", color: "#f1f5f9" }}>
            {user ? `Welcome back, ${user.username}` : "Dashboard"}
          </h1>
          <p style={{ margin: 0, color: "#6b6b8a", fontSize: 15 }}>Manage your study rooms and collaborate with peers.</p>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 12, color: "#f87171", fontSize: 13, marginBottom: 24 }}>
            <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 2, display: "flex" }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}

        {/* Action bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
          <button onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", background: showCreate ? "#5b4bd4" : "#7c6af7", color: "#fff", fontWeight: 600, fontSize: 14, transition: "background 0.2s" }}>
            <Plus style={{ width: 16, height: 16 }} />
            Create Room
          </button>
          <button onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "2px solid #333355", cursor: "pointer", background: "transparent", color: showJoin ? "#e2e8f0" : "#9090b0", fontWeight: 600, fontSize: 14, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c6af7"; e.currentTarget.style.color = "#e2e8f0"; }}
            onMouseLeave={e => { if (!showJoin) { e.currentTarget.style.borderColor = "#333355"; e.currentTarget.style.color = "#9090b0"; } }}>
            <Link2 style={{ width: 16, height: 16 }} />
            Join by Code
          </button>
          <button onClick={loadData}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "1px solid #2a2a44", cursor: "pointer", background: "transparent", color: "#6b6b8a", fontSize: 14, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#e2e8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#6b6b8a"; }}>
            <RefreshCw style={{ width: 15, height: 15 }} />
            Refresh
          </button>
        </div>

        {/* Create Room Panel */}
        {showCreate && (
          <div style={{ background: "#13131f", border: "1px solid #222238", borderRadius: 16, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>Create New Study Room</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "#6b6b8a", cursor: "pointer", display: "flex" }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Room Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Physics Study Group" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Organic Chemistry, Calculus, World History"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Ambient Sound</label>
                <select value={form.ambient_sound} onChange={(e) => setForm({ ...form, ambient_sound: e.target.value })} style={inputStyle}>
                  {AMBIENTS.map((a) => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 20 }}>
                <input type="checkbox" id="public" checked={form.is_public}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: "#7c6af7", cursor: "pointer" }} />
                <label htmlFor="public" style={{ color: "#9090b0", fontSize: 14, cursor: "pointer" }}>Public room</label>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={handleCreate} disabled={createLoading || !form.name.trim()}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 24px", borderRadius: 10, border: "none", cursor: createLoading || !form.name.trim() ? "not-allowed" : "pointer", background: createLoading || !form.name.trim() ? "#2a2a44" : "#7c6af7", color: "#fff", fontWeight: 600, fontSize: 14 }}>
                <Plus style={{ width: 15, height: 15 }} />
                {createLoading ? "Creating..." : "Create Room"}
              </button>
              <button onClick={() => setShowCreate(false)}
                style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #333355", cursor: "pointer", background: "transparent", color: "#9090b0", fontSize: 14 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Join Room Panel */}
        {showJoin && (
          <div style={{ background: "#13131f", border: "1px solid #222238", borderRadius: 16, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>Join by Invite Code</h3>
              <button onClick={() => setShowJoin(false)} style={{ background: "none", border: "none", color: "#6b6b8a", cursor: "pointer", display: "flex" }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code (e.g. AB3X9Y)"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                style={{ ...inputStyle, flex: 1, letterSpacing: 6, fontSize: 20, textAlign: "center", fontWeight: 700, fontFamily: "monospace" }} />
              <button onClick={handleJoin} disabled={joinLoading || !joinCode.trim()}
                style={{ padding: "10px 24px", borderRadius: 10, border: "none", cursor: joinLoading || !joinCode.trim() ? "not-allowed" : "pointer", background: joinLoading || !joinCode.trim() ? "#2a2a44" : "#7c6af7", color: "#fff", fontWeight: 600, fontSize: 14 }}>
                {joinLoading ? "Joining..." : "Join"}
              </button>
              <button onClick={() => setShowJoin(false)}
                style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #333355", cursor: "pointer", background: "transparent", color: "#9090b0", fontSize: 14 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Room list header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#e2e8f0" }}>Your Study Rooms</h2>
          {rooms.length > 0 && <span style={{ fontSize: 12, color: "#6b6b8a" }}>{rooms.length} room{rooms.length !== 1 ? "s" : ""}</span>}
        </div>

        {/* Rooms grid */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <div style={{ width: 36, height: 36, border: "3px solid #333355", borderTopColor: "#7c6af7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 32px", color: "#6b6b8a", background: "#13131f", borderRadius: 16, border: "1px dashed #2a2a44" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#1e1e30", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Home style={{ width: 24, height: 24, color: "#6b6b8a" }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#9090b0", marginBottom: 8 }}>No rooms yet</div>
            <div style={{ fontSize: 14 }}>Create a room or join one with an invite code to get started.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 16 }}>
            {rooms.map((room, i) => (
              <div key={room.id} onClick={() => navigate(`/room/${room.id}`)}
                style={{ background: "#13131f", borderRadius: 14, padding: 20, cursor: "pointer", border: "1px solid #222238", transition: "all 0.2s", borderTop: `3px solid ${ACCENT_COLORS[i % ACCENT_COLORS.length]}`, position: "relative" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "#333355"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "#222238"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.2px" }}>{room.name}</h3>
                  <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: room.is_public !== false ? "rgba(52,211,153,0.1)" : "rgba(99,102,241,0.1)", color: room.is_public !== false ? "#34d399" : "#a78bfa", border: `1px solid ${room.is_public !== false ? "rgba(52,211,153,0.2)" : "rgba(99,102,241,0.2)"}`, fontWeight: 600, letterSpacing: "0.3px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                    {room.is_public !== false ? <Globe style={{ width: 9, height: 9 }} /> : <Lock style={{ width: 9, height: 9 }} />}
                    {room.is_public !== false ? "Public" : "Private"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {room.subject && (
                    <span style={tagStyle}>
                      <Layers style={{ width: 10, height: 10 }} />
                      {room.subject}
                    </span>
                  )}
                  <span style={tagStyle}>
                    <Hash style={{ width: 10, height: 10 }} />
                    {room.invite_code}
                  </span>
                  {room.ambient_sound && room.ambient_sound !== "none" && (
                    <span style={tagStyle}>
                      <Music style={{ width: 10, height: 10 }} />
                      {room.ambient_sound}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: ACCENT_COLORS[i % ACCENT_COLORS.length], fontWeight: 600 }}>
                  Enter Room
                  <ChevronRight style={{ width: 13, height: 13 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 13px", borderRadius: 9, border: "1px solid #2a2a44",
  background: "#0d0d14", color: "#e2e8f0", fontSize: 14, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.2s",
};
const labelStyle = { display: "block", marginBottom: 6, fontSize: 12, color: "#6b6b8a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" };
const tagStyle = { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "#1e1e30", color: "#6b6b8a", border: "1px solid #2a2a44" };

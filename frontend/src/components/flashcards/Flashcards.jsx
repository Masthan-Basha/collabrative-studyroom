import { useState, useEffect, useRef } from "react";
import {
  getFlashcardSets, createFlashcardSet, getFlashcards,
  addFlashcard, generateAICards
} from "../../api/index";
import {
  Layers, Plus, Cpu, Trophy, X, RotateCcw, Check, AlertCircle,
  Inbox, Zap, ArrowRight, CheckCircle, XCircle
} from "lucide-react";

const OPTION_LETTERS = ["A", "B", "C", "D"];

function buildFlashcardOptions(currentCard, allCards) {
  const correctAnswer = (currentCard?.answer || currentCard?.back || "").trim();

  const otherAnswers = allCards
    .filter((c) => c && c.id !== currentCard.id)
    .map((c) => (c.answer || c.back || "").trim())
    .filter((a) => a.length > 0 && a.toLowerCase() !== correctAnswer.toLowerCase());

  const uniqueOthers = Array.from(new Set(otherAnswers)).sort(() => Math.random() - 0.5);
  const distractors = uniqueOthers.slice(0, 3);

  const fallbackDistractors = [
    "Remains constant regardless of input conditions",
    "Requires continuous external catalytic activation",
    "Applies exclusively to closed homogeneous systems",
    "Inversely proportional to the total equilibrium state",
    "Results in complete dissipation of available force",
  ];

  for (const fb of fallbackDistractors) {
    if (distractors.length >= 3) break;
    if (fb.toLowerCase() !== correctAnswer.toLowerCase() && !distractors.includes(fb)) {
      distractors.push(fb);
    }
  }

  const options = [
    { text: correctAnswer, isCorrect: true },
    ...distractors.map((d) => ({ text: d, isCorrect: false })),
  ];

  return options.sort(() => Math.random() - 0.5);
}

export default function Flashcards({ roomId }) {
  const [sets, setSets] = useState([]);
  const [activeSet, setActiveSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({ question: "", answer: "" });
  const [newSetName, setNewSetName] = useState("");
  const [showCreateSet, setShowCreateSet] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizDone, setQuizDone] = useState(false);
  const [quizOptions, setQuizOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const autoNextRef = useRef(null);

  useEffect(() => { fetchSets(); }, [roomId]);
  useEffect(() => { if (activeSet) fetchCards(activeSet.id); }, [activeSet]);

  const fetchSets = async () => {
    try {
      const data = await getFlashcardSets(roomId);
      setSets(Array.isArray(data) ? data : []);
    } catch { setSets([]); }
  };

  const fetchCards = async (setId) => {
    setLoading(true);
    try {
      const data = await getFlashcards(setId);
      const raw = Array.isArray(data) ? data : [];
      setCards(raw.map((c) => ({
        id: c.id,
        question: c.question || c.front || "",
        answer: c.answer || c.back || "",
        front: c.front || c.question || "",
        back: c.back || c.answer || "",
      })));
      setFlipped({});
    } catch { setCards([]); }
    setLoading(false);
  };

  const handleCreateSet = async () => {
    if (!newSetName.trim()) return;
    try {
      const data = await createFlashcardSet({ roomId, name: newSetName, subject: "" });
      setSets((s) => [...s, data]);
      setActiveSet(data);
      setNewSetName("");
      setShowCreateSet(false);
    } catch (e) {
      alert(e?.message || "Failed to create set");
    }
  };

  const handleAddCard = async () => {
    if (!newCard.question.trim() || !newCard.answer.trim()) return;
    try {
      const data = await addFlashcard({ setId: activeSet.id, front: newCard.question, back: newCard.answer });
      setCards((c) => [...c, { id: data.id, question: data.question || data.front || newCard.question, answer: data.answer || data.back || newCard.answer }]);
      setNewCard({ question: "", answer: "" });
      setShowAddModal(false);
    } catch (e) {
      alert(e?.message || "Failed to add card");
    }
  };

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      let targetSet = activeSet;
      if (!targetSet) {
        // Automatically create a set with the topic name
        const created = await createFlashcardSet({
          roomId,
          name: `${aiTopic.trim()} Study Set`,
          title: `${aiTopic.trim()} Study Set`,
          subject: "",
        });
        setSets((s) => [...s, created]);
        setActiveSet(created);
        targetSet = created;
      }

      const data = await generateAICards({ setId: targetSet.id, topic: aiTopic, count: 5 });
      const generated = data?.cards || data?.flashcards || (Array.isArray(data) ? data : []);
      if (generated.length === 0) {
        setAiError("AI returned no cards. Try a different topic.");
      } else {
        const normalized = generated.map((c) => ({
          id: c.id,
          question: c.question || c.front || "",
          answer: c.answer || c.back || "",
          front: c.front || c.question || "",
          back: c.back || c.answer || "",
          hint: c.hint || "",
        }));
        setCards((c) => [...c, ...normalized]);
        setAiTopic("");
      }
    } catch (e) {
      setAiError(e?.response?.data?.detail || e?.message || "AI generation failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const startQuiz = () => {
    if (cards.length < 2) { alert("Need at least 2 cards for quiz"); return; }
    const optionsPerCard = cards.map((c) => buildFlashcardOptions(c, cards));
    setQuizOptions(optionsPerCard);
    setQuizMode(true);
    setQuizIndex(0);
    setQuizScore({ correct: 0, total: 0 });
    setSelectedOption(null);
    setQuizDone(false);
  };

  const handleSelectQuizOption = (opt) => {
    if (selectedOption !== null) return;
    setSelectedOption(opt);

    const isCorrect = !!opt.isCorrect;
    setQuizScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));

    clearTimeout(autoNextRef.current);
    autoNextRef.current = setTimeout(() => {
      advanceQuizNext();
    }, 2000);
  };

  const advanceQuizNext = () => {
    clearTimeout(autoNextRef.current);
    setSelectedOption(null);
    if (quizIndex + 1 >= cards.length) {
      setQuizDone(true);
    } else {
      setQuizIndex((i) => i + 1);
    }
  };

  // Quiz mode
  if (quizMode) {
    if (quizDone) {
      const pct = Math.round((quizScore.correct / Math.max(quizScore.total, 1)) * 100);
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", background: "#0d0d14", gap: 20, padding: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: pct >= 80 ? "rgba(52,211,153,0.1)" : pct >= 50 ? "rgba(251,191,36,0.1)" : "rgba(248,113,113,0.1)", border: `2px solid ${pct >= 80 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#f87171"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trophy style={{ width: 32, height: 32, color: pct >= 80 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#f87171" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Quiz Complete</div>
            <div style={{ color: "#7c6af7", fontSize: 18, fontWeight: 700 }}>
              {quizScore.correct} / {quizScore.total} Marks Awarded ({pct}%)
            </div>
            <div style={{ color: "#9090b0", fontSize: 13, marginTop: 8 }}>
              {pct >= 80 ? "Outstanding performance!" : pct >= 50 ? "Good effort — keep practicing!" : "Review your cards and try again!"}
            </div>
          </div>
          <button onClick={() => setQuizMode(false)}
            style={{ padding: "12px 28px", borderRadius: 12, background: "#7c6af7", color: "#fff", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
            Back to Cards
          </button>
        </div>
      );
    }

    const currentCard = cards[quizIndex];
    const currentOptions = quizOptions[quizIndex] || [];

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d0d14", padding: 24, overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ color: "#6b6b8a", fontSize: 13 }}>Question {quizIndex + 1} of {cards.length}</span>
          <span style={{ color: "#7c6af7", fontSize: 13, fontWeight: 700 }}>
            Score: {quizScore.correct} Marks
          </span>
          <button onClick={() => { clearTimeout(autoNextRef.current); setQuizMode(false); }}
            style={{ background: "none", border: "none", color: "#6b6b8a", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <X style={{ width: 15, height: 15 }} /> Exit
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ height: 4, background: "#1e1e30", borderRadius: 4, marginBottom: 20 }}>
          <div style={{ height: "100%", background: "#7c6af7", borderRadius: 4, width: `${((quizIndex + 1) / cards.length) * 100}%`, transition: "width 0.3s" }} />
        </div>

        {/* Question Box */}
        <div style={{
          borderRadius: 16, background: "#13131f", border: "1px solid #2a2a44",
          padding: 24, textAlign: "center", marginBottom: 20, minHeight: 120,
          display: "flex", flexDirection: "column", justifyContent: "center"
        }}>
          <div style={{ color: "#6b6b8a", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
            Question
          </div>
          <div style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>
            {currentCard?.question || currentCard?.front}
          </div>
        </div>

        {/* 4 Multiple-Choice Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          <div style={{ color: "#9090b0", fontSize: 12, marginBottom: 4 }}>Select the correct answer:</div>

          {currentOptions.map((opt, idx) => {
            const letter = OPTION_LETTERS[idx] || `${idx + 1}`;
            const isChosen = selectedOption === opt;
            const isCorrectOption = opt.isCorrect;

            let bgColor = "#1e1e30";
            let borderColor = "#2a2a44";
            let textColor = "#e2e8f0";
            let badgeBg = "#252540";
            let badgeColor = "#9090b0";

            if (selectedOption !== null) {
              if (isCorrectOption) {
                bgColor = "rgba(52,211,153,0.15)";
                borderColor = "#34d399";
                textColor = "#fff";
                badgeBg = "#34d399";
                badgeColor = "#fff";
              } else if (isChosen && !isCorrectOption) {
                bgColor = "rgba(248,113,113,0.15)";
                borderColor = "#f87171";
                textColor = "#fff";
                badgeBg = "#f87171";
                badgeColor = "#fff";
              } else {
                bgColor = "#13131f";
                borderColor = "#1e1e30";
                textColor = "#6b6b8a";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectQuizOption(opt)}
                disabled={selectedOption !== null}
                style={{
                  padding: "14px 16px", borderRadius: 12, border: `1px solid ${borderColor}`,
                  background: bgColor, color: textColor, cursor: selectedOption === null ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontSize: 14,
                  transition: "all 0.2s",
                }}
              >
                <span style={{
                  width: 26, height: 26, borderRadius: 6, background: badgeBg, color: badgeColor,
                  fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0
                }}>
                  {selectedOption !== null && isCorrectOption ? (
                    <Check style={{ width: 14, height: 14 }} />
                  ) : selectedOption !== null && isChosen && !isCorrectOption ? (
                    <X style={{ width: 14, height: 14 }} />
                  ) : (
                    letter
                  )}
                </span>
                <span style={{ flex: 1, lineHeight: 1.4 }}>{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback / Next button */}
        {selectedOption !== null && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 16, padding: "12px 16px", borderRadius: 10,
            background: selectedOption.isCorrect ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
            border: `1px solid ${selectedOption.isCorrect ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
            color: selectedOption.isCorrect ? "#34d399" : "#f87171",
            fontSize: 13, fontWeight: 600
          }}>
            <span>
              {selectedOption.isCorrect ? "Correct! +1 mark awarded." : `Incorrect. The correct answer was: ${currentCard?.answer || currentCard?.back}`}
            </span>
            <button
              onClick={() => advanceQuizNext()}
              style={{
                padding: "6px 14px", borderRadius: 8, background: "#7c6af7", color: "#fff",
                border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4
              }}
            >
              <span>{quizIndex + 1 < cards.length ? "Next" : "Results"}</span>
              <ArrowRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Main view
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d0d14" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", background: "#13131f", borderBottom: "1px solid #222238", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#f1f5f9", fontWeight: 700, fontSize: 14 }}>
          <Layers style={{ width: 16, height: 16, color: "#7c6af7" }} />
          Flashcards
        </div>
        <select value={activeSet?.id || ""} onChange={(e) => setActiveSet(sets.find((x) => String(x.id) === e.target.value) || null)}
          style={{ background: "#1e1e30", color: "#e2e8f0", border: "1px solid #2a2a44", borderRadius: 8, padding: "5px 10px", fontSize: 13, outline: "none", cursor: "pointer" }}>
          <option value="">Select a set...</option>
          {sets.map((s) => <option key={s.id} value={s.id}>{s.title || s.name}</option>)}
        </select>
        <button onClick={() => setShowCreateSet(true)} style={actionBtnStyle}>
          <Plus style={{ width: 13, height: 13 }} /> New Set
        </button>
        {activeSet && (
          <>
            <button onClick={() => setShowAddModal(true)} style={actionBtnStyle}>
              <Plus style={{ width: 13, height: 13 }} /> Add Card
            </button>
            <button onClick={startQuiz} style={{ ...actionBtnStyle, background: "#7c6af7", color: "#fff", border: "none" }}>
              <Zap style={{ width: 13, height: 13 }} /> Quiz Mode
            </button>
          </>
        )}
      </div>

      {/* AI Generator */}
      <div style={{ padding: "12px 16px", background: "#0f0f1a", borderBottom: "1px solid #222238" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b6b8a", fontSize: 12, whiteSpace: "nowrap" }}>
            <Cpu style={{ width: 13, height: 13 }} />
            AI Generate
          </div>
          <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerateAI()}
            placeholder="Enter a topic (e.g. Photosynthesis, Python loops...)"
            style={{ flex: 1, background: "#1e1e30", border: "1px solid #2a2a44", borderRadius: 8, color: "#e2e8f0", padding: "7px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          <button onClick={handleGenerateAI} disabled={aiLoading || !aiTopic.trim()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "none", cursor: aiLoading || !aiTopic.trim() ? "not-allowed" : "pointer", background: aiLoading || !aiTopic.trim() ? "#2a2a44" : "#7c6af7", color: "#fff", fontSize: 13, whiteSpace: "nowrap", fontWeight: 500 }}>
            <Zap style={{ width: 13, height: 13 }} />
            {aiLoading ? "Generating..." : "Generate 5"}
          </button>
        </div>
        {aiError && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f87171", fontSize: 12, marginTop: 8 }}>
            <AlertCircle style={{ width: 13, height: 13 }} />
            {aiError}
          </div>
        )}
        {!activeSet && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#9090b0", fontSize: 11, marginTop: 6 }}>
            <Zap style={{ width: 12, height: 12, color: "#7c6af7" }} />
            Enter any topic above to instantly create a study set with AI cards
          </div>
        )}
      </div>

      {/* Cards area */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {!activeSet ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: "#1e1e30", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Layers style={{ width: 28, height: 28, color: "#6b6b8a" }} />
            </div>
            <div style={{ color: "#6b6b8a", fontSize: 15 }}>Select a set or create a new one</div>
            <button onClick={() => setShowCreateSet(true)} style={{ padding: "10px 22px", borderRadius: 10, background: "#7c6af7", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
              Create First Set
            </button>
          </div>
        ) : loading ? (
          <div style={{ color: "#6b6b8a", textAlign: "center", marginTop: 40, fontSize: 14 }}>Loading cards...</div>
        ) : cards.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 40, color: "#6b6b8a" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#1e1e30", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Inbox style={{ width: 24, height: 24, color: "#6b6b8a" }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "#9090b0" }}>No cards yet</div>
            <div style={{ fontSize: 13 }}>Add cards manually or use AI generation above.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
            {cards.map((card, i) => (
              <div key={card.id || i} onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
                style={{ background: flipped[i] ? "#1a2744" : "#1e1e30", border: `2px solid ${flipped[i] ? "#7c6af7" : "#2a2a44"}`, borderRadius: 14, padding: 18, cursor: "pointer", minHeight: 140, display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "all 0.3s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: flipped[i] ? "#7c6af7" : "#6b6b8a", fontSize: 10, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
                  {flipped[i] ? <Check style={{ width: 11, height: 11 }} /> : <Layers style={{ width: 11, height: 11 }} />}
                  {flipped[i] ? "Answer" : "Question"}
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.6, flex: 1 }}>{flipped[i] ? (card.answer || card.back) : (card.question || card.front)}</div>
                <div style={{ color: "#4b5563", fontSize: 11, marginTop: 10 }}>Click to flip</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Set Modal */}
      {showCreateSet && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#13131f", borderRadius: 16, padding: 28, width: 380, border: "1px solid #2a2a44" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ color: "#e2e8f0", margin: 0, fontSize: 16, fontWeight: 700 }}>Create New Set</h3>
              <button onClick={() => setShowCreateSet(false)} style={{ background: "none", border: "none", color: "#6b6b8a", cursor: "pointer" }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <input value={newSetName} onChange={(e) => setNewSetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSet()}
              placeholder="Set name (e.g. Biology Chapter 3)"
              style={{ width: "100%", background: "#0d0d14", border: "1px solid #2a2a44", borderRadius: 9, color: "#e2e8f0", padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowCreateSet(false)} style={{ flex: 1, padding: 10, borderRadius: 9, background: "#1e1e30", border: "1px solid #2a2a44", color: "#6b6b8a", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleCreateSet} style={{ flex: 1, padding: 10, borderRadius: 9, background: "#7c6af7", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#13131f", borderRadius: 16, padding: 28, width: 420, border: "1px solid #2a2a44" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ color: "#e2e8f0", margin: 0, fontSize: 16, fontWeight: 700 }}>Add Flashcard</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "#6b6b8a", cursor: "pointer" }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 11, color: "#6b6b8a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Question</label>
            <textarea value={newCard.question} onChange={(e) => setNewCard({ ...newCard, question: e.target.value })}
              placeholder="Enter the question..." rows={3}
              style={{ width: "100%", background: "#0d0d14", border: "1px solid #2a2a44", borderRadius: 9, color: "#e2e8f0", padding: "10px 14px", fontSize: 14, outline: "none", resize: "vertical", marginBottom: 14, boxSizing: "border-box", fontFamily: "inherit" }} />
            <label style={{ display: "block", marginBottom: 6, fontSize: 11, color: "#6b6b8a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Answer</label>
            <textarea value={newCard.answer} onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
              placeholder="Enter the answer..." rows={3}
              style={{ width: "100%", background: "#0d0d14", border: "1px solid #2a2a44", borderRadius: 9, color: "#e2e8f0", padding: "10px 14px", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: 10, borderRadius: 9, background: "#1e1e30", border: "1px solid #2a2a44", color: "#6b6b8a", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleAddCard} style={{ flex: 1, padding: 10, borderRadius: 9, background: "#7c6af7", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Add Card</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle = {
  display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px",
  borderRadius: 8, border: "1px solid #2a2a44", cursor: "pointer",
  background: "#1e1e30", color: "#9090b0", fontSize: 12, fontWeight: 500,
  fontFamily: "inherit",
};

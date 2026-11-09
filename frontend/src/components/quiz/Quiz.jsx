import { useState, useEffect, useRef } from 'react'
import { flashcardsAPI, generateAIQuiz } from '../../api'
import { getSocket } from '../../socket'
import { useAuthStore } from '../../store/authStore'
import {
  Trophy, Play, CheckCircle, XCircle, Zap, Clock, Award,
  Sparkles, Plus, AlertCircle, RefreshCw, Cpu, Layers,
  Check, X, ChevronRight, HelpCircle, ArrowRight
} from 'lucide-react'
import Confetti from 'react-confetti'
import toast from 'react-hot-toast'

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

// Helper to generate 4 distinct options (1 correct + 3 distractors)
function buildOptionsForCard(currentCard, allCards) {
  const correctAnswer = (currentCard?.back || currentCard?.answer || '').trim()

  // 1. Check if options are explicitly encoded in hint
  if (currentCard?.hint && currentCard.hint.includes('OPTIONS:')) {
    try {
      const match = currentCard.hint.match(/OPTIONS:\s*(\[.*?\])/)
      if (match) {
        const parsed = JSON.parse(match[1])
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const opts = parsed.map(txt => ({
            text: txt,
            isCorrect: txt.trim().toLowerCase() === correctAnswer.toLowerCase()
          }))
          return shuffle(opts)
        }
      }
    } catch {}
  }

  // 2. Pick distractors from other cards in the current set
  const otherAnswers = allCards
    .filter(c => c && c.id !== currentCard.id)
    .map(c => (c.back || c.answer || '').trim())
    .filter(a => a.length > 0 && a.toLowerCase() !== correctAnswer.toLowerCase())

  const uniqueOthers = Array.from(new Set(otherAnswers))
  shuffle(uniqueOthers)

  const distractors = uniqueOthers.slice(0, 3)

  // 3. Fallbacks if set has fewer than 4 cards
  const contextualFallbacks = [
    'Varies inversely with total system energy',
    'Applies exclusively under standardized equilibrium conditions',
    'Requires continuous external catalytic intervention',
    'Remains constant regardless of variance in inputs',
    'Results in complete dissipation of available force',
    'Determined solely by linear asymptotic decay',
    'Negates the initial phase transition threshold'
  ]

  for (const fallback of contextualFallbacks) {
    if (distractors.length >= 3) break
    if (fallback.toLowerCase() !== correctAnswer.toLowerCase() && !distractors.includes(fallback)) {
      distractors.push(fallback)
    }
  }

  const options = [
    { text: correctAnswer, isCorrect: true },
    ...distractors.map(d => ({ text: d, isCorrect: false }))
  ]

  return shuffle(options)
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

export default function Quiz({ roomId }) {
  const { user } = useAuthStore()
  const [sets, setSets] = useState([])
  const [activeSet, setActiveSet] = useState(null)
  const [cards, setCards] = useState([])
  const [quizOptions, setQuizOptions] = useState([]) // Array of options per question
  const [phase, setPhase] = useState('lobby') // lobby | quiz | results
  const [qIndex, setQIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selectedOption, setSelectedOption] = useState(null) // selected option object
  const [leaderboard, setLB] = useState([])
  const [liveScores, setLiveScores] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [showConfetti, setConfetti] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [showHint, setShowHint] = useState(false)

  const timerRef = useRef(null)
  const autoNextRef = useRef(null)
  const startTime = useRef(null)

  useEffect(() => {
    loadData()
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(autoNextRef.current)
    }
  }, [roomId])

  const loadData = () => {
    flashcardsAPI.listSets(roomId).then(r => setSets(r.data || [])).catch(() => setSets([]))
    flashcardsAPI.leaderboard(roomId).then(r => setLB(r.data || [])).catch(() => setLB([]))
  }

  // Socket: other users' live answers in study room
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socket.on('quiz:started', ({ set_id, started_by }) => {
      toast.success(`${started_by} started a quiz!`)
    })

    socket.on('quiz:answer_broadcast', ({ username, correct }) => {
      setLiveScores(prev => {
        const idx = prev.findIndex(s => s.username === username)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], score: updated[idx].score + (correct ? 1 : 0) }
          return updated
        }
        return [...prev, { username, score: correct ? 1 : 0 }]
      })
    })

    return () => {
      socket.off('quiz:started')
      socket.off('quiz:answer_broadcast')
    }
  }, [])

  const startQuiz = async (set) => {
    try {
      const { data } = await flashcardsAPI.listCards(set.id)
      const list = Array.isArray(data) ? data : []
      if (list.length === 0) {
        toast.error('No cards in this set yet')
        return
      }

      const shuffled = shuffle(list)
      const optionsPerCard = shuffled.map(c => buildOptionsForCard(c, shuffled))

      setActiveSet(set)
      setCards(shuffled)
      setQuizOptions(optionsPerCard)
      setQIndex(0)
      setScore(0)
      setAnswers([])
      setSelectedOption(null)
      setShowHint(false)
      setLiveScores([{ username: user?.username || 'You', score: 0 }])
      setPhase('quiz')

      startTime.current = Date.now()
      clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.current) / 1000))
      }, 1000)

      getSocket()?.emit('quiz:start', { room_id: roomId, set_id: set.id })
    } catch (e) {
      toast.error('Failed to start quiz')
    }
  }

  const handleGenerateAIQuiz = async () => {
    if (!aiTopic.trim()) return
    setAiLoading(true)
    setAiError('')
    try {
      const res = await generateAIQuiz({
        roomId,
        topic: aiTopic.trim(),
        count: 5,
        subject: 'General',
      })
      const newSet = res.set
      const cardsList = res.cards || []
      setSets(prev => [newSet, ...prev])
      setAiTopic('')

      if (cardsList.length > 0) {
        toast.success(`Generated ${cardsList.length} questions with multiple-choice options!`)
        const shuffled = shuffle(cardsList)
        const optionsPerCard = shuffled.map(c => buildOptionsForCard(c, shuffled))

        setActiveSet(newSet)
        setCards(shuffled)
        setQuizOptions(optionsPerCard)
        setQIndex(0)
        setScore(0)
        setAnswers([])
        setSelectedOption(null)
        setShowHint(false)
        setLiveScores([{ username: user?.username || 'You', score: 0 }])
        setPhase('quiz')

        startTime.current = Date.now()
        clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startTime.current) / 1000))
        }, 1000)

        getSocket()?.emit('quiz:start', { room_id: roomId, set_id: newSet.id })
      } else {
        toast.error('No cards generated. Please try another topic.')
      }
    } catch (e) {
      setAiError(e?.response?.data?.detail || e?.message || 'Failed to generate AI quiz')
    } finally {
      setAiLoading(false)
    }
  }

  // Handle option click: check right answer and award marks
  const handleSelectOption = (opt) => {
    if (selectedOption !== null) return // Already chosen
    setSelectedOption(opt)

    const isCorrect = !!opt.isCorrect
    const newScore = isCorrect ? score + 1 : score
    if (isCorrect) {
      setScore(newScore)
    }

    const currentCard = cards[qIndex]
    setAnswers(prev => [
      ...prev,
      {
        card_id: currentCard?.id,
        question: currentCard?.front || currentCard?.question,
        selectedText: opt.text,
        correctText: currentCard?.back || currentCard?.answer,
        isCorrect,
      }
    ])

    // Broadcast live event for multiplayer study room
    getSocket()?.emit('quiz:answer', {
      room_id: roomId,
      card_id: currentCard?.id,
      correct: isCorrect
    })

    // Automatically transition to next question after 2.2 seconds
    clearTimeout(autoNextRef.current)
    autoNextRef.current = setTimeout(() => {
      advanceNext(newScore)
    }, 2200)
  }

  const advanceNext = (currentScore = score) => {
    clearTimeout(autoNextRef.current)
    setSelectedOption(null)
    setShowHint(false)

    if (qIndex + 1 < cards.length) {
      setQIndex(q => q + 1)
    } else {
      finishQuiz(currentScore)
    }
  }

  const finishQuiz = async (finalScore) => {
    clearInterval(timerRef.current)
    clearTimeout(autoNextRef.current)
    const timeSecs = Math.floor((Date.now() - startTime.current) / 1000)

    try {
      await flashcardsAPI.submitScore(roomId, {
        set_id: activeSet?.id,
        score: finalScore,
        total: cards.length,
        time_secs: timeSecs,
      })
      const { data } = await flashcardsAPI.leaderboard(roomId)
      setLB(data || [])
    } catch {}

    const pct = Math.round((finalScore / Math.max(cards.length, 1)) * 100)
    if (pct >= 80) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 4500)
    }
    setPhase('results')
  }

  const currentCard = cards[qIndex]
  const currentOptions = quizOptions[qIndex] || []

  // ── 1. Lobby View ──────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="p-5 flex flex-col h-full gap-5 overflow-y-auto" style={{ background: '#0d0d14' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber" />
            <span className="font-bold text-sm tracking-wide text-white uppercase">Quiz Arena</span>
          </div>
          <button onClick={loadData} className="btn-ghost p-1.5 rounded-lg text-xs flex items-center gap-1.5 text-muted hover:text-white">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* AI Quiz Generator Card */}
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Cpu className="w-4 h-4" />
            <span>Generate Multiple-Choice Quiz with AI</span>
          </div>
          <p className="text-xs text-muted">
            Enter any topic to automatically generate 4-option multiple-choice questions with instant scoring.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiTopic}
              onChange={e => setAiTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerateAIQuiz()}
              placeholder="e.g. Molecular Biology, Quantum Mechanics, Python OOP..."
              className="input flex-1 py-2 text-xs"
            />
            <button
              onClick={handleGenerateAIQuiz}
              disabled={aiLoading || !aiTopic.trim()}
              className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5" />
              {aiLoading ? 'Generating...' : 'Generate & Play'}
            </button>
          </div>
          {aiError && (
            <div className="flex items-center gap-2 text-danger text-xs mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{aiError}</span>
            </div>
          )}
        </div>

        {/* Available Sets */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Available Study Sets</p>
            <span className="text-xs text-muted">{sets.length} set{sets.length !== 1 ? 's' : ''}</span>
          </div>

          {sets.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-dashed border-border text-muted text-xs flex flex-col items-center gap-2">
              <Layers className="w-6 h-6 text-muted" />
              <span>No study sets created yet.</span>
              <span className="text-primary font-medium">Use the AI generator above to create your first multiple-choice quiz!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {sets.map(set => (
                <button
                  key={set.id}
                  onClick={() => startQuiz(set)}
                  className="w-full text-left px-4 py-3 bg-surface hover:bg-surface-50 border border-border hover:border-primary/40 rounded-xl transition-all group flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-sm text-white group-hover:text-primary transition-colors">
                      {set.title}
                    </p>
                    <p className="text-xs text-muted">{set.subject || 'General Study'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted group-hover:text-primary">
                    <span>Start Quiz</span>
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-amber" />
              <p className="text-xs text-muted font-semibold uppercase tracking-wider">Room Leaderboard</p>
            </div>
            <div className="space-y-1.5">
              {leaderboard.slice(0, 5).map((s, i) => (
                <div key={s.id || i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface border border-border/50 text-xs">
                  <span
                    className={`font-bold w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                      i === 0
                        ? 'bg-amber/20 text-amber border border-amber/40'
                        : i === 1
                        ? 'bg-slate-500/20 text-slate-300 border border-slate-400/40'
                        : i === 2
                        ? 'bg-amber-800/20 text-amber-500 border border-amber-600/40'
                        : 'bg-void text-muted'
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <span className="flex-1 font-medium truncate text-white">{s.user?.username || 'Student'}</span>
                  <span className="font-mono text-muted">{s.score}/{s.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── 2. Active Multiple-Choice Quiz View ─────────────────────
  if (phase === 'quiz') {
    return (
      <div className="p-5 flex flex-col h-full gap-4 overflow-y-auto" style={{ background: '#0d0d14' }}>
        {/* Progress Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-surface border border-border text-xs font-semibold text-white">
              Question {qIndex + 1} of {cards.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted font-mono">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{elapsed}s</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>{score} Marks</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((qIndex + 1) / cards.length) * 100}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="card p-5 w-full flex flex-col justify-center gap-2 border border-border/80 bg-surface/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted uppercase tracking-widest font-bold">
              Multiple Choice
            </span>
            {currentCard?.hint && (
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-[11px] text-primary hover:text-primary-light flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
              </button>
            )}
          </div>

          <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
            {currentCard?.front || currentCard?.question}
          </p>

          {showHint && currentCard?.hint && (
            <div className="p-2.5 rounded-lg bg-surface-50 border border-border/60 text-xs text-muted italic">
              Hint: {currentCard.hint.replace(/OPTIONS:.*$/, '').trim()}
            </div>
          )}
        </div>

        {/* Options List (A, B, C, D) */}
        <div className="flex-1 flex flex-col justify-center gap-2.5 my-1">
          <p className="text-xs text-muted font-medium mb-0.5">Select the correct option:</p>

          {currentOptions.map((opt, idx) => {
            const letter = OPTION_LETTERS[idx] || `${idx + 1}`
            const isChosen = selectedOption === opt
            const isRevealedCorrect = selectedOption !== null && opt.isCorrect
            const isRevealedWrong = isChosen && !opt.isCorrect

            let btnStyle = 'border-border/60 bg-surface/70 hover:bg-surface hover:border-primary/50 text-slate-200'
            let badgeStyle = 'bg-surface-50 border-border text-muted'

            if (selectedOption !== null) {
              if (isRevealedCorrect) {
                btnStyle = 'border-success bg-success/15 text-white ring-1 ring-success/40'
                badgeStyle = 'bg-success text-white border-success'
              } else if (isRevealedWrong) {
                btnStyle = 'border-danger bg-danger/15 text-white ring-1 ring-danger/40'
                badgeStyle = 'bg-danger text-white border-danger'
              } else {
                btnStyle = 'border-border/30 bg-surface/30 opacity-40 text-muted'
                badgeStyle = 'bg-surface/50 border-border/40 text-muted'
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(opt)}
                disabled={selectedOption !== null}
                className={`w-full p-3.5 rounded-xl border transition-all text-left flex items-center gap-3.5 ${btnStyle} disabled:cursor-default`}
              >
                <span className={`w-7 h-7 rounded-lg border font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${badgeStyle}`}>
                  {isRevealedCorrect ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : isRevealedWrong ? (
                    <X className="w-4 h-4 text-white" />
                  ) : (
                    letter
                  )}
                </span>

                <span className="flex-1 text-sm font-medium leading-snug">
                  {opt.text}
                </span>

                {isRevealedCorrect && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-success px-2 py-0.5 rounded bg-success/20 shrink-0">
                    Correct
                  </span>
                )}
                {isRevealedWrong && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-danger px-2 py-0.5 rounded bg-danger/20 shrink-0">
                    Your Choice
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Feedback Banner and Next Button */}
        {selectedOption !== null && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border animate-slide-up text-xs font-semibold"
            style={{
              background: selectedOption.isCorrect ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              borderColor: selectedOption.isCorrect ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)',
              color: selectedOption.isCorrect ? '#34d399' : '#f87171'
            }}
          >
            <div className="flex items-center gap-2">
              {selectedOption.isCorrect ? (
                <>
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>Correct! +1 mark awarded.</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-danger" />
                  <span>Incorrect. The correct option is highlighted above.</span>
                </>
              )}
            </div>

            <button
              onClick={() => advanceNext()}
              className="btn-primary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <span>{qIndex + 1 < cards.length ? 'Next' : 'View Results'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── 3. Results View ─────────────────────────────────────────
  const pct = Math.round((score / Math.max(cards.length, 1)) * 100)
  return (
    <div className="p-6 flex flex-col h-full items-center justify-center gap-5 text-center overflow-y-auto" style={{ background: '#0d0d14' }}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={250} />}

      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
        style={{
          background: pct >= 80 ? 'rgba(52,211,153,0.15)' : pct >= 60 ? 'rgba(251,191,36,0.15)' : 'rgba(124,106,247,0.15)',
          border: `1px solid ${pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#7c6af7'}`
        }}
      >
        <Award className="w-8 h-8" style={{ color: pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#7c6af7' }} />
      </div>

      <div>
        <p className="text-4xl font-extrabold text-white tracking-tight">{pct}%</p>
        <p className="text-muted text-sm mt-1">
          Earned <span className="text-white font-bold">{score} marks</span> out of {cards.length}
        </p>
      </div>

      <div className="text-sm font-semibold text-slate-300">
        {pct >= 80
          ? 'Exceptional Performance! Top Marks.'
          : pct >= 60
          ? 'Solid Performance — Keep It Up!'
          : 'Good Attempt — Review the explanations and retry!'}
      </div>

      {/* Answers summary breakdown */}
      <div className="w-full max-w-md max-h-48 overflow-y-auto space-y-2 text-left my-2 p-2 rounded-xl bg-surface border border-border">
        {answers.map((ans, i) => (
          <div key={i} className="p-2.5 rounded-lg bg-surface-50 border border-border/40 text-xs flex items-start gap-2">
            {ans.isCorrect ? (
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
            ) : (
              <X className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{ans.question}</p>
              {!ans.isCorrect && (
                <p className="text-muted text-[11px] mt-0.5">
                  Answer: <span className="text-success font-medium">{ans.correctText}</span>
                </p>
              )}
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ans.isCorrect ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
              {ans.isCorrect ? '+1' : '0'}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          setPhase('lobby')
          setActiveSet(null)
          loadData()
        }}
        className="btn-primary px-6 py-2.5 text-xs font-semibold"
      >
        Return to Quiz Arena
      </button>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react';
import SpeechSupportBanner from '../common/SpeechSupportBanner';
import { PrimaryButton } from '../common/PrimaryButton';

interface SetupScreenProps {
  onStart: (prompt?: string) => void;
  onViewHistory?: () => void;
  onCalibrate: () => void;
  hasCalibration: boolean;
}

const PROMPT_LIBRARY: { key: string; label: string; prompts: string[] }[] = [
  {
    key: 'interview',
    label: 'Interview',
    prompts: [
      'Tell me about yourself and your professional background.',
      'Describe a time when you had to meet a tight deadline. How did you handle it?',
      'Tell me about a time you faced a significant conflict with a coworker. How did you resolve it?',
      'Give an example of a goal you set and successfully achieved.',
      'Tell me about a mistake you made at work and what you learned from it.',
      'Describe a situation where you had to make a difficult decision with limited information.',
      'Tell me about a time you had to adapt quickly to a major change.',
      'What is your greatest weakness, and what are you doing to improve it?',
      'Describe a time you had to influence or persuade someone who disagreed with you.',
      'Tell me about a time you went above and beyond what was expected.',
    ],
  },
  {
    key: 'presentation',
    label: 'Presentation',
    prompts: [
      'Explain a complex skill or hobby you have as if teaching it to a beginner.',
      'Describe a technology trend that will significantly change your industry in the next five years.',
      'Make the case for a book, film, or podcast everyone in your field should consume.',
      'Walk us through a lesson you learned from a professional failure.',
      'Pitch a product or idea you genuinely believe in — from scratch, in two minutes.',
      'Describe what great leadership looks like using a real example.',
      'Give a talk on the one habit that has had the biggest impact on your productivity.',
      'Present the most important thing you have changed your mind about in the last few years.',
    ],
  },
  {
    key: 'persuasion',
    label: 'Persuasion',
    prompts: [
      'Social media does more harm than good to society. Argue your position.',
      'Remote work should be the default for all jobs where it is possible.',
      'A four-day workweek should be the standard in most industries.',
      'College degrees are no longer worth the cost for most career paths.',
      'Governments should impose strict regulations on AI development now, before harm occurs.',
      'Persuade us: the most important skill anyone can develop today is one you name.',
      'Climate change should be treated as a national security emergency, not an environmental issue.',
      'Failure is a better teacher than success. Make the case.',
    ],
  },
  {
    key: 'storytelling',
    label: 'Storytelling',
    prompts: [
      'Tell the story of a moment that changed how you see yourself.',
      'Describe a time you were completely out of your comfort zone — what happened?',
      'Tell a story about a person who shaped who you are today.',
      'Describe a time you had to start over from scratch.',
      'Tell the story of the best or worst advice you ever received.',
      'Describe a moment when you realized you were wrong about something important.',
      'Tell a story about a time something went completely off-plan — and how it ended.',
      'Tell the story of a challenge you almost gave up on — and what made you continue.',
    ],
  },
];

function getRandomPrompt(): { prompt: string; categoryKey: string } {
  const cat = PROMPT_LIBRARY[Math.floor(Math.random() * PROMPT_LIBRARY.length)];
  return {
    categoryKey: cat.key,
    prompt: cat.prompts[Math.floor(Math.random() * cat.prompts.length)],
  };
}

export default function SetupScreen({ onStart, onViewHistory, onCalibrate, hasCalibration }: SetupScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [activeCategory, setActiveCategory] = useState('interview');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setPreviewError('Camera unavailable'));
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  function handleRemove() {
    setShowPrompt(false);
    setSelectedPrompt(null);
    setCustomMode(false);
    setCustomText('');
  }

  function handleShuffle() {
    const { prompt, categoryKey } = getRandomPrompt();
    setActiveCategory(categoryKey);
    setSelectedPrompt(prompt);
    setCustomMode(false);
  }

  function handleSelectPrompt(p: string) {
    setSelectedPrompt(prev => prev === p ? null : p);
    setCustomMode(false);
  }

  function handleCustomMode() {
    setCustomMode(true);
    setSelectedPrompt(null);
  }

  const effectivePrompt = customMode
    ? (customText.trim() || undefined)
    : (selectedPrompt ?? undefined);

  const categoryPrompts = PROMPT_LIBRARY.find(c => c.key === activeCategory)?.prompts ?? [];

  return (
    <div style={{ minHeight: '100svh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '52px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          Podium
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <SpeechSupportBanner />
          {onViewHistory && (
            <button onClick={onViewHistory} className="btn-ghost">History</button>
          )}
          <button onClick={onCalibrate} className="btn-ghost">
            {hasCalibration ? 'Re-calibrate' : 'Calibrate'}
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '32px',
        overflowY: 'auto',
      }}>
        {/* Camera window */}
        <div style={{
          width: '100%',
          maxWidth: '480px',
          aspectRatio: '16/9',
          background: '#000',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {previewError ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{previewError}</p>
          ) : (
            <video
              ref={videoRef}
              autoPlay muted playsInline
              aria-label="Camera preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
          )}
        </div>

        <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', margin: 0 }}>
          {previewError
            ? 'Camera unavailable — audio will still be recorded.'
            : "Check you're in frame, then start."}
        </p>

        {/* Prompt section */}
        <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!showPrompt ? (
            <button
              onClick={() => setShowPrompt(true)}
              className="btn-ghost"
              style={{ alignSelf: 'flex-start', fontSize: '12px', padding: '2px 0' }}
            >
              + Practice with a prompt
            </button>
          ) : (
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              animation: 'fade-up 0.2s ease-out both',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  Prompt
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button onClick={handleShuffle} className="btn-ghost" style={{ fontSize: '12px' }} title="Random prompt">
                    ↺ Shuffle
                  </button>
                  <button onClick={handleRemove} className="btn-ghost" style={{ fontSize: '12px' }}>
                    Remove
                  </button>
                </div>
              </div>

              {/* Category pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {PROMPT_LIBRARY.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => { setActiveCategory(cat.key); setCustomMode(false); }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      border: `1px solid ${activeCategory === cat.key && !customMode ? 'rgba(255,255,255,0.2)' : 'var(--color-border)'}`,
                      background: activeCategory === cat.key && !customMode ? 'rgba(255,255,255,0.07)' : 'transparent',
                      color: activeCategory === cat.key && !customMode ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      fontSize: '12px',
                      fontWeight: activeCategory === cat.key && !customMode ? 600 : 400,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Prompt list */}
              {!customMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {categoryPrompts.map(p => {
                    const isSelected = selectedPrompt === p;
                    return (
                      <button
                        key={p}
                        onClick={() => handleSelectPrompt(p)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${isSelected ? 'rgba(255,255,255,0.18)' : 'var(--color-border)'}`,
                          background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                          color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          transition: 'all 0.12s ease',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                        }}
                      >
                        <span style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          border: `1.5px solid ${isSelected ? 'var(--color-text-primary)' : 'var(--color-border-hover)'}`,
                          background: isSelected ? 'var(--color-text-primary)' : 'transparent',
                          flexShrink: 0,
                          marginTop: '2px',
                          transition: 'all 0.12s ease',
                        }} />
                        {p}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Custom mode */}
              {customMode ? (
                <textarea
                  className="input-field"
                  placeholder="Type your question or topic…"
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  rows={3}
                  autoFocus
                  style={{ resize: 'vertical', lineHeight: 1.65 }}
                />
              ) : (
                <button
                  onClick={handleCustomMode}
                  className="btn-ghost"
                  style={{ alignSelf: 'flex-start', fontSize: '12px' }}
                >
                  Write your own…
                </button>
              )}

              {/* Selected preview */}
              {effectivePrompt && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--color-surface-raised)',
                  borderLeft: '2px solid rgba(255,255,255,0.2)',
                }}>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.55 }}>
                    {effectivePrompt}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <PrimaryButton onClick={() => onStart(effectivePrompt)}>Start Recording</PrimaryButton>
      </div>
    </div>
  );
}

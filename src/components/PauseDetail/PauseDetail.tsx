import { computePauseStats } from '../../analysis/pacing';
import type { SessionEvent } from '../../db/db';
import type { TranscriptSegment } from '../../hooks/useSpeechCapture';

interface PauseDetailProps {
  events: SessionEvent[];
  transcript?: TranscriptSegment[];
}

export default function PauseDetail({ events, transcript }: PauseDetailProps) {
  const stats = computePauseStats(events, transcript ?? []);
  const hasTranscript = (transcript ?? []).length > 0;

  return (
    <div style={{
      background: '#0b1022',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '18px',
      padding: '24px',
      width: '100%',
      fontFamily: 'Figtree, system-ui, sans-serif',
    }}>
      <h3 style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#8a9bc2',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        margin: '0 0 16px 0',
      }}>
        Pause Analysis
      </h3>

      {stats.total === 0 ? (
        <p style={{
          fontSize: '14px',
          color: '#5e6f94',
          margin: 0,
        }}>
          No significant pauses detected
        </p>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: hasTranscript ? '20px' : 0,
          }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: '#e4e9f5' }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '12px', color: '#5e6f94' }}>
                Total Pauses
              </div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: '#e4e9f5' }}>
                {stats.averageDurationS.toFixed(1)}s
              </div>
              <div style={{ fontSize: '12px', color: '#5e6f94' }}>
                Avg Duration
              </div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: '#e4e9f5' }}>
                {stats.longestDurationS.toFixed(1)}s
              </div>
              <div style={{ fontSize: '12px', color: '#5e6f94' }}>
                Longest
              </div>
            </div>
          </div>

          {hasTranscript && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px',
            }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#e4e9f5' }}>
                  {stats.hesitationCount}
                </div>
                <div style={{ fontSize: '12px', color: '#5e6f94' }}>
                  Hesitation
                </div>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#e4e9f5' }}>
                  {stats.deliberateCount}
                </div>
                <div style={{ fontSize: '12px', color: '#5e6f94' }}>
                  Deliberate
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useJarvis } from '../context/JarvisContext';
import { Brain, Trash2, Search, Award } from 'lucide-react';

// Character-level Longest Common Subsequence Similarity Scorer (same math as difflib.SequenceMatcher)
function computeSimilarity(query, text) {
  const clean = (s) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const a = clean(query);
  const b = clean(text);
  if (!a || !b) return 0;

  // Compute LCS
  const dp = Array(a.length + 1).fill(0).map(() => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  const matchLen = dp[a.length][b.length];
  return (2.0 * matchLen) / (a.length + b.length);
}

export default function MemoryViewer() {
  const { memories, removeMemory } = useJarvis();
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate similarity scores if there is a query, and sort by score desc
  const processedMemories = memories.map(m => {
    const score = searchQuery.trim() ? computeSimilarity(searchQuery, m.fact) : 1.0;
    return { ...m, score };
  });

  // Sort memories: if query is present, sort by score descending; otherwise sort by date descending
  const sortedMemories = [...processedMemories].sort((a, b) => {
    if (searchQuery.trim()) {
      return b.score - a.score;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
      gap: '12px',
      marginTop: '8px'
    }}>
      {/* Header */}
      <div style={{
        fontFamily: 'var(--font-nav)',
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '1.5px',
        color: 'var(--accent-green)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Brain size={14} />
        MEMORY ENGINE VIEWER
      </div>

      {/* Search Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(0, 255, 159, 0.2)',
        borderRadius: '4px',
        padding: '4px 8px',
        gap: '6px'
      }}>
        <Search size={12} style={{ color: 'var(--accent-green)' }} />
        <input 
          type="text"
          placeholder="Query memory banks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '11px',
            fontFamily: 'var(--font-body)',
            outline: 'none',
            flex: 1
          }}
        />
      </div>

      {/* Memories list */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        overflowY: 'auto',
        flex: 1,
        paddingRight: '2px'
      }}>
        {sortedMemories.length === 0 ? (
          <div style={{
            fontSize: '11px',
            color: 'var(--text-dark)',
            textAlign: 'center',
            padding: '20px 0',
            fontStyle: 'italic',
            fontFamily: 'var(--font-mono)'
          }}>
            MEM_BANKS_EMPTY
          </div>
        ) : (
          sortedMemories.map((mem) => {
            const hasQuery = searchQuery.trim().length > 0;
            const scorePercent = Math.round(mem.score * 100);
            
            // Color based on confidence levels
            let scoreColor = 'var(--text-dark)';
            if (hasQuery) {
              if (mem.score >= 0.80) scoreColor = 'var(--accent-green)';
              else if (mem.score >= 0.50) scoreColor = 'var(--accent-orange)';
              else scoreColor = 'var(--accent-pink)';
            }

            return (
              <div 
                key={mem.id}
                className="cyber-panel"
                style={{
                  padding: '10px 12px',
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  borderLeft: '3px solid var(--accent-green)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    lineHeight: '1.4',
                    wordBreak: 'break-word'
                  }}>
                    {mem.fact}
                  </span>
                  
                  <button
                    onClick={() => removeMemory(mem.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.2s',
                      alignSelf: 'flex-start'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-pink)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '2px',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <span style={{ color: 'var(--text-dark)' }}>
                    {new Date(mem.created_at).toLocaleDateString()} {new Date(mem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {hasQuery && (
                    <span style={{
                      color: scoreColor,
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <Award size={10} />
                      CONF: {scorePercent}%
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useJarvis } from '../context/JarvisContext';
import { Brain, Trash2, Search, Award } from 'lucide-react';

// Character-level Longest Common Subsequence Similarity Scorer (matching backend logic)
function computeSimilarity(query, text) {
  const clean = (s) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const a = clean(query);
  const b = clean(text);
  if (!a || !b) return 0;

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

export default function KnowledgeView() {
  const { memories, removeMemory } = useJarvis();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' or 'timeline'

  // Process memories with search score
  const processedMemories = memories.map(m => {
    const score = searchQuery.trim() ? computeSimilarity(searchQuery, m.fact) : 1.0;
    return { ...m, score };
  });

  // Filter memories if searching (similarity score > 0.25)
  const filteredMemories = processedMemories.filter(m => !searchQuery.trim() || m.score > 0.25);

  const categorizeFact = (fact) => {
    const text = fact.toLowerCase();
    if (/deadline|july|date|due/i.test(text)) return 'Deadlines';
    if (/project|built|implement|capstone|jarvis/i.test(text)) return 'Projects';
    if (/prefer|like|style|want|usually/i.test(text)) return 'Preferences';
    return 'General';
  };

  // Grouping for CATEGORIES tab
  const categories = {
    'Deadlines': [],
    'Projects': [],
    'Preferences': [],
    'General': []
  };

  // Filtered and sorted category items
  const sortedCategoryMemories = [...filteredMemories].sort((a, b) => {
    if (searchQuery.trim()) return b.score - a.score;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  sortedCategoryMemories.forEach(mem => {
    const cat = categorizeFact(mem.fact);
    categories[cat].push(mem);
  });

  // Grouping for TIMELINE tab
  const timelineMemories = [...filteredMemories].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const timelineGroups = {};
  timelineMemories.forEach(mem => {
    const dateStr = new Date(mem.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    if (!timelineGroups[dateStr]) {
      timelineGroups[dateStr] = [];
    }
    timelineGroups[dateStr].push(mem);
  });

  const renderMemoryCard = (mem) => {
    return (
      <div 
        key={mem.id}
        className="cyber-panel"
        style={{
          padding: '16px 20px',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderLeft: '3px solid var(--accent-green)',
          backgroundColor: 'rgba(10, 14, 24, 0.4)',
          transition: 'all 0.2s ease',
          marginBottom: '10px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <span style={{
            fontSize: '13.5px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            lineHeight: '1.5',
            wordBreak: 'break-word'
          }}>
            {mem.fact}
          </span>
          
          <button
            onClick={() => removeMemory(mem.id)}
            title="Delete Memory Fact"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s',
              alignSelf: 'flex-start'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-pink)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Trash2 size={13} />
          </button>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '2px',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Recorded on {new Date(mem.created_at).toLocaleDateString()} {new Date(mem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'rgba(5, 8, 16, 0.65)',
      overflow: 'hidden',
      position: 'relative',
      transition: 'all 0.3s ease-in-out',
    }}>
      {/* Header Banner */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(10, 14, 24, 0.4)',
        flexShrink: 0
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-header)',
            fontSize: '18px',
            fontWeight: '600',
            letterSpacing: '1.5px',
            color: 'var(--accent-green)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Brain size={18} style={{ color: 'var(--accent-green)' }} />
            MEMORY
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)'
          }}>
            EPISODIC FACT BUFFER // LONG-TERM SEMANTIC MEMORIES
          </p>
        </div>

        {/* Search Input in Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(0, 255, 159, 0.25)',
          borderRadius: '4px',
          padding: '6px 12px',
          gap: '8px',
          width: '280px'
        }}>
          <Search size={14} style={{ color: 'var(--accent-green)' }} />
          <input 
            type="text"
            placeholder="Query memory banks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'var(--font-body)',
              outline: 'none',
              flex: 1
            }}
          />
        </div>
      </div>

      {/* Tabs Container */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-muted)',
        background: 'rgba(5, 8, 16, 0.4)',
        flexShrink: 0,
        padding: '0 24px'
      }}>
        <button
          onClick={() => setActiveTab('categories')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'categories' ? '2px solid var(--accent-green)' : '2px solid transparent',
            color: activeTab === 'categories' ? 'var(--accent-green)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-nav)',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '12px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '1.5px'
          }}
        >
          CATEGORIES
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'timeline' ? '2px solid var(--accent-green)' : '2px solid transparent',
            color: activeTab === 'timeline' ? 'var(--accent-green)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-nav)',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '12px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '1.5px'
          }}
        >
          TIMELINE
        </button>
      </div>

      {/* Main Workspace Area */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {memories.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            textAlign: 'center',
            gap: '16px',
            border: '1px dashed var(--border-muted)',
            borderRadius: '8px',
            background: 'rgba(10, 14, 24, 0.25)',
            opacity: 0.85
          }}>
            <Brain size={36} style={{ color: 'var(--accent-green)', filter: 'drop-shadow(0 0 8px rgba(0, 255, 159, 0.35))' }} />
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '1px' }}>
              KNOWLEDGE CORE VACANT
            </div>
            <div style={{ fontSize: '11px', maxWidth: '380px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              No long-term memories have been indexed yet. Speak with JARVIS to store key details or facts, which are parsed and persisted automatically.
            </div>
            <div style={{
              fontSize: '10px',
              color: 'var(--text-dark)',
              borderTop: '1px solid var(--border-muted)',
              paddingTop: '12px',
              width: '100%',
              maxWidth: '300px'
            }}>
              Try: "Remember that the user is Mithun" or "Remember that my capstone project deadline is July 6"
            </div>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            textAlign: 'center',
            gap: '12px'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 'bold', letterSpacing: '1px' }}>
              NO MATCHING MEMORIES FOUND
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Adjust your search query to find indexed facts.
            </div>
          </div>
        ) : activeTab === 'categories' ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {Object.keys(categories).map(catName => {
              const catMemories = categories[catName];
              if (catMemories.length === 0) return null;
              return (
                <div key={catName} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <h3 style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-header)',
                    color: 'var(--accent-green)',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    margin: '8px 0 10px 0',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-green)',
                      boxShadow: 'var(--glow-green)'
                    }} />
                    {catName} ({catMemories.length})
                  </h3>
                  {catMemories.map(renderMemoryCard)}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {Object.keys(timelineGroups).map(dateStr => {
              const groupMemories = timelineGroups[dateStr];
              return (
                <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <h3 style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-header)',
                    color: 'var(--accent-green)',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    margin: '8px 0 10px 0',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-green)',
                      boxShadow: 'var(--glow-green)'
                    }} />
                    {dateStr}
                  </h3>
                  {groupMemories.map(renderMemoryCard)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

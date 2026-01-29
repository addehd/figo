import { useState, useEffect } from "react";
import "./styles.css";

interface NodeData {
  id: string;
  name: string;
  type: string;
  style?: {
    width?: number;
    height?: number;
    left?: number;
    top?: number;
    backgroundColor?: string;
    borderRadius?: number;
    parentWidth?: number;
    parentHeight?: number;
  };
  props?: {
    text?: string;
  };
  children?: NodeData[];
  [key: string]: any; // Allow any properties from Figma
}

function sanitizeClassName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
}

function generateHTML(node: NodeData, isRoot = true, indent = 0): string {
  const className = sanitizeClassName(node.name);
  const style = node.style || {};
  const spaces = '  '.repeat(indent);
  
  const styles: string[] = [];
  
  if (isRoot) {
    styles.push('position: relative');
    if (style.width) styles.push(`width: ${style.width}px`);
    if (style.height) styles.push(`height: ${style.height}px`);
  } else {
    styles.push('position: absolute');
    const pw = style.parentWidth;
    const ph = style.parentHeight;
    
    // Check if element is centered horizontally
    if (pw && style.left !== undefined && style.width) {
      const nodeCenter = style.left + (style.width / 2);
      const parentCenter = pw / 2;
      const isCentered = Math.abs(nodeCenter - parentCenter) < 5;
      
      if (isCentered) {
        styles.push('left: 50%');
        styles.push('transform: translateX(-50%)');
      } else {
        const leftPct = (style.left / pw) * 100;
        styles.push(`left: ${leftPct.toFixed(2)}%`);
      }
    }
    
    if (ph && style.top !== undefined) {
      const topPct = (style.top / ph) * 100;
      styles.push(`top: ${topPct.toFixed(2)}%`);
    }
    
    if (pw && style.width) {
      const widthPct = (style.width / pw) * 100;
      styles.push(`width: ${widthPct.toFixed(2)}%`);
    }
    
    if (ph && style.height) {
      const heightPct = (style.height / ph) * 100;
      styles.push(`height: ${heightPct.toFixed(2)}%`);
    }
  }
  
  if (style.backgroundColor) styles.push(`background-color: ${style.backgroundColor}`);
  if (style.borderRadius) styles.push(`border-radius: ${style.borderRadius}px`);
  
  const styleAttr = styles.length ? ` style="${styles.join('; ')}"` : '';
  const textContent = node.props?.text || '';
  const children = node.children?.map(c => generateHTML(c, false, indent + 1)).join('\n') || '';
  
  if (children) {
    return `${spaces}<div class="${className}"${styleAttr}>\n${textContent ? spaces + '  ' + textContent + '\n' : ''}${children}\n${spaces}</div>`;
  }
  return `${spaces}<div class="${className}"${styleAttr}>${textContent}</div>`;
}

function App() {
  const [selection, setSelection] = useState<NodeData[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [viewMode, setViewMode] = useState<'json' | 'html'>('json');

  const saveToken = () => {
    parent.postMessage({ pluginMessage: { type: 'saveToken', token: tokenInput } }, '*');
  };

  const copyToClipboard = (node: NodeData, mode: 'json' | 'html') => {
    try {
      const text = mode === 'json' 
        ? JSON.stringify(node, null, 2)
        : generateHTML(node);
      
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      
      // Select and copy the text
      textarea.select();
      document.execCommand('copy');
      
      // Clean up
      document.body.removeChild(textarea);
      
      setCopiedId(node.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    // Request token on mount
    parent.postMessage({ pluginMessage: { type: 'getToken' } }, '*');
    
    // Listen for messages from plugin backend
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      
      if (msg.type === "selection") {
        console.log("Full selection data:", msg.data);
        setSelection(msg.data);
      }
      
      if (msg.type === "token") {
        setAccessToken(msg.token);
        setTokenInput(msg.token);
      }
      
      if (msg.type === "tokenSaved") {
        setShowSettings(false);
        // Re-request token to update accessToken state
        parent.postMessage({ pluginMessage: { type: 'getToken' } }, '*');
      }
      
      if (msg.type === "tokenCleared") {
        setAccessToken('');
        setTokenInput('');
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  useEffect(() => {
    if (selection) {
      console.log("Current selection state:", selection);
    }
  }, [selection]);

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Figo</h1>
            <p className="subtitle">Select elements in Figma to view their data</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              cursor: 'pointer',
              borderRadius: '4px',
              border: '1px solid #ccc',
              background: '#fff',
            }}
          >
            ⚙️ Settings
          </button>
        </div>
        
        {showSettings && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: '#f5f5f5',
            borderRadius: '8px',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Figma Access Token</h3>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
              Enter your personal access token to fetch comments.
              <a
                href="https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens"
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: '4px' }}
              >
                Learn how to generate one →
              </a>
            </p>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="figd_..."
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginBottom: '8px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={saveToken}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#0d99ff',
                  color: '#fff',
                }}
              >
                Save Token
              </button>
              {accessToken && (
                <button
                  onClick={() => {
                    parent.postMessage({ pluginMessage: { type: 'clearToken' } }, '*');
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    background: '#fff',
                  }}
                >
                  Clear Token
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="content">
        {!selection || selection.length === 0 ? (
          <div className="empty-state">
            <p>👈 Select one or more elements in Figma</p>
          </div>
        ) : (
          <div className="selection-list">
            {selection.map((node) => (
              <div key={node.id} className="node-card">
                <div className="node-header">
                  <span className="node-type">{node.type}</span>
                  <h3 className="node-name">{node.name}</h3>
                </div>
                <div className="node-details">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <button
                      onClick={() => setViewMode('json')}
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        background: viewMode === 'json' ? "#18a0fb" : "#fff",
                        color: viewMode === 'json' ? "#fff" : "#333",
                        fontWeight: viewMode === 'json' ? "600" : "400",
                      }}
                    >
                      JSON
                    </button>
                    <button
                      onClick={() => setViewMode('html')}
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        background: viewMode === 'html' ? "#18a0fb" : "#fff",
                        color: viewMode === 'html' ? "#fff" : "#333",
                        fontWeight: viewMode === 'html' ? "600" : "400",
                      }}
                    >
                      HTML
                    </button>
                    <button
                      onClick={() => copyToClipboard(node, viewMode)}
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        background: copiedId === node.id ? "#4CAF50" : "#fff",
                        color: copiedId === node.id ? "#fff" : "#333",
                        transition: "all 0.2s",
                        marginLeft: "auto",
                      }}
                    >
                      {copiedId === node.id ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre style={{
                    background: "#f5f5f5",
                    padding: "12px",
                    borderRadius: "4px",
                    overflow: "auto",
                    fontSize: "12px",
                    maxHeight: "400px"
                  }}>
                    {viewMode === 'json' 
                      ? JSON.stringify(node, null, 2)
                      : generateHTML(node)
                    }
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

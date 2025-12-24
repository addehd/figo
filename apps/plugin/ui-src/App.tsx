import { useState, useEffect } from "react";
import "./styles.css";

interface NodeData {
  id: string;
  name: string;
  type: string;
  [key: string]: any; // Allow any properties from Figma
}

function App() {
  const [selection, setSelection] = useState<NodeData[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  const saveToken = () => {
    parent.postMessage({ pluginMessage: { type: 'saveToken', token: tokenInput } }, '*');
  };

  const copyToClipboard = (node: NodeData) => {
    try {
      const jsonText = JSON.stringify(node, null, 2);
      
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = jsonText;
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
                  <details open>
                    <summary style={{ cursor: "pointer", fontWeight: "bold", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Full Object Data</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(node);
                        }}
                        style={{
                          padding: "4px 12px",
                          fontSize: "12px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          border: "1px solid #ccc",
                          background: copiedId === node.id ? "#4CAF50" : "#fff",
                          color: copiedId === node.id ? "#fff" : "#333",
                          transition: "all 0.2s"
                        }}
                      >
                        {copiedId === node.id ? "✓ Copied!" : "Copy"}
                      </button>
                    </summary>
                    <pre style={{
                      background: "#f5f5f5",
                      padding: "12px",
                      borderRadius: "4px",
                      overflow: "auto",
                      fontSize: "12px",
                      maxHeight: "400px"
                    }}>
                      {JSON.stringify(node, null, 2)}
                    </pre>
                  </details>
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

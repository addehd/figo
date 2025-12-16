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
    // Listen for messages from plugin backend
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      
      if (msg.type === "selection") {
        console.log("Full selection data:", msg.data);
        setSelection(msg.data);
      }
    };
  }, []);
  
  useEffect(() => {
    if (selection) {
      console.log("Current selection state:", selection);
    }
  }, [selection]);

  return (
    <div className="app">
      <header className="header">
        <h1>Figo</h1>
        <p className="subtitle">Select elements in Figma to view their data</p>
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

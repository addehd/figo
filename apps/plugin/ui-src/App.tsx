import { useState, useEffect } from "react";
import "./styles.css";

interface NodeData {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

function App() {
  const [selection, setSelection] = useState<NodeData[] | null>(null);

  useEffect(() => {
    // Listen for messages from plugin backend
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      
      if (msg.type === "selection") {
        setSelection(msg.data);
      }
    };
    console.log("selection", selection);
  }, []);

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
                  <div className="detail-row">
                    <span className="label">ID:</span>
                    <span className="value">{node.id}</span>
                  </div>
                  {node.width !== undefined && (
                    <>
                      <div className="detail-row">
                        <span className="label">Position:</span>
                        <span className="value">
                          x: {Math.round(node.x!)} y: {Math.round(node.y!)}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Size:</span>
                        <span className="value">
                          {Math.round(node.width)} × {Math.round(node.height!)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="detail-row">
                    <span className="label">Visible:</span>
                    <span className="value">{node.visible ? "Yes" : "No"}</span>
                  </div>
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

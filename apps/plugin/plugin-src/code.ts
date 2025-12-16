// This plugin runs in the Figma environment and communicates with the UI
figma.showUI(__html__, { width: 400, height: 600, themeColors: true });

// Handle selection changes
figma.on("selectionchange", () => {
  sendSelectionToUI();
});

// Send current selection to UI on startup
sendSelectionToUI();

function sendSelectionToUI() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.ui.postMessage({
      type: "selection",
      data: null,
    });
    return;
  }

  // Serialize the selection data
  const selectionData = selection.map((node) => serializeNode(node));
  
  figma.ui.postMessage({
    type: "selection",
    data: selectionData,
  });
}

function serializeNode(node: SceneNode) {
  const baseData = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
  };

  // Add bounds if available
  if ("x" in node && "y" in node && "width" in node && "height" in node) {
    return {
      ...baseData,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    };
  }

  return baseData;
}

// Handle messages from UI
figma.ui.onmessage = (msg) => {
  if (msg.type === "close") {
    figma.closePlugin();
  }
};

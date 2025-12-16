// This plugin runs in the Figma environment and communicates with the UI
figma.showUI(__html__, { width: 400, height: 600, themeColors: true });

// Handle selection changes
figma.on("selectionchange", () => {
  sendSelectionToUI();
});

// Send current selection to UI on startup
sendSelectionToUI();

async function sendSelectionToUI() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.ui.postMessage({
      type: "selection",
      data: null,
    });
    return;
  }

  // Serialize the selection data and export SVG
  const selectionData = await Promise.all(
    selection.map(async (node) => {
      const nodeData = serializeNode(node);
      
      // Export as SVG if the node supports it
      if ("exportAsync" in node) {
        try {
          console.log(`Exporting SVG for node: ${node.name} (${node.type})`);
          const svgData = await node.exportAsync({
            format: "SVG",
            svgOutlineText: true,
            svgIdAttribute: false,
            svgSimplifyStroke: true,
            contentsOnly: true,
          });
          
          // Convert Uint8Array to string
          const svgString = String.fromCharCode.apply(null, svgData as any);
          nodeData.svg = svgString;
          console.log(`SVG exported successfully. Length: ${svgString.length} characters`);
        } catch (error) {
          console.error(`Failed to export SVG for node ${node.name}:`, error);
        }
      } else {
        console.log(`Node ${node.name} (${node.type}) does not support exportAsync`);
      }
      
      return nodeData;
    })
  );
  
  figma.ui.postMessage({
    type: "selection",
    data: selectionData,
  });
}

function serializeNode(node: SceneNode): any {
  // Start with all enumerable properties
  const data: any = {};
  
  // Basic properties
  data.id = node.id;
  data.name = node.name;
  data.type = node.type;
  data.visible = node.visible;
  data.locked = node.locked;
  data.removed = node.removed;
  
  // Position and dimensions
  if ("x" in node) data.x = node.x;
  if ("y" in node) data.y = node.y;
  if ("width" in node) data.width = node.width;
  if ("height" in node) data.height = node.height;
  if ("rotation" in node) data.rotation = node.rotation;
  
  // Layout properties
  if ("layoutMode" in node) data.layoutMode = node.layoutMode;
  if ("layoutAlign" in node) data.layoutAlign = node.layoutAlign;
  if ("primaryAxisAlignItems" in node) data.primaryAxisAlignItems = node.primaryAxisAlignItems;
  if ("counterAxisAlignItems" in node) data.counterAxisAlignItems = node.counterAxisAlignItems;
  if ("primaryAxisSizingMode" in node) data.primaryAxisSizingMode = node.primaryAxisSizingMode;
  if ("counterAxisSizingMode" in node) data.counterAxisSizingMode = node.counterAxisSizingMode;
  if ("paddingLeft" in node) data.paddingLeft = node.paddingLeft;
  if ("paddingRight" in node) data.paddingRight = node.paddingRight;
  if ("paddingTop" in node) data.paddingTop = node.paddingTop;
  if ("paddingBottom" in node) data.paddingBottom = node.paddingBottom;
  if ("itemSpacing" in node) data.itemSpacing = node.itemSpacing;
  
  // Opacity and blend mode
  if ("opacity" in node) data.opacity = node.opacity;
  if ("blendMode" in node) data.blendMode = node.blendMode;
  if ("isMask" in node) data.isMask = node.isMask;
  if ("effects" in node) data.effects = node.effects;
  if ("effectStyleId" in node) data.effectStyleId = node.effectStyleId;
  
  // Fills and strokes
  if ("fills" in node) data.fills = node.fills;
  if ("strokes" in node) data.strokes = node.strokes;
  if ("strokeWeight" in node) data.strokeWeight = node.strokeWeight;
  if ("strokeAlign" in node) data.strokeAlign = node.strokeAlign;
  if ("strokeCap" in node) data.strokeCap = node.strokeCap;
  if ("strokeJoin" in node) data.strokeJoin = node.strokeJoin;
  if ("fillStyleId" in node) data.fillStyleId = node.fillStyleId;
  if ("strokeStyleId" in node) data.strokeStyleId = node.strokeStyleId;
  
  // Corner radius
  if ("cornerRadius" in node) data.cornerRadius = node.cornerRadius;
  if ("topLeftRadius" in node) data.topLeftRadius = node.topLeftRadius;
  if ("topRightRadius" in node) data.topRightRadius = node.topRightRadius;
  if ("bottomLeftRadius" in node) data.bottomLeftRadius = node.bottomLeftRadius;
  if ("bottomRightRadius" in node) data.bottomRightRadius = node.bottomRightRadius;
  
  // Text properties
  if ("characters" in node) data.characters = node.characters;
  if ("fontSize" in node) data.fontSize = node.fontSize;
  if ("fontName" in node) data.fontName = node.fontName;
  if ("textAlignHorizontal" in node) data.textAlignHorizontal = node.textAlignHorizontal;
  if ("textAlignVertical" in node) data.textAlignVertical = node.textAlignVertical;
  if ("lineHeight" in node) data.lineHeight = node.lineHeight;
  if ("letterSpacing" in node) data.letterSpacing = node.letterSpacing;
  if ("textCase" in node) data.textCase = node.textCase;
  if ("textDecoration" in node) data.textDecoration = node.textDecoration;
  if ("textStyleId" in node) data.textStyleId = node.textStyleId;
  
  // Constraints
  if ("constraints" in node) data.constraints = node.constraints;
  
  // Parent and children info
  if (node.parent) {
    data.parent = {
      id: node.parent.id,
      name: node.parent.name,
      type: node.parent.type,
    };
  }
  
  if ("children" in node) {
    data.childrenCount = node.children.length;
    // Recursively serialize all children
    data.children = node.children.map(child => serializeNode(child));
  }
  
  // Plugin data and shared plugin data
  if ("getPluginData" in node) {
    const pluginDataKeys = node.getPluginDataKeys();
    if (pluginDataKeys.length > 0) {
      data.pluginData = {};
      pluginDataKeys.forEach(key => {
        data.pluginData[key] = node.getPluginData(key);
      });
    }
  }
  
  // Absolute position
  if ("absoluteTransform" in node) {
    data.absoluteTransform = node.absoluteTransform;
  }
  if ("absoluteBoundingBox" in node) {
    data.absoluteBoundingBox = node.absoluteBoundingBox;
  }
  
  // Export settings
  if ("exportSettings" in node) data.exportSettings = node.exportSettings;
  
  return data;
}

// Handle messages from UI
figma.ui.onmessage = (msg) => {
  if (msg.type === "close") {
    figma.closePlugin();
  }
};

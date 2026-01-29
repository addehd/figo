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
  
  // Fetch comments and attach to nodes
  const nodeIds = selectionData.map(n => n.id);
  const allComments = await fetchComments(figma.fileKey || '', nodeIds);
  
  selectionData.forEach((node: any) => {
    node.comments = allComments.filter(
      (comment: any) => comment.client_meta?.node_id === node.id
    );
  });
  
  figma.ui.postMessage({
    type: "selection",
    data: selectionData,
    fileKey: figma.fileKey,
  });
}

type UIElement = {
  id: string;
  type: 'button' | 'input' | 'map' | 'sheet' | 'pin' | 'container' | string;
  name?: string;
  style?: {
    width?: number | 'full';
    height?: number;
    backgroundColor?: string;
    borderRadius?: number;
    position?: 'absolute' | 'relative';
    top?: number;
    left?: number;
    parentWidth?: number;
    parentHeight?: number;
  };
  children?: UIElement[];
  props?: {
    placeholder?: string;
    onPress?: string;
    icon?: string;
    text?: string;
    keyboardType?: 'url' | 'default';
  };
};

function extractColor(fills: readonly Paint[] | symbol): string | undefined {
  if (typeof fills === 'symbol' || !Array.isArray(fills) || fills.length === 0) {
    return undefined;
  }
  
  const solidFill = fills.find(fill => fill.type === 'SOLID' && fill.visible !== false);
  if (solidFill && solidFill.type === 'SOLID') {
    const { r, g, b } = solidFill.color;
    const a = solidFill.opacity ?? 1;
    if (a === 1) {
      return `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
    }
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }
  return undefined;
}

function inferComponentType(node: SceneNode): UIElement['type'] {
  const name = node.name.toLowerCase();
  
  if (name.includes('button') || name.includes('btn')) return 'button';
  if (name.includes('input') || name.includes('textfield')) return 'input';
  if (name.includes('map')) return 'map';
  if (name.includes('sheet') || name.includes('modal')) return 'sheet';
  if (name.includes('pin') || name.includes('marker')) return 'pin';
  if (node.type === 'FRAME' || node.type === 'GROUP') return 'container';
  
  return node.type.toLowerCase();
}

function serializeNode(node: SceneNode, parentWidth?: number, parentHeight?: number): UIElement {
  const element: UIElement = {
    id: node.id,
    type: inferComponentType(node),
    name: node.name,
    style: {},
    props: {},
  };
  
  // Store parent dimensions for percentage calculation
  if (parentWidth) {
    element.style!.parentWidth = parentWidth;
  }
  if (parentHeight) {
    element.style!.parentHeight = parentHeight;
  }
  
  // Extract dimensions
  if ('width' in node && node.width) {
    element.style!.width = Math.round(node.width);
  }
  if ('height' in node && node.height) {
    element.style!.height = Math.round(node.height);
  }
  
  // Extract position
  if ('x' in node && 'y' in node) {
    element.style!.left = Math.round(node.x);
    element.style!.top = Math.round(node.y);
  }
  
  // Extract background color
  if ('fills' in node) {
    const bgColor = extractColor(node.fills);
    if (bgColor) {
      element.style!.backgroundColor = bgColor;
    }
  }
  
  // Extract border radius
  if ('cornerRadius' in node && typeof node.cornerRadius === 'number') {
    element.style!.borderRadius = Math.round(node.cornerRadius);
  }
  
  // Extract text content for text nodes
  if ('characters' in node && typeof node.characters === 'string') {
    element.props!.text = node.characters;
  }
  
  // Recursively serialize children with current node dimensions as parent
  if ('children' in node && node.children.length > 0) {
    const w = 'width' in node ? Math.round(node.width) : undefined;
    const h = 'height' in node ? Math.round(node.height) : undefined;
    element.children = node.children.map(child => serializeNode(child, w, h));
  }
  
  // Clean up empty objects
  if (Object.keys(element.style!).length === 0) {
    delete element.style;
  }
  if (Object.keys(element.props!).length === 0) {
    delete element.props;
  }
  
  return element;
}

// Fetch comments from Figma API
async function fetchComments(fileKey: string, nodeIds: string[]): Promise<any[]> {
  const accessToken = await figma.clientStorage.getAsync('figmaAccessToken');
  
  if (!accessToken) {
    console.log('No access token available, skipping comments fetch');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.figma.com/v1/files/${fileKey}/comments`,
      {
        headers: {
          'X-Figma-Token': accessToken,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch comments:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.comments || [];
  } catch (err) {
    console.error('Error fetching comments:', err);
    return [];
  }
}

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === "close") {
    figma.closePlugin();
  }
  
  if (msg.type === "saveToken") {
    await figma.clientStorage.setAsync('figmaAccessToken', msg.token);
    figma.ui.postMessage({ type: "tokenSaved" });
  }
  
  if (msg.type === "getToken") {
    const token = await figma.clientStorage.getAsync('figmaAccessToken');
    figma.ui.postMessage({ type: "token", token: token || '' });
  }
  
  if (msg.type === "clearToken") {
    await figma.clientStorage.deleteAsync('figmaAccessToken');
    figma.ui.postMessage({ type: "tokenCleared" });
  }
};

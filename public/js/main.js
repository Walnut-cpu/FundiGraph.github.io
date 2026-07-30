import * as state from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { rebuildAndRenderGraph } from './graph.js';

// --- 核心逻辑：点击节点展开/折叠（折叠只隐藏邻居节点，核心节点始终可见） ---
export function toggleNode(nodeId) {
  const isCurrentlyExpanded = state.expandedNodes.has(nodeId);
  let nodeForDetails = null;

  // Case 1: The clicked node is the currently "focused" node.
  if (state.focusedNodeId === nodeId) {
    state.setFocusedNode(null); // Exit focus mode
    nodeForDetails = state.allNodes.find(n => n.id === nodeId); // Reselect to show details panel
    state.setSelectedNode(nodeForDetails);
    ui.updateDetailsPanel(nodeForDetails);
    rebuildAndRenderGraph();
    return;
  }

  // Case 2: The clicked node is the single expanded node on the graph.
  if (isCurrentlyExpanded && state.expandedNodes.size === 1) {
    state.setFocusedNode(nodeId); // Enter focus mode
    state.setSelectedNode(null); // Hide details panel
    ui.updateDetailsPanel(null);
    rebuildAndRenderGraph();
    return;
  }

  // Case 3: Default behavior for expanding/collapsing nodes.
  if (isCurrentlyExpanded) {
    state.expandedNodes.delete(nodeId); // ← 这里执行折叠操作
  } else {
    state.expandedNodes.add(nodeId); // ← 这里执行展开操作
    nodeForDetails = state.allNodes.find(n => n.id === nodeId);
  }
  
  state.setFocusedNode(null);
  
  state.setSelectedNode(nodeForDetails);
  rebuildAndRenderGraph();
  ui.updateDetailsPanel(nodeForDetails);
}


// 清空图
export function clearGraph() {
  state.expandedNodes.clear();
  state.setSelectedNode(null);
  state.setFocusedNode(null);
  state.setFilteredNodeIds(null);
  ui.updateDetailsPanel(null);
  rebuildAndRenderGraph();
}

// 展示完整图
async function showFullGraph() {
  if (state.allNodes.length === 0) {
    const data = await api.fetchFullGraph();
    state.setAllData(data.nodes, data.edges);
  }
  state.expandedNodes.clear();
  state.setFilteredNodeIds(null);
  state.setFocusedNode(null);
  state.allNodes.forEach(n => state.expandedNodes.add(n.id));
  rebuildAndRenderGraph();
}

// 搜索逻辑（只高亮，不折叠）
async function searchGraph(query) {
  if (!query) return;
  query = query.toLowerCase().trim();

  const results = state.allNodes.filter(node => {
    const name = (node.properties?.name || node.id).toString().toLowerCase();
    return name.includes(query);
  });

  if (results.length > 0) {
    const matchedIds = new Set(results.map(n => n.id));
    state.setFilteredNodeIds(matchedIds);
    rebuildAndRenderGraph();
  } else {
    alert("No matching nodes found.");
  }
}

// 初始化事件
function setupEventListeners() {
  document.getElementById("clearBtn").addEventListener("click", clearGraph);
  document.getElementById("showFullGraphBtn").addEventListener("click", showFullGraph);

  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  searchBtn.addEventListener("click", () => searchGraph(searchInput.value));
  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") searchGraph(e.target.value);
  });
}

// 初始加载 First 节点 + 20 条边
async function loadInitialGraph() {
  const data = await api.fetchInitialGraph();
  state.setAllData(data.nodes, data.edges);

  const firstNodes = data.nodes.filter(n => n.labels?.includes("First"));
  const mainNode = firstNodes[0] || data.nodes[0];
  if (!mainNode) return;

  const connectedEdges = data.edges.filter(
    e => e.from === mainNode.id || e.to === mainNode.id
  ).slice(0, 20);

  const nodeIds = new Set([mainNode.id]);
  connectedEdges.forEach(e => {
    nodeIds.add(e.from);
    nodeIds.add(e.to);
  });

  const initialNodes = data.nodes.filter(n => nodeIds.has(n.id));

  state.expandedNodes.clear();
  state.expandedNodes.add(mainNode.id);
  state.setFilteredNodeIds(state.filteredNodeIds); // 保留搜索高亮

  state.graphData.nodes = initialNodes;
  state.graphData.links = connectedEdges;
  rebuildAndRenderGraph();

  state.setSelectedNode(mainNode);
  ui.updateDetailsPanel(mainNode);
}

// 初始化应用
async function initializeApp() {
  const sidebarLabels = Object.keys(state.colorMap);
  state.setLabels(sidebarLabels);
  ui.renderLabelButtons();
  ui.renderLegend();

  await loadInitialGraph();
  setupEventListeners();
}

initializeApp();

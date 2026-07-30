/**
 * state.js: 集中管理应用的所有共享状态。
 */

// 颜色与展示文本
export const colorMap = {
  // --- Disease Levels (保留原始要求) ---
  "First":              { color: "#EF5350", text: "Disease Level 1" },
  "Second":             { color: "#FFA726", text: "Disease Level 2" },
  "Third":              { color: "#FFEB3B", text: "Disease Level 3" },
  "Forth":              { color: "#FFF8DC", text: "Disease Level 4" },

  // --- 症状与体征类 (紫色/绿色系 - 清新且可区分) ---
  "Symptom":            { color: "#AB47BC", text: "Symptom" },
  "Physical_sign":      { color: "#66BB6A", text: "Physical sign" },
  "OCT_sign":           { color: "#29B6F6", text: "OCT sign" },

  // --- 诊断与评估类 (大地色/棕色系 - 沉稳) ---
  "Exanmination":       { color: "#5C6BC0", text: "Exanmination" },
  "Anatomical_location": { color: "#8D6E63", text: "Anatomical_location" },
  "Differential_diagnosis": { color: "#795548", text: "Differential diagnosis" },
  "Medical_history":    { color: "#546E7A", text: "Medical_history" },
  "Staging_typing":     { color: "#00796B", text: "Staging_typing"},

  // --- 治疗类 (蓝色系 - 统一专业感，通过深浅区分) ---
  "Treatment_general":  { color: "#42A5F5", text: "Treatment_general" },
  "Treatment_drug":     { color: "#3949AB", text: "Treatment_drug" },
  "Treatment_surgery":  { color: "#1E88E5", text: "Treatment_surgery" },
  "Treatment_usage":    { color: "#26C6DA", text: "Treatment_usage" },
  "Treatment_indications":      { color: "#7E57C2", text: "Treatment_indications" },
  "Treatment_contraindications": { color: "#5E35B1", text: "Treatment_contraindications" },

  // --- 个体与基因类 (暖色系 - 醒目) ---
  "Etiology":           { color: "#EC407A", text: "Etiology" },
  "Gene":               { color: "#D4E157", text: "Gene" },
  "Age_of_onset":       { color: "#FF7043", text: "Age_of_onset" },
  "High_risk_population": { color: "#F06292", text: "High_risk_population" },
  "Complication":       { color: "#FFB74D", text: "Complication" },
  "Related_disease":    { color: "#9575CD", text: "Related disease" },

  // --- 同义词类 (柔和灰度系) ---
  "Synonym_3":          { color: "#B0BEC5", text: "Synonym level 3" },
  "Synonym_4":          { color: "#CFD8DC", text: "Synonym level 4" }
};

// 前端标签 -> 数据库标签 映射
export const frontendToDbLabelMap = {};

// 反向映射（dbLabel -> frontendLabel）
export const dbToFrontendLabelMap = Object.entries(frontendToDbLabelMap).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {});

// 全局状态
export let allNodes = [];
export let allEdges = [];
export let labels = [];
export let expandedNodes = new Set();
export let selectedNodeForDetails = null;
export let nodeToCenterAfterSimulation = null;
export let focusedNodeId = null;
export const graphData = { nodes: [], links: [] };
export const nodesMap = new Map();

// 过滤模式：搜索高亮节点
export let filteredNodeIds = null;

// State Modifier Functions
export function setAllData(nodes, edges) {
  allNodes = nodes;
  allEdges = edges;
}

export function setLabels(newLabels) {
  labels = newLabels;
}

export function setSelectedNode(node) {
  selectedNodeForDetails = node;
}

export function setNodeToCenter(nodeId) {
  nodeToCenterAfterSimulation = nodeId;
}

export function setFocusedNode(nodeId) {
  focusedNodeId = nodeId;
}

export function setFilteredNodeIds(idSetOrNull) {
  filteredNodeIds = idSetOrNull;
}

// 获取可视节点集合（搜索模式 + 普通模式兼容）
export function getVisibleNodeIds() {
  const visibleNodeIds = new Set();

  // 所有展开节点必显示
  expandedNodes.forEach(id => visibleNodeIds.add(id));

  // 搜索高亮节点也显示
  if (filteredNodeIds && filteredNodeIds instanceof Set) {
    filteredNodeIds.forEach(id => visibleNodeIds.add(id));
  }

  // 邻居节点（普通模式）保持
  if (!focusedNodeId) {
    expandedNodes.forEach(expandedId => {
      allEdges.forEach(edge => {
        if (edge.from === expandedId) visibleNodeIds.add(edge.to);
        if (edge.to === expandedId) visibleNodeIds.add(edge.from);
      });
    });
  }

  return visibleNodeIds;
}

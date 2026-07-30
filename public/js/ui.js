import * as state from './state.js';
import * as api from './api.js';
import { rebuildAndRenderGraph, centerOnNode } from './graph.js';
import { toggleNode } from './main.js';
import { clearGraph } from './main.js';

export function renderLabelButtons() {
  const containerLB = d3.select("#labelButtons").html("");

  state.labels.forEach(label => {
    const displayLabel = state.frontendToDbLabelMap[label] || state.colorMap[label]?.text || label.replace(/_/g, ' ');
    const ct = containerLB.append("div").attr("class", "label-container");
    const labelForApiCall = state.frontendToDbLabelMap[label] || label;

    ct.append("button").text(displayLabel).on("click", () => toggleLabelList(ct, labelForApiCall));
    ct.append("div").attr("class", "nodeListContainer").attr("data-label", labelForApiCall);
  });
}

export function renderLegend() {
  const legend = d3.select("#legend").html("");
  Object.entries(state.colorMap).forEach(([label, info]) => {
    const item = legend.append("div");
    item.append("span").attr("class", "color-box").style("background-color", info.color);
    item.append("span").text(info.text);
  });
}

async function toggleLabelList(container, label) {
  const listDiv = container.select(`.nodeListContainer[data-label='${label}']`);
  const isVisible = listDiv.style("display") === "block";
  if (isVisible) {
    listDiv.style("display", "none");
    return;
  }

  const nodes = await api.fetchNodesByLabel(label);
  nodes.sort((a, b) => (a.properties.name || "").toLowerCase().localeCompare((b.properties.name || "").toLowerCase()));

  renderNodeList(nodes, listDiv);
  listDiv.style("display", "block");
}

function renderNodeList(nodes, listDiv) {
  listDiv.html("");
  nodes.forEach(node => {
    listDiv.append("button").text(node.properties.name || node.id)
      .on("click", () => {
        const targetNode = state.allNodes.find(n => n.id === node.id) || state.graphData.nodes.find(n => n.id === node.id);
        if (targetNode) {
          state.expandedNodes.add(targetNode.id);
          // 点击目录节点时，保留搜索高亮节点，不清空 filteredNodeIds
          state.setNodeToCenter(targetNode.id);
          state.setSelectedNode(targetNode);
          rebuildAndRenderGraph();
          updateDetailsPanel(targetNode);
        }
      });
  });
}

// 详情面板
export function updateDetailsPanel(node) {
  const panel = d3.select("#detailsPanel");
  panel.html("");

  if (!node) {
    panel.style("display", "none");
    return;
  }

  panel
    .style("display", "block")
    .style("left", "20px")
    .style("top", "30px")
    .style("right", null);

  const header = panel.append("h4").text(node.properties?.name || `Node ${node.id}`);
  header.style("cursor", "move");
  makeDraggable(panel.node(), header.node());

  const propsDiv = panel.append("div").attr("class", "node-properties");
  Object.entries(node.properties || {}).forEach(([key, value]) => {
    propsDiv.append("p").text(`${key}: ${value}`);
  });

  const relatedInfo = {};
  state.allEdges.forEach(edge => {
    let neighborId = null;
    if (edge.from === node.id) neighborId = edge.to;
    if (edge.to === node.id) neighborId = edge.from;

    if (neighborId) {
      const neighborNode = state.graphData.nodes.find(n => n.id === neighborId) || state.allNodes.find(n => n.id === neighborId);
      if (neighborNode) {
        const dbLabel = neighborNode.labels?.[0] || "Unknown";
        const frontendLabel = state.dbToFrontendLabelMap[dbLabel] || dbLabel;
        if (!relatedInfo[frontendLabel]) relatedInfo[frontendLabel] = [];
        relatedInfo[frontendLabel].push(neighborNode);
      }
    }
  });

  for (const label in relatedInfo) {
    const categoryTitle = (state.colorMap[label]?.text) || label.replace(/_/g, ' ');
    panel.append("div").attr("class", "category-title").text(categoryTitle);
    const list = panel.append("ul");

    relatedInfo[label]
      .sort((a, b) => (a.properties?.name || "").localeCompare(b.properties?.name || ""))
      .forEach(item => {
        list.append("li")
          .text(item.properties?.name || item.id)
          .on("click", () => {
            const isNodeVisible = state.graphData.nodes.some(n => n.id === item.id);
            if (isNodeVisible) {
              centerOnNode(item.id);
            } else {
              state.expandedNodes.add(item.id);
              state.setNodeToCenter(item.id);
              rebuildAndRenderGraph();
            }
          });
      });
  }
}

function makeDraggable(panel, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    panel.style.top = (panel.offsetTop - pos2) + "px";
    panel.style.left = (panel.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

export function getColorForLabel(label) {
  if (!label) return "#999";
  if (state.colorMap[label]) return state.colorMap[label].color;
  const idx = state.labels.indexOf(label);
  return idx >= 0 ? Object.values(state.colorMap)[idx]?.color || "#999" : "#999";
}

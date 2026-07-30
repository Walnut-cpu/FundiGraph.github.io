import * as state from './state.js';
import { toggleNode } from './main.js';

const width = window.innerWidth - 250;
const height = window.innerHeight;
const svg = d3.select("svg").attr("width", width).attr("height", height);
const container = svg.append("g");

svg.call(d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => container.attr("transform", e.transform)));

const simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(d => d.id).distance(150))
  .force("charge", d3.forceManyBody().strength(-500))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(50))
  .alphaDecay(0.03);

export function rebuildAndRenderGraph() {
  const visibleNodeIds = state.getVisibleNodeIds();
  const newNodes = state.allNodes.filter(n => visibleNodeIds.has(n.id));
  const newLinks = state.allEdges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));

  state.nodesMap.clear();
  newNodes.forEach(n => state.nodesMap.set(n.id, n));

  state.graphData.nodes = newNodes;
  state.graphData.links = newLinks.map(l => ({ source: l.from, target: l.to, label: l.label }));

  updateGraph();
}

function updateGraph() {
  container.selectAll("*").remove();

  const link = container.append("g").attr("stroke", "#aaa").attr("stroke-width", 1.5)
    .selectAll("line").data(state.graphData.links).join("line");

  const edgeLabels = container.append("g").selectAll("text").data(state.graphData.links).join("text")
    .attr("class", "edge-label").attr("text-anchor", "middle").attr("dy", -3).text(d => d.label || "");

  const nodeGroup = container.append("g")
    .selectAll("g").data(state.graphData.nodes).join("g")
    .attr("class", "node-group")
    .attr("cursor", "pointer")
    .on("click", (e, d) => toggleNode(d.id))
    .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

  nodeGroup.append("circle").attr("r", 45)
    .attr("fill", d => {
      const dbLabel = d.labels?.[0];
      const frontendLabel = state.dbToFrontendLabelMap[dbLabel] || dbLabel;
      return (state.colorMap[frontendLabel] && state.colorMap[frontendLabel].color) || '#999';
    })
    .attr("stroke", d => state.expandedNodes.has(d.id) ? "#4CAF50" : "#fff")
    .attr("stroke-width", d => state.expandedNodes.has(d.id) ? 2.5 : 1.5);

  // 搜索高亮效果
  nodeGroup.selectAll("circle")
    .attr("stroke", d => (state.filteredNodeIds && state.filteredNodeIds.has(d.id)) ? "#FFD700" : (state.expandedNodes.has(d.id) ? "#4CAF50" : "#fff"))
    .attr("stroke-width", d => (state.filteredNodeIds && state.filteredNodeIds.has(d.id)) ? 4 : (state.expandedNodes.has(d.id) ? 2.5 : 1.5));

  nodeGroup.each(function(d) {
    const node = d3.select(this);
    const text = node.append("text").attr("class", "node-text").attr("text-anchor", "middle").attr("dy", "0.35em");
    const name = (d.properties && d.properties.name) ? d.properties.name : d.id;
    const maxCharsPerLine = 10;
    const words = name.toString().split(/(?=[A-Z][a-z])|\s+|_|-/);
    let currentLine = [], currentLineLength = 0, lineNumber = 0;
    words.forEach(word => {
      if (currentLineLength + word.length > maxCharsPerLine && currentLine.length > 0) {
        text.append("tspan").attr("x", 0).attr("dy", lineNumber === 0 ? "0" : "1.2em").text(currentLine.join(' '));
        currentLine = [word]; currentLineLength = word.length; lineNumber++;
      } else {
        currentLine.push(word); currentLineLength += word.length + (currentLine.length > 0 ? 1 : 0);
      }
    });
    if (currentLine.length > 0) {
      text.append("tspan").attr("x", 0).attr("dy", lineNumber === 0 ? "0" : "1.2em").text(currentLine.join(' '));
    }
    text.attr("transform", `translate(0,${-lineNumber*6})`);
  });

  simulation.nodes(state.graphData.nodes).on("tick", () => {
    link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    edgeLabels.attr("x", d => (d.source.x + d.target.x) / 2)
              .attr("y", d => (d.source.y + d.target.y) / 2);
    nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);

    if (state.nodeToCenterAfterSimulation && simulation.alpha() < 0.01) {
      centerOnNode(state.nodeToCenterAfterSimulation);
      state.setNodeToCenter(null);
    }
  });

  simulation.force("link").links(state.graphData.links);
  simulation.alpha(1).restart();

  nodeGroup.on("mouseover", (e, d) => {
    const areNeighbors = (a, b) => state.graphData.links.some(l =>
      ((l.source.id === a.id || l.source === a.id) && (l.target.id === b.id || l.target === b.id)) ||
      ((l.target.id === a.id || l.target === a.id) && (l.source.id === b.id || l.source === b.id))
    ) || a.id === b.id;
    nodeGroup.style("opacity", o => areNeighbors(d, o) ? 1 : 0.1);
    link.style("opacity", l => (l.source.id === d.id || l.source.id === d.id || l.target.id === d.id || l.target === d.id) ? 1 : 0.1);
    edgeLabels.style("opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);
  }).on("mouseout", () => {
    nodeGroup.style("opacity", 1); link.style("opacity", 1); edgeLabels.style("opacity", 1);
  });
}

export function centerOnNode(nodeId) {
  const targetNodeData = state.graphData.nodes.find(n => n.id === nodeId);
  if (!targetNodeData || typeof targetNodeData.x === 'undefined') return;

  const transform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(1.5)
    .translate(-targetNodeData.x, -targetNodeData.y);

  svg.transition().duration(1000).call(d3.zoom().transform, transform);

  const nodeElement = container.selectAll('.node-group').filter(d => d.id === nodeId);
  if (!nodeElement.empty()) {
    nodeElement.select('circle').transition().duration(300)
      .attr('r', 55).attr('stroke', '#FFD700').attr('stroke-width', 4)
      .transition().duration(600)
      .attr('r', 45).attr('stroke', d => state.expandedNodes.has(d.id) ? "#4CAF50" : "#fff")
      .attr('stroke-width', d => state.expandedNodes.has(d.id) ? 2.5 : 1.5);
  }
}

function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }

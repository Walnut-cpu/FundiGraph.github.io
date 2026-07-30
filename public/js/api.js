/**
 * api.js: 封装所有与后端 API 的通信
 */

export async function fetchLabels() {
  const res = await fetch("/api/graph/labels");
  return await res.json();
}

export async function fetchInitialGraph() {
  const res = await fetch("/api/graph/initial");
  return await res.json();
}

export async function fetchFullGraph() {
  const res = await fetch("/api/graph/full");
  return await res.json();
}

export async function fetchNodesByLabel(label) {
  const res = await fetch(`/api/graph/nodesByLabel/${encodeURIComponent(label)}`);
  return await res.json();
}
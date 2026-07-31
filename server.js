// --- START OF FILE server.js ---

require('dotenv').config(); // ✅ 先加载 .env 文件

const express = require("express");
const neo4j = require("neo4j-driver");
const path = require("path");

const app = express();
const port = 80; // ← 唯一改动：端口改成 80，其他不变

// 从环境变量中获取数据库配置
const dbUri = process.env.NEO4J_URI;
const dbUsername = process.env.NEO4J_USER;
const dbPassword = process.env.NEO4J_PASSWORD;
const dbName = process.env.NEO4J_DATABASE;

// 如果环境变量缺失，给出提示
if (!dbUri || !dbUsername || !dbPassword) {
  console.error("❌ Neo4j 数据库连接信息未配置完整，请检查 .env 文件");
  console.error("当前读取到的值：", { dbUri, dbUsername, dbPassword });
  process.exit(1); // 直接退出
}

// 创建 Neo4j 驱动
const driver = neo4j.driver(dbUri, neo4j.auth.basic(dbUsername, dbPassword));

// ✅ 在服务启动时自动检查并创建全文索引
async function initFulltextIndex() {
  const session = driver.session({ database: dbName });
  try {
    // 如果不限定特定 Label，用 FOR (n)；若限制 Label 可以写 FOR (n:Entity)
    await session.run(`
      CREATE FULLTEXT INDEX nodeNameFulltextIndex IF NOT EXISTS
      FOR (n) 
      ON EACH [n.name, n.properties.name, n.properties.aliases]
    `);
    console.log("✅ 全文索引 nodeNameFulltextIndex 初始化成功或已存在");
  } catch (err) {
    console.warn("⚠️ 初始化全文索引时提示（忽略或检查权限）:", err.message);
  } finally {
    await session.close();
  }
}
initFulltextIndex();

// 提供静态文件服务
// 假设你的 HTML 页面存放在 'public' 文件夹中
app.use(express.static(path.join(__dirname, "public")));

// 根路由重定向到你的 HTML 页面
app.get("/", (req, res) => {
  console.log("Serving index.html");
  res.sendFile(path.join(__dirname, "public", "MainShow.html"));  
});

// ✅ --- 修改开始 ---
//处理查询结果，提取节点和边信息
function processResult(result) {
  console.log(`Processing result: ${result.records.length} records`);
  const nodesMap = new Map();
  const edges = [];

  /**
   * 辅助函数：处理节点属性
   * 检查属性值是否为 Neo4j 的大整数对象 (Int), 如果是, 将其转换为字符串
   * @param {object} properties - 从数据库获取的原始属性对象
   * @returns {object} - 处理过的、前端友好的属性对象
   */
  const sanitizeProperties = (properties) => {
    const newProps = {};
    for (const key in properties) {
      const value = properties[key];
      // neo4j.isInt() 是驱动程序提供的方法，用于判断一个值是否为64位整数对象
      if (neo4j.isInt(value)) {
        // .toString() 是最安全的转换方式，能保留完整的数字信息
        newProps[key] = value.toString();
      } else {
        newProps[key] = value;
      }
    }
    return newProps;
  };

  result.records.forEach(record => {
    const n = record.get("n");
    const m = record.get("m");
    const r = record.get("r");

    // 首先处理节点 n，它永远存在
    const n_id = n.identity.toString();
    if (!nodesMap.has(n_id)) {
      nodesMap.set(n_id, {
        id: n_id,
        labels: n.labels,
        // 使用辅助函数处理属性
        properties: sanitizeProperties(n.properties)
      });
    }

    // 只有当关系和邻居节点 m 存在时，才处理它们
    if (m && r) {
      const m_id = m.identity.toString();
      if (!nodesMap.has(m_id)) {
        nodesMap.set(m_id, {
          id: m_id,
          labels: m.labels,
          // 同样需要处理邻居节点的属性
          properties: sanitizeProperties(m.properties)
        });
      }
      edges.push({
        from: n.identity.toString(),
        to: m.identity.toString(),
        label: r.type,
        id: r.identity.toString()
      });
    }
  });

  const finalNodes = Array.from(nodesMap.values());
  console.log(`Processed nodes: ${finalNodes.length}, edges: ${edges.length}`);

  return {
    nodes: finalNodes.sort((a, b) => parseInt(a.id) - parseInt(b.id)),
    edges
  };
}
// ✅ --- 修改结束 ---


// 获取所有节点标签
app.get("/api/graph/labels", async (req, res) => {
  console.log("GET /api/graph/labels called");
  const session = driver.session({ database: dbName });
  try {
    const result = await session.run(`CALL db.labels()`);
    const labels = result.records.map(r => r.get(0));
    console.log(`Labels fetched: ${labels.length}`);
    res.json(labels);
  } catch (err) {
    console.error("Error fetching labels:", err);
    res.status(500).send("获取标签失败");
  } finally {
    await session.close();
  }
});

// 初始加载全部节点关系
app.get("/api/graph/initial", async (req, res) => {
  console.log("GET /api/graph/initial called");
  const session = driver.session({ database: dbName });
  try {
    const result = await session.run(
      `MATCH (n)-[r]->(m) RETURN n, r, m ORDER BY id(n), id(m)`
    );
    const { nodes, edges } = processResult(result);
    console.log(`Initial graph loaded: ${nodes.length} nodes, ${edges.length} edges`);
    res.json({ nodes, edges });
  } catch (err) {
    console.error("Error in /api/graph/initial:", err);
    res.status(500).send("查询失败");
  } finally {
    await session.close();
  }
});

// 获取完整的图谱数据（包括孤立节点）
app.get("/api/graph/full", async (req, res) => {
  console.log("GET /api/graph/full called");
  const session = driver.session({ database: dbName });
  try {
    // 使用 OPTIONAL MATCH 来确保所有节点都被包含，即使它们是孤立的
    const result = await session.run(
      `MATCH (n) OPTIONAL MATCH (n)-[r]-(m) RETURN n, r, m`
    );
    
    // 复用我们已经修复好的 processResult 函数，它会处理去重和排序
    const { nodes, edges } = processResult(result);
    
    console.log(`Full graph loaded: ${nodes.length} nodes, ${edges.length} edges`);
    res.json({ nodes, edges });
  } catch (err) {
    console.error("Error in /api/graph/full:", err);
    res.status(500).send("查询失败");
  } finally {
    await session.close();
  }
});

// 按标签获取节点列表
app.get("/api/graph/nodesByLabel/:label", async (req, res) => {
  const label = req.params.label;
  console.log(`GET /api/graph/nodesByLabel/${label} called`);
  const session = driver.session({ database: dbName });
  try {
    const result = await session.run(
      `MATCH (n:\`${label}\`) RETURN n`
    );
    const nodes = result.records.map(r => {
      const n = r.get("n");
      return {
        id: n.identity.toString(),
        labels: n.labels,
        properties: n.properties
      };
    });
    console.log(`Nodes fetched for label '${label}': ${nodes.length}`);
    res.json(nodes);
  } catch (err) {
    console.error(`Error fetching nodes by label '${label}':`, err);
    res.status(500).send("查询失败");
  } finally {
    await session.close();
  }
});

// 搜索节点和相关关系（增强版模糊/容错检索）
app.get("/api/graph/search", async (req, res) => {
  const query = req.query.query;
  console.log(`GET /api/graph/search called with query: '${query}'`);
  if (!query) {
    return res.status(400).send("缺少查询参数");
  }

  // 1. 彻底替换各类破折号（全角/半角/En-dash/Em-dash/Hyphen）及特殊字符为空格
  const cleanedQuery = query.trim()
    .replace(/[\u2010-\u2015\u2212\-_~–—]/g, " ") // 覆盖所有类型的连字符与破折号
    .replace(/[+&|!(){}\[\]^"~*?:\\\/]/g, " ")   // 清理 Lucene 敏感字符
    .replace(/\s+/g, " ");                      // 合并连续空格

  const terms = cleanedQuery.split(" ").filter(Boolean);

  if (terms.length === 0) {
    return res.json({ nodes: [], edges: [] });
  }

  // 2. 构造双层 Lucene 表达式：
  // 兼顾“精准匹配（精确短语/AND）”与“软匹配（OR / 通配符）”
  // 比如输入 "white dot syndrome"，构造出：
  // "(white* AND dot* AND syndrome*) OR (\"white dot syndrome\"~2)"
  const exactPhrase = `"${terms.join(" ")}"~2`; // 允许单词间有 2 个字符的间隔/差异
  const andTerms = terms.map(term => `${term}*`).join(" AND ");
  const orTerms = terms.map(term => `${term}*`).join(" OR ");

  // 组合逻辑：优先满足 AND，满足不了时退回 OR
  const luceneQuery = `(${andTerms}) OR ${exactPhrase} OR (${orTerms})`;

  const session = driver.session({ database: dbName });
  try {
    const result = await session.run(
      `
      CALL db.index.fulltext.queryNodes("nodeNameFulltextIndex", $luceneQuery) YIELD node AS n, score
      OPTIONAL MATCH (n)-[r]-(m)
      RETURN n, r, m, score
      ORDER BY score DESC
      LIMIT 50
      `,
      { luceneQuery }
    );

    const { nodes, edges } = processResult(result);
    console.log(`Search results for '${luceneQuery}': ${nodes.length} nodes, ${edges.length} edges`);
    res.json({ nodes, edges });
  } catch (err) {
    console.error("Error in /api/graph/search:", err);
    res.status(500).send("查询失败");
  } finally {
    await session.close();
  }
});

// (处理所有其他未匹配的请求，比如 /some/deep/link)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'MainShow.html'));
});

// 启动服务
app.listen(port, () => {
  console.log(`✅ 服务器已启动：http://localhost (端口 ${port}`);
  console.log(`✅ 后端将连接到 Neo4j 数据库: '${dbName}'`);
});

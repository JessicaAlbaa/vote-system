const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const os = require('os');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let votes = [];
let currentVoteId = 1;

app.use(express.static('public'));

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const validInterfaces = ['WLAN', '以太网', 'en0', 'eth0'];
  for (const devName of validInterfaces) {
    const iface = interfaces[devName];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return '0.0.0.0';
}

function getVoteUrl() {
  const ipAddress = getLocalIpAddress();
  return `http://${ipAddress}:3000/vote.html?vid=${currentVoteId}`;
}

app.get('/qrcode', async (req, res) => {
  try {
    const url = getVoteUrl();
    const qr = await QRCode.toDataURL(url);
    res.json({ qr, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/reset', (req, res) => {
  votes = [];
  currentVoteId++;
  QRCode.toDataURL(getVoteUrl(), (err, qr) => {
    res.json({ qr, url: getVoteUrl() });
    io.emit('reset');
  });
});

function processStats() {
  const stats = {
    total: votes.length,
    average: 0,
    extremes: { max: 0, min: 100 },
    distribution: [0, 0, 0, 0, 0],
    dimensions: []
  };

  if (votes.length === 0) return stats;

  const candidateTotals = { A: 0, B: 0, C: 0, D: 0 };

  votes.forEach(vote => {
    candidateTotals.A += vote.candidates.A;
    candidateTotals.B += vote.candidates.B;
    candidateTotals.C += vote.candidates.C;
    candidateTotals.D += vote.candidates.D;
  });

  const averages = {
    A: candidateTotals.A / votes.length,
    B: candidateTotals.B / votes.length,
    C: candidateTotals.C / votes.length,
    D: candidateTotals.D / votes.length
  };

  const allScores = Object.values(averages);
  stats.average = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  stats.extremes.max = Math.max(...allScores);
  stats.extremes.min = Math.min(...allScores);

  allScores.forEach(score => {
    if (score < 60) stats.distribution[0]++;
    else if (score < 70) stats.distribution[1]++;
    else if (score < 80) stats.distribution[2]++;
    else if (score < 90) stats.distribution[3]++;
    else stats.distribution[4]++;
  });

  const dimensionCandidateScores = {
    analysis: { A: [], B: [], C: [], D: [] },
    plan: { A: [], B: [], C: [], D: [] },
    solve: { A: [], B: [], C: [], D: [] },
    Reaction: { A: [], B: [], C: [], D: [] },
    speak: { A: [], B: [], C: [], D: [] },
    behave: { A: [], B: [], C: [], D: [] }
  };

  votes.forEach(vote => {
    Object.entries(vote.dimensions).forEach(([dimension, candidateScores]) => {
      Object.entries(candidateScores).forEach(([candidate, score]) => {
        dimensionCandidateScores[dimension][candidate].push(score);
      });
    });
  });

  stats.dimensions = Object.entries(dimensionCandidateScores).map(([dimension, candidateMap]) => {
    const candidateAverages = {};
    for (const [candidate, scores] of Object.entries(candidateMap)) {
      candidateAverages[candidate] = scores.length
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
    }

    const maxEntry = Object.entries(candidateAverages).reduce((a, b) => (b[1] > a[1] ? b : a));
    const minEntry = Object.entries(candidateAverages).reduce((a, b) => (b[1] < a[1] ? b : a));

    return {
      name: dimension,
      maxCandidate: maxEntry[0],
      maxScore: maxEntry[1].toFixed(1),
      minCandidate: minEntry[0],
      minScore: minEntry[1].toFixed(1)
    };
  });

  return stats; // ✅ 修复点
}

io.on('connection', (socket) => {
  console.log(`新连接: ${socket.id}`);

  socket.on('vote', (data, callback) => {
    try {
      // 验证数据
      if (
        !data.candidates ||
        typeof data.candidates.A !== 'number' ||
        typeof data.candidates.B !== 'number' ||
        typeof data.candidates.C !== 'number' ||
        typeof data.candidates.D !== 'number'
      ) {
        throw new Error('无效的投票数据');
      }

      // 存储投票
      votes.push({
        candidates: data.candidates,
        dimensions: data.dimensions
      });

      console.log(`收到投票，当前总数: ${votes.length}`);

      const stats = processStats();
      io.emit('update', stats);

      if (callback) callback('OK'); // ✅ 安全调用
    } catch (err) {
      console.error('投票错误:', err.message);
      if (callback) callback('ERROR'); // ✅ 防止 callback 未定义报错
    }
  });

  socket.on('requestUpdate', () => {
    socket.emit('update', processStats());
  });
});

server.listen(3000, '0.0.0.0', () => {
  const ip = getLocalIpAddress();
  console.log(`
================================
服务已启动：
电脑端: http://localhost:3000
手机端: http://${ip}:3000
================================
  `);
  QRCode.toString(getVoteUrl(), { type: 'terminal' }, (err, url) => {
    if (!err) console.log('\n终端二维码:\n' + url);
  });
});

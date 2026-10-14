const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  let relative; try {relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/taipopo(?=\/|$)/,'')}catch{res.writeHead(400);return res.end()}
  let file=path.resolve(root,'.'+relative); if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
  try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res)}catch{res.writeHead(404);res.end('Not found')}
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173/taipopo/'));

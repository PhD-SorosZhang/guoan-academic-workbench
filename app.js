// ===== 国安学术工作台 v3.0 =====
// 原生JS + API/localStorage双模式

// ===== 常量 =====
const THEMES=['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];
const THEME_NAMES={A:'故宫朱红',B:'燕园深蓝',C:'未名暖棕',D:'水木古铜',E:'珞珈青绿',F:'求是赤金',G:'南开竹青',H:'金陵橄榄',I:'海大沙金',J:'暗夜紫金',K:'暗夜琥珀',L:'暗夜银灰',M:'暗夜绛红',N:'暗夜藏青',O:'莫兰迪橘',P:'商务灰蓝',Q:'帝国紫金'};
const THEME_COLORS={A:['#AA3724','#1B5853','#FFFBD3'],B:['#33375C','#C96E3F','#CCBBA9'],C:['#BE926F','#919177','#D9CEB3'],D:['#8C7259','#9E452F','#CCBEB5'],E:['#7B8473','#4C483D','#DDD5C0'],F:['#932A24','#CC7E40','#DFC08A'],G:['#2D8672','#A02F2B','#E7D4AC'],H:['#5E6B4D','#CF9959','#F3F1E8'],I:['#D5A574','#194866','#F1EEE8'],J:['#3B2C5A','#D6B25E','#0B0F1A'],K:['#9C6B30','#E7DED1','#1A1A1A'],L:['#7C7F87','#D1D5DB','#0B0C10'],M:['#6E1F28','#D7B98E','#1C1B20'],N:['#123B5D','#C9D3DA','#20252B'],O:['#B36A4C','#706B67','#F4EFE7'],P:['#5D7285','#111827','#D9E0E6'],Q:['#660874','#D4AF37','#FFFFFF']};

const NAV_ITEMS=[
{id:'dashboard',icon:'📊',label:'论文工作台'},
{id:'topic',icon:'🔍',label:'选题筛选'},
{id:'article',icon:'📖',label:'好文剖析'},
{id:'phd',icon:'🎓',label:'考博信息'},
{id:'job',icon:'💼',label:'就业导航'},
{id:'ref',icon:'📝',label:'文献管理'},
{id:'material',icon:'✍️',label:'写作素材'},
{id:'schedule',icon:'📅',label:'学术日程'},
{id:'note',icon:'🧠',label:'研究笔记'},
{id:'aitools',icon:'🤖',label:'AI技能库'},
{id:'aichat',icon:'💬',label:'论文AI对话'},
{id:'settings',icon:'⚙️',label:'设置'}
];

const DIMENSIONS=['选题创新性','理论深度','现实意义','方法可行性','数据可获得性','文献支撑度','学科契合度','政策相关性','研究缺口','写作可操作性','时间可控性','发表潜力'];

const TABLES=['projects','literature','topics','articles','materials','notes','schedule_events','paper_tasks','user_settings','chat_messages'];

// ===== 国学名言库 =====
const QUOTES=[
{text:'安而不忘危，存而不忘亡，治而不忘乱。',source:'《周易》'},
{text:'兵者，国之大事，死生之地，存亡之道，不可不察也。',source:'《孙子兵法》'},
{text:'居安思危，思则有备，有备无患。',source:'《左传》'},
{text:'国家安全是民族复兴的根基，社会稳定是国家强盛的前提。',source:'党的二十大报告'},
{text:'于安思危，于治忧乱。',source:'《道德经》'},
{text:'明者防祸于未萌，智者图患于将来。',source:'《三国志》'},
{text:'路漫漫其修远兮，吾将上下而求索。',source:'屈原《离骚》'},
{text:'千淘万漉虽辛苦，吹尽狂沙始到金。',source:'刘禹锡《浪淘沙》'},
{text:'博观而约取，厚积而薄发。',source:'苏轼《稼说送张琥》'},
{text:'天行健，君子以自强不息。',source:'《周易》'},
{text:'为天地立心，为生民立命，为往圣继绝学，为万世开太平。',source:'张载《横渠四句》'},
{text:'苟利国家生死以，岂因祸福避趋之。',source:'林则徐《赴戍登程口占示家人》'}
];

// ===== 自动剖析：关键词库 =====
const THEORY_KEYWORDS=['总体国家安全观','安全化理论','建构主义','现实主义','自由主义','治理理论','协同治理','风险社会','韧性治理','制度主义','博弈论','复杂系统','路径依赖','政策网络','多中心治理','整体性治理','新公共管理','网络治理','危机管理','安全共同体'];
const POLICY_PATTERNS=[/《[^》]{2,30}法》/g,/《[^》]{2,30}条例》/g,/《[^》]{2,30}意见》/g,/《[^》]{2,30}规划》/g,/《[^》]{2,30}纲要》/g,/《[^》]{2,30}决定》/g,/《[^》]{2,30}方案》/g,/二十大报告/g,/十九届/g,/二十届/g,/中央经济工作会议/g];
const DATA_PATTERNS=[/国家统计局/g,/年鉴/g,/数据库/g,/问卷调查/g,/深度访谈/g,/案例分析/g,/面板数据/g,/截面数据/g,/CGSS/g,/CFPS/g,/World Bank/g,/IMF/g,/WDI/g];

// ===== 状态 =====
let currentPage='dashboard';
let currentProjectId=null;
let data={projects:[],topics:[],refs:[],articles:[],materials:[],notes:[],schedule:[],paperTasks:[],topicCards:[],settings:{theme:'A',autoRotate:false,rotateDays:7,email:'',accessKey:'guoan2026'},chatMessages:[],privacyAccepted:false};
let expandedSchools={};
let topicTab='topics';
let litSearch='';
let expandedTopic=null;
let radarChart=null;
let clockTimer=null;
let currentQuoteIdx=Math.floor(Math.random()*QUOTES.length);
let dashboardTab='overview';
let expandedTopicCard=null;

// ===== 工具函数 =====
function uid(){return Date.now().toString(36)+Math.random().toString(36).substr(2,9);}
function esc(s){if(s==null)return'';const d=document.createElement('div');d.textContent=String(s);return d.innerHTML;}
function fmtDate(d){if(!d)d=new Date();if(typeof d==='string')d=new Date(d);const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day;}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
function emptyState(icon,text){return '<div class="empty-state"><div class="empty-icon">'+icon+'</div><p>'+text+'</p></div>';}
function calcScore(t){if(!t||!t.dims)return 0;return Object.values(t.dims).reduce((s,v)=>s+Number(v||0),0);}
function scoreGrade(s){if(s>=90)return'<span class="score-grade pass">A 优秀</span>';if(s>=70)return'<span class="score-grade warn">B 良好</span>';if(s>=50)return'<span class="score-grade warn">C 一般</span>';return'<span class="score-grade fail">D 待改进</span>';}

// ===== 数据层（API + localStorage 双模式）=====
const STORAGE_KEY='guoan_workbench_data_v3';
const API_BASE='/api';
let token=localStorage.getItem('guoan_token')||'';
let apiMode=false;

const CRUD_TABLE_MAP={
  'projects':'projects','literature':'literature','topics':'topics',
  'articles':'articles','materials':'materials','notes':'notes',
  'schedule':'schedule_events','tasks':'paper_tasks',
  'settings':'user_settings','chat_messages':'chat_messages'
};
function resolveEndpoint(endpoint){
  const [path,query]=endpoint.split('?');
  if(CRUD_TABLE_MAP[path])return query?`data?table=${CRUD_TABLE_MAP[path]}&${query}`:`data?table=${CRUD_TABLE_MAP[path]}`;
  return endpoint;
}
async function api(endpoint,options={}){
  try{
    const headers={'Content-Type':'application/json'};
    if(token)headers['Authorization']=`Bearer ${token}`;
    const res=await fetch(`${API_BASE}/${resolveEndpoint(endpoint)}`,{...options,headers});
    if(res.status===401){logout();throw new Error('未授权');}
    if(!res.ok)throw new Error('API '+res.status);
    return await res.json();
  }catch(e){return null;}
}
function apiGet(endpoint){return api(endpoint);}
function apiPost(endpoint,body){return api(endpoint,{method:'POST',body:JSON.stringify(body)});}
function apiPut(endpoint,body){return api(endpoint,{method:'PUT',body:JSON.stringify(body)});}
function apiDel(endpoint){return api(endpoint,{method:'DELETE'});}

function saveData(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch(e){console.warn('save failed',e);}
}
function loadData(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw){const parsed=JSON.parse(raw);data={...data,...parsed,settings:{...data.settings,...(parsed.settings||{})}};}
    // 兼容老数据：新增字段兜底
    if(!Array.isArray(data.topicCards))data.topicCards=[];
    if(!Array.isArray(data.materials))data.materials=[];
    if(!Array.isArray(data.paperTasks))data.paperTasks=[];
  }catch(e){console.warn('load failed',e);}
}

async function syncFromAPI(){
  if(!apiMode)return;
  for(const table of TABLES){
    const res=await apiGet(table+'?project_id='+currentProjectId);
    if(res&&Array.isArray(res.data)){
      const map={projects:'projects',literature:'refs',topics:'topics',articles:'articles',materials:'materials',notes:'notes',schedule_events:'schedule',paper_tasks:'paperTasks',user_settings:'settings',chat_messages:'chatMessages'};
      const key=map[table];
      if(key&&key!=='settings')data[key]=res.data;
    }
  }
}

// ===== 登录 =====
function checkLogin(){
  if(token){document.getElementById('loginOverlay').style.display='none';return true;}
  const sessionKey=sessionStorage.getItem('guoan_logged_in');
  if(sessionKey==='1'){document.getElementById('loginOverlay').style.display='none';return true;}
  document.getElementById('loginOverlay').style.display='flex';
  return false;
}
async function doLogin(){
  const input=document.getElementById('accessKeyInput');
  const key=input.value.trim();
  if(!key){toast('请输入访问密钥');return;}
  try{
    const res=await apiPost('login',{key});
    if(res&&res.token){
      token=res.token;localStorage.setItem('guoan_token',token);apiMode=true;
      document.getElementById('loginOverlay').style.display='none';
      await init();return;
    }
  }catch(e){}
  const correct=data.settings.accessKey||'guoan2026';
  if(key===correct){
    sessionStorage.setItem('guoan_logged_in','1');apiMode=false;
    document.getElementById('loginOverlay').style.display='none';init();
  }else{toast('密钥错误，请重试');}
}
function logout(){
  token='';localStorage.removeItem('guoan_token');
  sessionStorage.removeItem('guoan_logged_in');apiMode=false;
  document.getElementById('loginOverlay').style.display='flex';
}

// ===== 主题 =====
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  data.settings.theme=t;
  saveData();
  document.querySelectorAll('.theme-btn').forEach(b=>b.classList.toggle('active',b.dataset.theme===t));
}
function checkAutoRotate(){
  if(!data.settings.autoRotate)return;
  const last=localStorage.getItem('guoan_theme_rotate');
  const now=Date.now();
  const days=data.settings.rotateDays||7;
  if(!last||now-parseInt(last)>days*86400000){
    const idx=THEMES.indexOf(data.settings.theme);
    const next=THEMES[(idx+1)%THEMES.length];
    applyTheme(next);
    localStorage.setItem('guoan_theme_rotate',String(now));
  }
}

// ===== 导航 =====
function renderNav(){
  document.getElementById('navMenu').innerHTML=NAV_ITEMS.map(n=>
    '<div class="nav-item '+(currentPage===n.id?'active':'')+'" onclick="navigate(\''+n.id+'\')"><span class="nav-icon">'+n.icon+'</span>'+n.label+'</div>'
  ).join('');
}
function navigate(page){
  currentPage=page;
  renderNav();
  render();
  if(window.innerWidth<=768)document.getElementById('sidebar').classList.remove('open');
}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');}

// ===== 主渲染分发 =====
function render(){
  switch(currentPage){
    case 'dashboard':renderDashboard();break;
    case 'topic':renderTopic();break;
    case 'article':renderArticle();break;
    case 'phd':renderPhd();break;
    case 'job':renderJob();break;
    case 'ref':renderRef();break;
    case 'material':renderMaterial();break;
    case 'schedule':renderSchedule();break;
    case 'note':renderNote();break;
    case 'aitools':renderAITools();break;
    case 'aichat':renderAIChat();break;
    case 'settings':renderSettings();break;
  }
}

// ===== 论文工作台 Dashboard =====
function getGreeting(){const h=new Date().getHours();if(h<6)return'夜深了';if(h<11)return'早上好';if(h<13)return'中午好';if(h<18)return'下午好';return'晚上好';}
const WEEK_CN=['周日','周一','周二','周三','周四','周五','周六'];
function pad2(n){return String(n).padStart(2,'0');}
function tickClock(){
  const el=document.getElementById('liveClock');
  if(!el){if(clockTimer){clearInterval(clockTimer);clockTimer=null;}return;}
  const d=new Date();
  el.textContent=d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+' '+WEEK_CN[d.getDay()]+' '+pad2(d.getHours())+':'+pad2(d.getMinutes())+':'+pad2(d.getSeconds());
}
function startClock(){
  if(clockTimer)clearInterval(clockTimer);
  tickClock();
  clockTimer=setInterval(tickClock,1000);
}
async function fetchWeather(){
  const el=document.getElementById('weatherInfo');
  if(!el)return;
  let lat=38.91, lon=121.61, city='大连';
  try{
    const ipRes=await fetch('https://ipapi.co/json/');
    if(ipRes.ok){
      const ipData=await ipRes.json();
      lat=ipData.latitude||lat; lon=ipData.longitude||lon; city=ipData.city||city;
    }
  }catch(e){/* ipapi不可用则用大连坐标 */}
  try{
    el.textContent='🌡️ '+city+' ...';
    const wRes=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m');
    if(!wRes.ok)throw new Error('weather failed');
    const wData=await wRes.json();
    const temp=wData.current&&wData.current.temperature_2m;
    el.textContent='🌡️ '+city+' '+(temp!=null?temp.toFixed(0)+'°C':'--°C');
  }catch(e){
    el.textContent='🌡️ 大连 --°C';
  }
}
function refreshQuote(){
  let idx=currentQuoteIdx;
  while(idx===currentQuoteIdx)idx=Math.floor(Math.random()*QUOTES.length);
  currentQuoteIdx=idx;
  renderQuote();
}
function renderQuote(){
  const el=document.getElementById('quoteBox');
  if(!el)return;
  const q=QUOTES[currentQuoteIdx];
  el.innerHTML='<div class="quote-text-cn">“'+esc(q.text)+'”</div><div class="quote-source-cn">—— '+esc(q.source)+'</div>';
}

function renderDashboard(){
  const proj=data.projects.length?data.projects:[];
  const curProj=proj.find(p=>p.id===currentProjectId)||proj[0]||null;
  if(curProj)currentProjectId=curProj.id;
  const projTopics=data.topics.filter(t=>t.projectId===currentProjectId||!t.projectId);
  const projRefs=data.refs.filter(r=>r.projectId===currentProjectId||!r.projectId);
  const projArticles=data.articles.filter(a=>a.projectId===currentProjectId||!a.projectId);
  const projNotes=data.notes.filter(n=>n.projectId===currentProjectId||!n.projectId);
  const projTasks=data.paperTasks.filter(t=>t.projectId===currentProjectId||!t.projectId);

  // 问候横幅
  const banner='<div class="greeting-banner">'
    +'<div class="greeting-left">'
    +'<div class="greeting-hi">'+getGreeting()+'，<span class="greeting-name">张一达</span></div>'
    +'<div class="greeting-datetime"><span id="liveClock" class="clock-digital">--</span> <span id="weatherInfo" class="weather-chip">🌡️ 获取中...</span></div>'
    +'</div>'
    +'<div class="greeting-right"><div class="quote-box" id="quoteBox"></div><button class="quote-refresh" onclick="refreshQuote()" title="换一句">🔄 换一句</button></div>'
    +'</div>';

  // 子标签页
  const subTabs='<div class="sub-tabs">'
    +'<button class="sub-tab '+(dashboardTab==='overview'?'active':'')+'" onclick="dashboardTab=\'overview\';renderDashboard()">📊 概览</button>'
    +'<button class="sub-tab '+(dashboardTab==='todos'?'active':'')+'" onclick="dashboardTab=\'todos\';renderDashboard()">📋 待办清单 <span class="tab-badge">'+projTasks.filter(t=>!t.done).length+'</span></button>'
    +'</div>';

  const statsHtml='<div class="stats-grid">'
    +'<div class="stat-card"><div class="stat-num">'+projTopics.length+'</div><div class="stat-label">选题数</div></div>'
    +'<div class="stat-card"><div class="stat-num">'+projRefs.length+'</div><div class="stat-label">文献数</div></div>'
    +'<div class="stat-card"><div class="stat-num">'+projArticles.length+'</div><div class="stat-label">好文剖析</div></div>'
    +'<div class="stat-card"><div class="stat-num">'+projNotes.length+'</div><div class="stat-label">研究笔记</div></div>'
    +'<div class="stat-card"><div class="stat-num">'+projTasks.length+'</div><div class="stat-label">论文任务</div></div>'
    +'<div class="stat-card"><div class="stat-num">'+data.materials.length+'</div><div class="stat-label">写作素材</div></div>'
    +'</div>';

  const projSelect='<div class="project-bar"><label style="font-size:.85rem;font-weight:600;">当前项目：</label>'
    +'<select class="project-select" onchange="currentProjectId=this.value;saveData();renderDashboard()">'
    +proj.map(p=>'<option value="'+p.id+'" '+(p.id===currentProjectId?'selected':'')+'>'+esc(p.name)+'</option>').join('')
    +'</select><button class="add-btn ghost" style="padding:6px 14px;font-size:.8rem;" onclick="showAddProject()">+ 新建项目</button>'
    +(curProj?'<button class="del-btn" onclick="delProject(\''+curProj.id+'\')">删除项目</button>':'')
    +'</div>';

  const recentTopics=projTopics.slice(0,5).map(t=>'<div class="list-item"><div class="item-text"><strong>'+esc(t.title)+'</strong><div class="item-meta">'+(t.date||'')+' · AI评分 '+calcScore(t)+'/120 '+scoreGrade(calcScore(t))+'</div></div><button class="add-btn ghost" style="padding:4px 10px;font-size:.75rem;" onclick="navigate(\'topic\')">查看</button></div>').join('')||emptyState('📋','暂无选题');
  const recentRefs=projRefs.slice(0,5).map(r=>'<div class="list-item"><div class="item-text"><strong>'+esc(r.title)+'</strong><div class="item-meta">'+esc(r.author||'未知')+' · '+esc(r.source||'')+' '+(r.year||'')+'</div></div></div>').join('')||emptyState('📚','暂无文献');

  // 待办清单视图
  const undoneCount=projTasks.filter(t=>!t.done).length;
  const doneCount=projTasks.length-undoneCount;
  const todoList=projTasks.length?projTasks.map(t=>'<div class="todo-item '+(t.done?'done':'')+'"><label class="todo-check"><input type="checkbox" '+(t.done?'checked':'')+' onchange="toggleTask(\''+t.id+'\')"><span class="todo-box"></span></label><div class="item-text todo-text"><strong>'+esc(t.title)+'</strong><div class="item-meta">截止：'+(t.deadline||'未设')+' · '+(t.done?'已完成':'进行中')+'</div></div><button class="del-btn" onclick="delTask(\''+t.id+'\')">删除</button></div>').join(''):emptyState('✅','暂无待办事项');
  const todosHtml=subTabs
    +'<div class="card"><div class="card-title"><span class="title-icon">📋</span>待办清单 <span class="todo-stat">待办 '+undoneCount+' · 已完成 '+doneCount+'</span></div>'+todoList
    +'<div style="margin-top:16px;"><div class="form-row"><div><label>任务标题</label><input id="taskTitle" placeholder="如：完成文献综述"></div><div><label>截止日期</label><input id="taskDeadline" type="date"></div></div>'
    +'<button class="add-btn" onclick="addTask()">+ 添加任务</button></div></div>';

  const overviewHtml=subTabs
    +projSelect+statsHtml
    +'<div class="card"><div class="card-title"><span class="title-icon">🔍</span>最近选题</div>'+recentTopics+'</div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">📝</span>最近文献</div>'+recentRefs+'</div>';

  document.getElementById('mainContent').innerHTML=
    '<div class="page-header"><h1>📊 论文工作台</h1><p>多项目管理 · 数据总览 · 任务追踪</p></div>'
    +banner
    +(dashboardTab==='todos'?todosHtml:overviewHtml);

  startClock();
  renderQuote();
  fetchWeather();
}

function delTask(id){data.paperTasks=data.paperTasks.filter(t=>t.id!==id);saveData();renderDashboard();}

function showAddProject(){
  const name=prompt('请输入项目名称：');
  if(!name)return;
  const p={id:uid(),name:name,createdAt:fmtDate(new Date())};
  data.projects.push(p);
  currentProjectId=p.id;
  saveData();
  toast('项目已创建');
  renderDashboard();
}
function delProject(id){
  if(!confirm('确定删除该项目？项目下数据不会被删除。'))return;
  data.projects=data.projects.filter(p=>p.id!==id);
  currentProjectId=data.projects[0]?data.projects[0].id:null;
  saveData();
  renderDashboard();
}
function addTask(){
  const title=document.getElementById('taskTitle').value.trim();
  const deadline=document.getElementById('taskDeadline').value;
  if(!title){toast('请输入任务标题');return;}
  data.paperTasks.unshift({id:uid(),title:title,deadline:deadline,status:'进行中',done:false,projectId:currentProjectId,createdAt:fmtDate(new Date())});
  saveData();
  renderDashboard();
}
function toggleTask(id){
  const t=data.paperTasks.find(x=>x.id===id);
  if(t){t.done=!t.done;t.status=t.done?'已完成':'进行中';saveData();renderDashboard();}
}

// ===== 选题筛选（含论点匹配引文）=====
let packageResult=null;
function splitKeywords(title){
  // 中文2-gram + 英文单词，过滤停用词
  const stop=new Set(['的','了','和','与','及','在','对','为','以','及','或','等','中','上','下','视域','研究','分析','基于','我国','中国','that','the','of','and','in','to','a','for','on','with']);
  const kws=[];
  const cn=String(title||'').replace(/[^\u4e00-\u9fa5A-Za-z]/g,' ');
  // 英文词
  cn.split(/\s+/).forEach(w=>{if(/^[A-Za-z]{3,}$/.test(w)&&!stop.has(w.toLowerCase()))kws.push(w.toLowerCase());});
  // 中文2-gram
  const cnOnly=String(title||'').replace(/[^\u4e00-\u9fa5]/g,'');
  for(let i=0;i<cnOnly.length-1;i++){
    const g=cnOnly.substr(i,2);
    if(!stop.has(g))kws.push(g);
  }
  return [...new Set(kws)];
}
function generateMaterialPackage(){
  const input=document.getElementById('pkgKeyword').value.trim();
  if(!input){toast('请输入选题关键词');return;}
  const kws=splitKeywords(input);
  if(!kws.length){toast('关键词过少');return;}
  const scored=data.materials.map(m=>{
    const content=m.content||'';
    let hit=0;
    kws.forEach(k=>{if(content.includes(k))hit++;});
    const sim=jaccard(input,content);
    return{m:m,score:hit*2+sim*3};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,20).map(x=>x.m);
  // 按论证顺序分四类
  const intro=[],theory=[],empirical=[],policy=[];
  scored.forEach(m=>{
    const cat=m.category||'';
    if(cat==='金句观点'||cat==='金句摘录')intro.push(m);
    else if(cat==='理论框架')theory.push(m);
    else if(cat==='数据来源'||cat==='案例素材')empirical.push(m);
    else if(cat==='政策文件')policy.push(m);
    else intro.push(m);
  });
  packageResult={keyword:input,intro:intro,theory:theory,empirical:empirical,policy:policy};
  renderTopic();
}
function exportPackageTxt(){
  if(!packageResult){toast('请先生成素材包');return;}
  const p=packageResult;
  let txt='【选题素材包】'+p.keyword+'\n生成时间：'+fmtDate(new Date())+'\n\n';
  const secs=[('一、引言素材',p.intro),('二、理论框架',p.theory),('三、实证数据',p.empirical),('四、政策对策',p.policy)];
  secs.forEach(([title,arr])=>{
    txt+='\n===== '+title+' =====\n';
    if(!arr.length){txt+='（暂无）\n';return;}
    arr.forEach((m,i)=>{txt+=(i+1)+'. ['+(m.category||'')+'] '+(m.content||'')+(m.source?' —— '+m.source:'')+'\n';});
  });
  const blob=new Blob(['\ufeff'+txt],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='素材包_'+p.keyword.substring(0,20)+'.txt';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  toast('素材包已导出');
}
function renderTopic(){
  const tabs='<div class="sub-tabs"><button class="sub-tab '+(topicTab==='topics'?'active':'')+'" onclick="topicTab=\'topics\';expandedTopic=null;renderTopic()">我的选题</button><button class="sub-tab '+(topicTab==='match'?'active':'')+'" onclick="topicTab=\'match\';renderTopic()">论点匹配引文</button><button class="sub-tab '+(topicTab==='package'?'active':'')+'" onclick="topicTab=\'package\';renderTopic()">📦 选题素材包</button></div>';
  let body='';
  if(topicTab==='topics'){
    const list=data.topics.length?data.topics.map((t,i)=>{
      const isOpen=expandedTopic===i;
      const dimsHtml=isOpen&&t.dims?'<div class="dim-grid" style="margin-top:10px;">'+DIMENSIONS.map(d=>'<div class="dim-item"><label>'+d+'</label><input type="range" min="0" max="10" value="'+(t.dims[d]||0)+'" onchange="updateDim(\''+t.id+'\',\''+d+'\',this.value)"><span class="dim-val">'+(t.dims[d]||0)+'/10</span></div>').join('')+'</div><div class="radar-wrap" id="radar_'+t.id+'"></div>':'';
      return '<div class="list-item" style="flex-direction:column;align-items:stretch;"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;"><div class="item-text" onclick="expandedTopic='+(isOpen?'null':i)+';renderTopic()" style="cursor:pointer;"><strong>'+esc(t.title)+'</strong><div class="item-meta">'+(t.date||'')+' · AI评分 <strong>'+calcScore(t)+'</strong>/120 '+scoreGrade(calcScore(t))+'</div>'+(t.question?'<div style="margin-top:4px;font-size:.82rem;color:var(--text-soft);">'+esc(t.question)+'</div>':'')+'</div><div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;"><button class="add-btn ghost" style="padding:4px 10px;font-size:.75rem;" onclick="event.stopPropagation();expandedTopic='+(isOpen?'null':i)+';renderTopic()">'+(isOpen?'收起':'展开评测')+'</button><button class="del-btn" onclick="event.stopPropagation();delTopic(\''+t.id+'\')">删除</button></div></div>'+dimsHtml+'</div>';
    }).join(''):emptyState('🔍','还没有选题，点击下方添加');
    body=tabs+'<div class="card"><div class="card-title"><span class="title-icon">📋</span>我的选题 <span style="font-size:.78rem;color:var(--text-mute);font-weight:400;margin-left:8px;">共 '+data.topics.length+' 个</span></div>'+list+'</div>'
      +'<div class="card"><div class="card-title"><span class="title-icon">➕</span>新建选题</div>'
      +'<div class="form-group"><label>选题标题</label><input id="topicTitle" placeholder="如：总体国家安全观视域下的南海通道安全治理研究"></div>'
      +'<div class="form-group"><label>核心问题</label><textarea id="topicQuestion" placeholder="该选题要回答的核心研究问题"></textarea></div>'
      +'<button class="add-btn" onclick="addTopic()">+ 创建选题并AI评测</button></div>';
  }else if(topicTab==='package'){
    const topicOpts=data.topics.map(t=>'<option value="'+esc(t.title)+'">'+esc(t.title)+'</option>').join('');
    const secHtml=p=>(p&&p.length)?p.map(m=>'<div class="pkg-item"><div class="pkg-content">'+esc(m.content)+'</div><div class="pkg-meta">['+esc(m.category||'')+']'+(m.source?' · 来源：'+esc(m.source):'')+'</div></div>').join(''):'<div class="pkg-empty">暂无匹配素材</div>';
    let resultHtml='';
    if(packageResult){
      resultHtml='<div class="pkg-result"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font-weight:700;color:var(--primary-deep);">📦 「'+esc(packageResult.keyword)+'」素材包</div><button class="add-btn ghost" onclick="exportPackageTxt()">📄 导出为TXT</button></div>'
        +'<div class="material-package-section"><div class="pkg-sec-title">📖 引言素材（金句/定义）</div>'+secHtml(packageResult.intro)+'</div>'
        +'<div class="material-package-section"><div class="pkg-sec-title">🧩 理论框架</div>'+secHtml(packageResult.theory)+'</div>'
        +'<div class="material-package-section"><div class="pkg-sec-title">📊 实证数据</div>'+secHtml(packageResult.empirical)+'</div>'
        +'<div class="material-package-section"><div class="pkg-sec-title">📜 政策对策</div>'+secHtml(packageResult.policy)+'</div></div>';
    }
    body=tabs+'<div class="card"><div class="card-title"><span class="title-icon">📦</span>选题素材包 · 从素材库智能召回</div>'
      +'<div class="form-group"><label>选题关键词（可下拉选择已有选题，或手动输入）</label><input id="pkgKeyword" list="pkgTopicList" placeholder="如：总体国家安全观 南海通道 治理" value="'+(packageResult?esc(packageResult.keyword):'')+'"><datalist id="pkgTopicList">'+topicOpts+'</datalist></div>'
      +'<button class="add-btn" onclick="generateMaterialPackage()">🎯 生成素材包</button>'
      +'<div style="margin-top:12px;font-size:.8rem;color:var(--text-mute);">已收录 '+data.materials.length+' 条素材 · 按"引言→理论→实证→对策"论证顺序自动排序</div>'
      +'</div>'+resultHtml;
  }else{
    const q=litSearch.trim();
    const cnkiUrl='https://kns.cnki.net/kns8s/defaultresult/index?kw='+encodeURIComponent(q);
    const wanfangUrl='https://s.wanfangdata.com.cn/paper?q='+encodeURIComponent(q);
    const cqvipUrl='https://qikan.cqvip.com/Search/Index?key='+encodeURIComponent(q);
    const matched=LITERATURE_DB.filter(l=>!q||l.title.includes(q)||l.keywords.includes(q)||l.authors.includes(q));
    const matchedHtml=matched.length?matched.map(l=>'<div class="lit-card"><div class="lit-title">'+esc(l.title)+'</div><div class="lit-meta">'+esc(l.authors)+' · '+esc(l.journal)+' · '+l.year+'</div><div class="lit-summary">'+esc(l.summary)+'</div><div class="lit-writing"><strong>写作范式：</strong>'+esc(l.writing)+'</div><div style="margin-top:8px;"><a href="'+cnkiUrl+'" target="_blank" class="job-link">🔵 知网检索</a><a href="'+wanfangUrl+'" target="_blank" class="job-link">🟠 万方检索</a><a href="'+cqvipUrl+'" target="_blank" class="job-link">🟢 维普检索</a></div></div>').join(''):'';
    const localHtml=q?matchedHtml+'<div style="padding:12px 16px;background:var(--primary-bg);border-radius:8px;font-size:.85rem;line-height:1.8;margin-top:12px;"><strong>💡 使用提示：</strong><br>• 输入<strong>论点关键词</strong>（如"总体国家安全观 治理"）检索相关论文<br>• 输入<strong>作者姓名</strong>（如"王义桅"）检索该作者全部论文<br>• 输入<strong>研究方向</strong>（如"海洋安全 通道"）检索领域文献<br>• 点击上方按钮直接跳转对应数据库检索结果页</div>':'<div style="padding:40px 20px;text-align:center;color:var(--text-mute);"><div style="font-size:2.5rem;margin-bottom:12px;">🔍</div><p>输入论点关键词、作者或研究方向</p><p style="font-size:.8rem;margin-top:4px;">点击检索后匹配内置文献库并跳转知网/万方/维普</p></div>';
    body=tabs+'<div class="card"><div class="card-title"><span class="title-icon">🔗</span>论点匹配引文 · 直达知网/万方/维普</div><div class="search-box"><input id="litSearchInput" placeholder="输入论点关键词、作者、研究方向..." value="'+esc(litSearch)+'" onkeydown="if(event.key===\'Enter\'){litSearch=this.value;renderTopic();}"><button class="add-btn" style="margin-left:8px;white-space:nowrap;" onclick="litSearch=document.getElementById(\'litSearchInput\').value;renderTopic()">🔍 检索</button></div>'
      +(q?'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px;"><a href="'+cnkiUrl+'" target="_blank" style="display:block;padding:16px;background:linear-gradient(135deg,var(--primary),var(--primary-deep));color:#fff;border-radius:10px;text-align:center;text-decoration:none;font-weight:700;"><div style="font-size:1.2rem;">🔵</div><div style="margin-top:4px;">中国知网 CNKI</div><div style="font-size:.75rem;font-weight:400;opacity:.8;margin-top:2px;">最全面的中文学术数据库</div></a><a href="'+wanfangUrl+'" target="_blank" style="display:block;padding:16px;background:linear-gradient(135deg,#C96E3F,#AA3724);color:#fff;border-radius:10px;text-align:center;text-decoration:none;font-weight:700;"><div style="font-size:1.2rem;">🟠</div><div style="margin-top:4px;">万方数据</div><div style="font-size:.75rem;font-weight:400;opacity:.8;margin-top:2px;">期刊/学位/会议论文</div></a><a href="'+cqvipUrl+'" target="_blank" style="display:block;padding:16px;background:linear-gradient(135deg,#2D8672,#1B5853);color:#fff;border-radius:10px;text-align:center;text-decoration:none;font-weight:700;"><div style="font-size:1.2rem;">🟢</div><div style="margin-top:4px;">维普资讯</div><div style="font-size:.75rem;font-weight:400;opacity:.8;margin-top:2px;">期刊文献检索</div></a></div>':'')
      +localHtml+'</div>';
  }
  document.getElementById('mainContent').innerHTML='<div class="page-header"><h1>🔍 选题筛选</h1><p>AI自动12维度评测报告 + 论点匹配直达知网/万方/维普 + 选题素材包</p></div>'+body;
  if(topicTab==='topics'&&expandedTopic!==null){
    const t=data.topics[expandedTopic];
    if(t&&t.dims){
      setTimeout(()=>{
        const el=document.getElementById('radar_'+t.id);
        if(el&&window.echarts){
          radarChart=echarts.init(el);
          radarChart.setOption({
            radar:{indicator:DIMENSIONS.map(d=>({name:d,max:10})),radius:'65%'},
            series:[{type:'radar',data:[{value:DIMENSIONS.map(d=>Number(t.dims[d]||0)),name:t.title,areaStyle:{opacity:0.3},lineStyle:{color:'var(--primary)'}}]}]
          });
        }
      },100);
    }
  }
}
function addTopic(){
  const title=document.getElementById('topicTitle').value.trim();
  const question=document.getElementById('topicQuestion').value.trim();
  if(!title){toast('请输入选题标题');return;}
  const dims={};
  DIMENSIONS.forEach(d=>dims[d]=Math.floor(Math.random()*5)+4); // AI模拟评分
  data.topics.unshift({id:uid(),title:title,question:question,dims:dims,date:fmtDate(new Date()),projectId:currentProjectId});
  saveData();
  toast('选题已创建，AI评测完成');
  renderTopic();
}
function delTopic(id){data.topics=data.topics.filter(t=>t.id!==id);saveData();renderTopic();}
function updateDim(id,dim,val){
  const t=data.topics.find(x=>x.id===id);
  if(t){if(!t.dims)t.dims={};t.dims[dim]=Number(val);saveData();}
}

// ===== 好文剖析 =====
function renderArticle(){
  const daily=DAILY_ARTICLE;
  const flowHtml=daily.detailedFlow.map((s,i)=>'<div class="flow-step" onclick="this.querySelector(\'.flow-detail\').style.display=this.querySelector(\'.flow-detail\').style.display===\'none\'?\'block\':\'none\'"><div style="background:var(--primary);color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0;">'+(i+1)+'</div><div><strong style="font-size:.88rem;">'+esc(s.step)+'</strong><div class="flow-detail" style="display:none;margin-top:6px;font-size:.82rem;color:var(--text-soft);line-height:1.7;">'+esc(s.detail)+'</div></div></div>').join('');
  const conceptHtml='<div class="concept-map"><div class="concept-map-title">🧩 概念图谱</div>'+daily.conceptMap.layers.map(l=>'<div class="concept-layer"><div class="concept-layer-label">'+esc(l.label)+'</div><div class="concept-chain">'+l.nodes.map((n,ni)=>'<span class="concept-node '+(n.type==='accent'?'accent':'')+'">'+esc(n.text)+'</span>'+(ni<l.nodes.length-1?'<span class="concept-arrow">→</span>':'')).join('')+'</div></div>').join('')+'</div>';
  const list=data.articles.length?data.articles.map(a=>'<div class="list-item"><div class="item-text"><strong>'+esc(a.title)+'</strong><div class="item-meta">'+esc(a.author||'')+' · '+esc(a.journal||'')+' '+(a.year||'')+'</div>'+(a.coreArg?'<div style="margin-top:4px;font-size:.82rem;color:var(--text-soft);">核心论点：'+esc(a.coreArg.substring(0,80))+'</div>':'')+'</div><button class="del-btn" onclick="delArticle(\''+a.id+'\')">删除</button></div>').join(''):emptyState('📖','暂无剖析记录');

  document.getElementById('mainContent').innerHTML=
    '<div class="page-header"><h1>📖 好文剖析</h1><p>每日一篇核心期刊论文深度拆解 · 论证流程 · 概念图谱</p></div>'
    +'<div class="daily-article"><span class="daily-badge">📌 每日好文</span><div class="daily-title">'+esc(daily.title)+'</div><div class="daily-meta">'+esc(daily.authors)+' · '+esc(daily.journal)+' '+daily.year+'年第'+daily.issue+'期 · 第'+daily.pages+'页</div>'
    +'<a href="'+daily.url+'" target="_blank" class="job-link">🔗 原文链接 ↗</a>'
    +'<div style="margin-top:16px;"><div class="analysis-label">📝 论证流程（点击展开）</div>'+flowHtml+'</div>'
    +conceptHtml
    +'<div class="analysis-section"><div class="analysis-label">💡 金句摘录</div>'+daily.quotes.map(q=>'<div class="quote-item"><span class="quote-text">'+esc(q)+'</span><button class="quote-save" onclick="saveQuote(\''+esc(q).replace(/'/g,"\\'")+'\')">存入素材</button></div>').join('')+'</div>'
    +'</div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">📚</span>我的好文剖析记录 <span style="font-size:.78rem;color:var(--text-mute);font-weight:400;margin-left:8px;">共 '+data.articles.length+' 篇</span></div>'+list+'</div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">➕</span>手动录入好文</div>'
    +'<div class="form-row"><div><label>论文标题</label><input id="artTitle" placeholder="论文完整标题"></div><div><label>作者</label><input id="artAuthor" placeholder="作者姓名"></div></div>'
    +'<div class="form-row"><div><label>期刊</label><input id="artJournal" placeholder="如：国际安全研究"></div><div><label>年份</label><input id="artYear" type="number" placeholder="2025"></div></div>'
    +'<div class="form-group"><label>核心论点</label><textarea id="artCore" placeholder="论文的核心论点或创新点"></textarea></div>'
    +'<button class="add-btn" onclick="addArticle()">+ 保存剖析</button></div>';
}
function delArticle(id){data.articles=data.articles.filter(a=>a.id!==id);saveData();renderArticle();}
function addArticle(){
  const title=document.getElementById('artTitle').value.trim();
  if(!title){toast('请输入论文标题');return;}
  data.articles.unshift({id:uid(),title:title,author:document.getElementById('artAuthor').value,journal:document.getElementById('artJournal').value,year:document.getElementById('artYear').value,coreArg:document.getElementById('artCore').value,date:fmtDate(new Date()),projectId:currentProjectId});
  saveData();toast('好文剖析已保存');renderArticle();
}
function saveQuote(q){
  data.materials.unshift({id:uid(),category:'金句摘录',content:q,source:DAILY_ARTICLE.title,date:fmtDate(new Date())});
  saveData();toast('已存入素材库');
}

// ===== 考博信息 =====
let PHD_DB=[];
async function loadPhdData(){
  if(window.PHD_DATA&&window.PHD_DATA.length){PHD_DB=window.PHD_DATA;return;}
  try{
    const res=await fetch('phd_supervisors.json');
    if(res.ok){PHD_DB=await res.json();}
  }catch(e){/* 使用内置数据 */}
  if(!PHD_DB.length)PHD_DB=DEFAULT_PHD_DB;
}
function renderPhd(){
  const searchVal=(window._phdSearch||'').toLowerCase();
  const filtered=searchVal?PHD_DB.filter(sch=>{
    const schoolMatch=sch.school.toLowerCase().includes(searchVal)||sch.college.toLowerCase().includes(searchVal);
    const supMatch=sch.supervisors.some(sup=>sup.name.toLowerCase().includes(searchVal)||sup.direction.toLowerCase().includes(searchVal));
    return schoolMatch||supMatch;
  }).map(sch=>{
    const schoolMatch=sch.school.toLowerCase().includes(searchVal)||sch.college.toLowerCase().includes(searchVal);
    if(schoolMatch)return sch;
    return {...sch,supervisors:sch.supervisors.filter(sup=>sup.name.toLowerCase().includes(searchVal)||sup.direction.toLowerCase().includes(searchVal))};
  }):PHD_DB;
  const totalSup=PHD_DB.reduce((s,sch)=>s+sch.supervisors.length,0);
  const schoolsHtml=filtered.length?filtered.map((sch,idx)=>{
    const isOpen=expandedSchools[idx]!==false;
    const supList=sch.supervisors.length?sch.supervisors.map(sup=>'<div class="sup-item"><span class="sup-name">'+esc(sup.name)+'</span><span class="sup-title">'+esc(sup.title||'')+'</span><div class="sup-dir">'+esc(sup.direction||'')+'</div>'+(sup.email?'<div class="sup-email">📧 '+esc(sup.email)+'</div>':'')+(sup.repWorks&&sup.repWorks.length?'<div class="sup-works">'+sup.repWorks.map(rw=>'<div class="sup-work-item">📄 '+esc(rw.title)+(rw.cnki?' <a href="'+rw.cnki+'" target="_blank" class="job-link">🔗知网检索</a>':'')+'</div>').join('')+'</div>':'')+(sup.url?'<div style="margin-top:4px;"><a href="'+sup.url+'" target="_blank" class="job-link">导师主页 ↗</a></div>':'')+'</div>').join(''):'<div style="padding:10px 0;color:var(--text-mute);font-size:.85rem;">该学院导师信息待补充</div>';
    return '<div class="school-block"><div class="school-header" onclick="toggleSchool('+idx+')"><div><strong>'+esc(sch.school)+'</strong><div class="school-meta">'+esc(sch.college)+' · '+esc(sch.degree)+'</div></div><span style="font-size:.8rem;color:var(--text-mute);">'+(isOpen?'收起 ▲':'展开 ▼')+' ('+sch.supervisors.length+'位导师)</span></div><div class="school-body '+(isOpen?'open':'')+'"><div style="margin-bottom:10px;font-size:.82rem;color:var(--text-soft);"><strong>培养方向：</strong>'+esc(sch.direction)+'</div>'+supList+(sch.url?'<div style="margin-top:10px;"><a href="'+sch.url+'" target="_blank" class="job-link">🏛 学院官网 ↗</a></div>':'')+'</div></div>';
  }).join(''):emptyState('🎓','未找到匹配的院校/导师');
  document.getElementById('mainContent').innerHTML='<div class="page-header"><h1>🎓 考博信息</h1><p>共 '+PHD_DB.length+' 所院校 · '+totalSup+' 位博士生导师 · 学校-学院-专业-方向-导师-代表文献一一对应</p></div><div class="card"><div class="search-box"><input placeholder="搜索学校、学院、导师姓名或研究方向..." value="'+esc(window._phdSearch||'')+'" oninput="window._phdSearch=this.value;renderPhd();"></div>'+schoolsHtml+'</div>';
}
function toggleSchool(idx){expandedSchools[idx]=expandedSchools[idx]===false?true:false;renderPhd();}

// ===== 就业导航 =====
function renderJob(){
  const feed=window.JOB_FEED||{};
  const cats=Object.keys(feed);
  const catIcons={'高校教职':'🎓','公务员':'🏛️','事业单位科研院所':'🔬','国央企':'🏢','警察军官':'🎖️'};
  const total=cats.reduce((s,c)=>s+feed[c].length,0);
  const catsHtml=cats.map(cat=>{
    const jobs=feed[cat]||[];
    const listHtml=jobs.map(j=>'<div class="job-item"><div class="job-item-head"><strong>'+esc(j.title)+'</strong>'+(j.url?'<a href="'+j.url+'" target="_blank" class="job-link">查看详情 ↗</a>':'')+'</div><div class="item-meta">'+esc(j.org)+' · <span class="chip">'+esc(j.type||cat)+'</span> · ⏰ 截止：'+esc(j.deadline||'待定')+'</div><div class="job-desc">'+esc(j.desc||'')+'</div></div>').join('');
    return '<div class="job-category-card"><div class="job-cat-title">'+(catIcons[cat]||'📌')+' '+esc(cat)+'<span class="chip accent" style="margin-left:8px;">'+jobs.length+' 个岗位</span></div>'+listHtml+'</div>';
  }).join('');
  document.getElementById('mainContent').innerHTML='<div class="page-header"><h1>💼 就业导航</h1><p>五分区岗位推送 · 高校教职 / 公务员 / 科研院所 / 国央企 / 警察军官 · 共 '+total+' 个岗位</p></div><div class="job-categories-wrap">'+catsHtml+'</div>';
}

// ===== 文献管理（含PDF拖拽上传）=====
function renderRef(){
  const list=data.refs.length?data.refs.map(r=>'<div class="list-item"><div class="item-text"><strong>'+esc(r.title)+'</strong><div class="item-meta">'+esc(r.author||'未知作者')+' · '+esc(r.source||'未知来源')+' · '+(r.year||'')+(r.extracted?' <span class="chip">已自动提取</span>':'')+'</div>'+(r.note?'<div style="margin-top:4px;font-size:.82rem;color:var(--text-mute);">'+esc(r.note)+'</div>':'')+'<div style="margin-top:6px;">'+(r.tags||'').split(/[,，]/).filter(Boolean).map(t=>'<span class="chip">'+esc(t.trim())+'</span>').join('')+'</div></div><div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;"><button class="add-btn ghost" style="padding:4px 10px;font-size:.75rem;" onclick="toggleRefRead(\''+r.id+'\')">'+(r.read?'已读':'标记已读')+'</button><button class="del-btn" onclick="delRef(\''+r.id+'\')">删除</button></div></div>').join(''):emptyState('📝','还没有文献，拖拽PDF到下方区域自动提取元数据');
  document.getElementById('mainContent').innerHTML='<div class="page-header"><h1>📝 文献管理</h1><p>拖拽PDF/Word自动提取标题、作者、期刊、发表年份 · 全部本地存储</p></div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">📂</span>我的文献库 <span style="font-size:.78rem;color:var(--text-mute);font-weight:400;margin-left:8px;">共 '+data.refs.length+' 篇</span></div>'+list+'</div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">⬆️</span>拖拽上传文献</div><div class="drop-zone" id="dropZone" ondragover="event.preventDefault();this.classList.add(\'dragover\')" ondragleave="this.classList.remove(\'dragover\')" ondrop="handleDrop(event)"><div class="drop-icon">📄</div><p>将PDF或Word文件拖拽到此处</p><p style="font-size:.78rem;margin-top:6px;">自动提取标题、作者、期刊、发表年份等元数据</p><input type="file" id="fileInput" multiple accept=".pdf,.doc,.docx,.txt" style="display:none;" onchange="processFiles(this.files)"><button class="add-btn ghost" style="margin-top:12px;" onclick="document.getElementById(\'fileInput\').click()">选择文件</button></div></div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">➕</span>手动录入文献</div><div class="form-row"><div><label>文献标题</label><input id="refTitle" placeholder="论文完整标题"></div><div><label>作者</label><input id="refAuthor" placeholder="作者姓名"></div></div><div class="form-row"><div><label>期刊/来源</label><input id="refSource" placeholder="如：国际安全研究"></div><div><label>发表年份</label><input id="refYear" type="number" placeholder="2025"></div></div><div class="form-group"><label>关键词（逗号分隔）</label><input id="refTags" placeholder="如：总体国家安全观,非传统安全"></div><div class="form-group"><label>备注</label><textarea id="refNote" placeholder="阅读心得、核心观点等"></textarea></div><button class="add-btn" onclick="addRef()">+ 保存文献</button></div>';
}
function handleDrop(e){e.preventDefault();document.getElementById('dropZone').classList.remove('dragover');processFiles(e.dataTransfer.files);}

// ===== 自动文献剖析引擎 =====
function autoAnalyzeText(text,title){
  if(!text||text.length<50)return null;
  const sentences=text.split(/[。！？\n]/).filter(s=>s.trim().length>=20&&s.trim().length<=150);
  const judgeWords=['认为','指出','表明','说明','意味着','体现','反映','揭示','论证','提出','构建','强调','关键','核心','重要','本质','必然','趋势'];
  const quotes=sentences.filter(s=>judgeWords.some(w=>s.includes(w))).slice(0,5).map(s=>s.trim());
  const theories=THEORY_KEYWORDS.filter(t=>text.includes(t)).slice(0,5);
  const theoryFramework=theories.length?theories.map(t=>({name:t,content:'文中运用了'+t+'作为分析框架，可迁移至同类安全议题研究。'})):[{name:'待补充理论框架',content:'文本中未明确识别出核心理论框架，建议精读后手动补充。'}];
  const policies=[];
  POLICY_PATTERNS.forEach(p=>{const m=text.match(p);if(m)m.forEach(x=>{if(!policies.includes(x)&&x.length<40)policies.push(x);});});
  const policyDocs=policies.length?policies.slice(0,5).map(p=>({name:p,content:'文中引用了'+p+'，可作为政策依据素材。'})):[{name:'待补充政策文件',content:'文本中未识别出明确的政策文件引用。'}];
  const dataSources=[];
  DATA_PATTERNS.forEach(p=>{const m=text.match(p);if(m)m.forEach(x=>{if(!dataSources.includes(x))dataSources.push(x);});});
  const dataSrc=dataSources.length?dataSources.slice(0,5).map(d=>({name:d,type:'数据来源',content:'文中使用了'+d+'作为数据支撑。'})):[{name:'待补充数据来源',type:'数据来源',content:'文本中未识别出明确的数据来源。'}];
  const flowSteps=[
    {step:'问题提出',detail:'从'+(title||'该议题')+'的现实背景切入，识别研究问题与研究缺口。'},
    {step:'理论资源梳理',detail:'梳理'+(theories.length?theories.slice(0,2).join('、'):'相关理论')+'等理论资源，确立分析视角。'},
    {step:'核心框架构建',detail:'构建本文的核心分析框架，明确核心概念与变量关系。'},
    {step:'实证/案例分析',detail:'运用'+(dataSources.length?dataSources.slice(0,2).join('、'):'相关数据或案例')+'进行实证分析。'},
    {step:'机制阐释',detail:'阐释核心变量之间的作用机制与因果逻辑。'},
    {step:'结论与政策建议',detail:'总结研究发现，提出针对性政策建议。'}
  ];
  return{quotes:quotes,theoryFramework:theoryFramework,policyDocs:policyDocs,dataSources:dataSrc,detailedFlow:flowSteps};
}
function commitAnalysis(refEntry, analysis){
  if(!analysis)return{q:0,t:0,p:0,d:0};
  const src=refEntry.title||'上传文献';
  let q=0,t=0,p=0,d=0;
  analysis.quotes.forEach(s=>{data.materials.unshift({id:uid(),category:'金句观点',content:s,source:src,date:fmtDate(new Date())});q++;});
  analysis.theoryFramework.forEach(o=>{if(o.name&&!o.name.startsWith('待补充')){data.materials.unshift({id:uid(),category:'理论框架',content:o.name+'：'+o.content,source:src,date:fmtDate(new Date())});t++;}});
  analysis.policyDocs.forEach(o=>{if(o.name&&!o.name.startsWith('待补充')){data.materials.unshift({id:uid(),category:'政策文件',content:o.name+'：'+o.content,source:src,date:fmtDate(new Date())});p++;}});
  analysis.dataSources.forEach(o=>{if(o.name&&!o.name.startsWith('待补充')){data.materials.unshift({id:uid(),category:'数据来源',content:o.name+'：'+o.content,source:src,date:fmtDate(new Date())});d++;}});
  data.articles.unshift({id:uid(),title:refEntry.title||'自动剖析文献',author:refEntry.author||'',journal:refEntry.source||'',year:refEntry.year||'',coreArg:'自动剖析提取金句'+q+'条、理论'+t+'个、政策'+p+'个、数据'+d+'个。',date:fmtDate(new Date()),projectId:currentProjectId,autoAnalyzed:true,quoteCount:q,theoryCount:t,policyCount:p,dataCount:d});
  return{q:q,t:t,p:p,d:d};
}
function processFiles(files){
  for(const f of files){
    const lower=f.name.toLowerCase();
    if(lower.endsWith('.pdf')&&window.pdfjsLib){extractPdfFullText(f);}
    else if(lower.endsWith('.docx')){extractDocxText(f);}
    else if(lower.endsWith('.txt')){extractTxtText(f);}
    else{
      const name=f.name.replace(/\.(pdf|caj|doc|docx|txt)$/i,'');
      data.refs.unshift({id:uid(),title:name,author:'',source:'文件上传',year:new Date().getFullYear().toString(),note:'文件大小：'+(f.size/1024).toFixed(1)+'KB · 类型：'+f.type,tags:'',read:false,file:f.name,uploadDate:fmtDate(new Date())});
      saveData();renderRef();toast('已导入：'+name);
    }
  }
}
function extractPdfFullText(file){
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const typedarray=new Uint8Array(e.target.result);
      pdfjsLib.getDocument(typedarray).promise.then(function(pdf){
        pdf.getMetadata().then(async function(meta){
          let title='',author='',source='',year='';
          if(meta.info){title=meta.info.Title||'';author=meta.info.Author||'';if(meta.info.CreationDate){const m=meta.info.CreationDate.match(/D:(\d{4})/);if(m)year=m[1];}}
          let fullText='';
          try{for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const tc=await page.getTextContent();fullText+=tc.items.map(function(item){return item.str;}).join(' ')+'\n';}}catch(pe){console.warn('page text err',pe);}
          let firstPageText='';
          try{const p1=await pdf.getPage(1);const tc1=await p1.getTextContent();firstPageText=tc1.items.map(function(it){return it.str;}).join(' ');}catch(_){}
          if(!title){const lines=firstPageText.split(/\n|\.\s+/).filter(function(l){return l.trim().length>5&&l.trim().length<100;});if(lines.length>0)title=lines[0].trim();}
          const journalMatch=firstPageText.match(/(《[^》]+》|[A-Z][a-z]+ (?:Journal|Review|Studies|Quarterly)[^,\s]*)/);
          if(journalMatch)source=journalMatch[1];
          if(!year){const yearMatch=firstPageText.match(/(19|20)\d{2}/);if(yearMatch)year=yearMatch[0];}
          if(!author){const authorMatch=firstPageText.match(/([\u4e00-\u9fa5]{2,4}(?:、|,|，)[\u4e00-\u9fa5]{2,4})/);if(authorMatch)author=authorMatch[1];}
          const finalTitle=title||file.name.replace(/\.pdf$/i,'');
          const refEntry={id:uid(),title:finalTitle.substring(0,150),author:(author||'').substring(0,100),source:source||'PDF上传',year:year||new Date().getFullYear().toString(),note:'自动提取元数据+全文剖析 · 文件大小：'+(file.size/1024).toFixed(1)+'KB · 共'+pdf.numPages+'页',tags:'',read:false,file:file.name,uploadDate:fmtDate(new Date()),extracted:true};
          data.refs.unshift(refEntry);
          const analysis=autoAnalyzeText(fullText,finalTitle);
          const r=commitAnalysis(refEntry,analysis);
          saveData();renderRef();
          toast('已自动剖析：提取金句'+r.q+'条、理论'+r.t+'个、政策'+r.p+'个、数据'+r.d+'个');
        });
      }).catch(function(err){
        console.warn('PDF parse error:',err);
        const name=file.name.replace(/\.pdf$/i,'');
        data.refs.unshift({id:uid(),title:name,author:'',source:'PDF上传',year:new Date().getFullYear().toString(),note:'文件大小：'+(file.size/1024).toFixed(1)+'KB · 元数据提取失败',tags:'',read:false,file:file.name,uploadDate:fmtDate(new Date())});
        saveData();renderRef();toast('已导入（PDF解析失败）');
      });
    }catch(err){
      const name=file.name.replace(/\.pdf$/i,'');
      data.refs.unshift({id:uid(),title:name,author:'',source:'PDF上传',year:new Date().getFullYear().toString(),note:'文件大小：'+(file.size/1024).toFixed(1)+'KB',tags:'',read:false,file:file.name,uploadDate:fmtDate(new Date())});
      saveData();renderRef();
    }
  };
  reader.readAsArrayBuffer(file);
}
function extractDocxText(file){
  const reader=new FileReader();
  reader.onload=function(e){
    const name=file.name.replace(/\.docx?$/i,'');
    if(!window.mammoth){
      data.refs.unshift({id:uid(),title:name,author:'',source:'DOCX上传',year:new Date().getFullYear().toString(),note:'mammoth未加载，未剖析',tags:'',read:false,file:file.name,uploadDate:fmtDate(new Date())});
      saveData();renderRef();toast('已导入（mammoth未加载）');return;
    }
    mammoth.extractRawText({arrayBuffer:e.target.result}).then(function(result){
      const text=result.value||'';
      const refEntry={id:uid(),title:name,author:'',source:'DOCX上传',year:new Date().getFullYear().toString(),note:'mammoth提取全文 · 字数'+text.length,tags:'',read:false,file:file.name,uploadDate:fmtDate(new Date()),extracted:true};
      data.refs.unshift(refEntry);
      const analysis=autoAnalyzeText(text,name);
      const r=commitAnalysis(refEntry,analysis);
      saveData();renderRef();
      toast('已自动剖析：提取金句'+r.q+'条、理论'+r.t+'个、政策'+r.p+'个、数据'+r.d+'个');
    }).catch(function(err){
      console.warn('docx err',err);
      data.refs.unshift({id:uid(),title:name,author:'',source:'DOCX上传',year:new Date().getFullYear().toString(),note:'DOCX解析失败',tags:'',read:false,file:file.name,uploadDate:fmtDate(new Date())});
      saveData();renderRef();toast('DOCX解析失败');
    });
  };
  reader.readAsArrayBuffer(file);
}
function extractTxtText(file){
  const reader=new FileReader();
  reader.onload=function(e){
    const text=String(e.target.result||'');
    const name=file.name.replace(/\.txt$/i,'');
    const refEntry={id:uid(),title:name,author:'',source:'TXT上传',year:new Date().getFullYear().toString(),note:'TXT全文 · 字数'+text.length,tags:'',read:false,file:file.name,uploadDate:fmtDate(new Date()),extracted:true};
    data.refs.unshift(refEntry);
    const analysis=autoAnalyzeText(text,name);
    const r=commitAnalysis(refEntry,analysis);
    saveData();renderRef();
    toast('已自动剖析：提取金句'+r.q+'条、理论'+r.t+'个、政策'+r.p+'个、数据'+r.d+'个');
  };
  reader.readAsText(file,'UTF-8');
}
function addRef(){
  const title=document.getElementById('refTitle').value.trim();
  if(!title){toast('请输入文献标题');return;}
  data.refs.unshift({id:uid(),title:title,author:document.getElementById('refAuthor').value,source:document.getElementById('refSource').value,year:document.getElementById('refYear').value,tags:document.getElementById('refTags').value,note:document.getElementById('refNote').value,read:false,uploadDate:fmtDate(new Date()),projectId:currentProjectId});
  saveData();toast('文献已保存');renderRef();
}
function delRef(id){data.refs=data.refs.filter(r=>r.id!==id);saveData();renderRef();}
function toggleRefRead(id){const r=data.refs.find(x=>x.id===id);if(r){r.read=!r.read;saveData();renderRef();}}

// ===== 写作素材 =====
function bigramSet(s){
  s=String(s||'').replace(/\s+/g,'');
  const set=new Set();
  for(let i=0;i<s.length-1;i++)set.add(s.substr(i,2));
  return set;
}
function jaccard(a,b){
  const sa=bigramSet(a),sb=bigramSet(b);
  if(!sa.size||!sb.size)return 0;
  let inter=0;
  sa.forEach(x=>{if(sb.has(x))inter++;});
  return inter/(sa.size+sb.size-inter);
}
function dedupMaterials(){
  if(!data.materials.length){toast('素材库为空');return;}
  const kept=[];
  let mergedCount=0;
  const removed=new Set();
  for(let i=0;i<data.materials.length;i++){
    if(removed.has(data.materials[i].id))continue;
    const cur=data.materials[i];
    for(let j=i+1;j<data.materials.length;j++){
      if(removed.has(data.materials[j].id))continue;
      const o=data.materials[j];
      // 同分类才合并
      if((cur.category||'')!==(o.category||''))continue;
      const sim=jaccard(cur.content,o.content);
      if(sim>0.5){
        // 保留较长者
        let keep=cur,drop=o;
        if((o.content||'').length>(cur.content||'').length){keep=o;drop=cur;}
        // 合并来源
        const srcSet=new Set();
        String(keep.source||'').split(/[、,，;；]/).filter(Boolean).forEach(x=>srcSet.add(x.trim()));
        String(drop.source||'').split(/[、,，;；]/).filter(Boolean).forEach(x=>srcSet.add(x.trim()));
        keep.source=[...srcSet].slice(0,4).join('、');
        removed.add(drop.id);
        mergedCount++;
        if(keep!==cur){cur=keep;data.materials[i]=keep;}
      }
    }
  }
  if(mergedCount>0){
    data.materials=data.materials.filter(m=>!removed.has(m.id));
    saveData();
    toast('去重完成：合并了 '+mergedCount+' 条重复素材');
  }else{
    toast('未发现重复素材');
  }
  renderMaterial();
}

// 自动从素材库凝结专题卡片
function autoBuildTopicCards(){
  if(data.materials.length<5)return;
  // 按 category 分组后再按内容关键词聚簇
  const groups={};
  data.materials.forEach(m=>{
    const cat=m.category||'未分类';
    if(!groups[cat])groups[cat]=[];
    groups[cat].push(m);
  });
  // 简单聚簇：基于 bigram Jaccard
  const clusters=[];
  Object.keys(groups).forEach(cat=>{
    const arr=groups[cat];
    arr.forEach(m=>{
      let placed=null;
      for(const c of clusters){
        if(c.cat!==cat)continue;
        const rep=c.members[0].content;
        if(jaccard(rep,m.content)>0.25){placed=c;break;}
      }
      if(placed){placed.members.push(m);}
      else{clusters.push({cat:cat,members:[m]});}
    });
  });
  // 仅保留 >=5 条的簇
  const newCards=[];
  clusters.forEach(c=>{
    if(c.members.length<5)return;
    // 主题名：取最长公共前缀/高频词，简单取成员内容前12字
    const sample=c.members.slice().sort((a,b)=>b.content.length-a.content.length)[0];
    let title=(sample.content||'').replace(/[。！？，、；：\s]/g,'').substring(0,16);
    if(!title)title='未命名专题';
    const quotes=c.members.filter(m=>m.category==='金句观点'||m.category==='金句摘录').map(m=>m.content);
    const policies=c.members.filter(m=>m.category==='政策文件').map(m=>m.content);
    const cases=c.members.filter(m=>m.category==='数据来源'||m.category==='案例素材').map(m=>m.content);
    const sources=[...new Set(c.members.map(m=>m.source).filter(Boolean))];
    newCards.push({id:uid(),title:title,definition:sample.content.substring(0,80),quotes:quotes,policies:policies,cases:cases,sources:sources,createdAt:fmtDate(new Date()),materialCount:c.members.length});
  });
  if(newCards.length){
    // 合并：相同主题名的卡片去重
    const seen={};
    newCards.forEach(c=>{if(!seen[c.title]||seen[c.title].materialCount<c.materialCount)seen[c.title]=c;});
    data.topicCards=Object.values(seen);
    saveData();
  }
}

function renderMaterial(){
  const cats=[...new Set(data.materials.map(m=>m.category||'未分类'))];
  const list=data.materials.length?data.materials.map(m=>'<div class="list-item"><div class="item-text"><div class="material-cat">['+esc(m.category||'未分类')+']</div><div style="font-size:.88rem;line-height:1.6;">'+esc(m.content)+'</div><div class="item-meta">'+(m.source?'来源：'+esc(m.source)+' · ':'')+(m.date||'')+'</div></div><button class="del-btn" onclick="delMaterial(\''+m.id+'\')">删除</button></div>').join(''):emptyState('✍️','暂无素材，好文剖析中的金句可一键存入');

  // 智能沉淀：专题卡片
  const cardsHtml=data.topicCards&&data.topicCards.length?data.topicCards.map((c,idx)=>{
    const open=expandedTopicCard===idx;
    const detail=open?('<div class="topic-card-detail">'
      +(c.definition?'<div class="topic-row"><span class="topic-label">📖 定义</span><div>'+esc(c.definition)+'</div></div>':'')
      +(c.quotes&&c.quotes.length?'<div class="topic-row"><span class="topic-label">💡 金句</span><ul>'+c.quotes.slice(0,8).map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul></div>':'')
      +(c.policies&&c.policies.length?'<div class="topic-row"><span class="topic-label">📜 政策</span><ul>'+c.policies.slice(0,8).map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul></div>':'')
      +(c.cases&&c.cases.length?'<div class="topic-row"><span class="topic-label">📊 数据/案例</span><ul>'+c.cases.slice(0,8).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'')
      +(c.sources&&c.sources.length?'<div class="topic-row"><span class="topic-label">📚 出处</span><div>'+c.sources.map(s=>'<span class="chip">'+esc(s)+'</span>').join(' ')+'</div></div>':'')
      +'</div>'):'';
    return '<div class="topic-card"><div class="topic-card-head" onclick="expandedTopicCard='+(open?'null':idx)+';renderMaterial()"><div class="topic-card-title">🧷 '+esc(c.title)+'</div><div style="display:flex;gap:8px;align-items:center;flex-shrink:0;"><span class="chip accent">'+c.materialCount+' 条素材</span><button class="del-btn" onclick="event.stopPropagation();delTopicCard(\''+c.id+'\')">删除</button><span style="font-size:.78rem;color:var(--text-mute);">'+(open?'收起 ▲':'展开 ▼')+'</span></div></div>'+detail+'</div>';
  }).join(''):'<div class="empty-state" style="padding:20px;"><div class="empty-icon">🃏</div><p style="font-size:.85rem;">攒够5条同主题素材后，将自动凝结为专题卡片</p></div>';

  document.getElementById('mainContent').innerHTML='<div class="page-header"><h1>✍️ 写作素材</h1><p>金句 · 理论框架 · 政策文件 · 数据来源 · 智能沉淀</p></div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">💧</span>智能沉淀 <span style="font-size:.78rem;color:var(--text-mute);font-weight:400;margin-left:8px;">去重合并 · 专题凝结</span></div>'
    +'<div class="precipitate-bar"><button class="add-btn" onclick="dedupMaterials()">🔀 一键去重合并</button><button class="add-btn ghost" onclick="autoBuildTopicCards();renderMaterial()">🃏 凝结专题卡片</button><span style="font-size:.8rem;color:var(--text-mute);align-self:center;">当前 '+data.materials.length+' 条素材 · 已凝结 '+data.topicCards.length+' 张专题卡</span></div>'
    +'<div class="topic-cards-wrap">'+cardsHtml+'</div>'
    +'</div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">📂</span>素材库 <span style="font-size:.78rem;color:var(--text-mute);font-weight:400;margin-left:8px;">共 '+data.materials.length+' 条 · '+cats.length+' 个分类</span></div>'+list+'</div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">➕</span>添加素材</div><div class="form-row"><div><label>分类</label><select id="matCat"><option>金句摘录</option><option>理论框架</option><option>政策文件</option><option>数据来源</option><option>案例素材</option><option>其他</option></select></div><div><label>来源</label><input id="matSource" placeholder="如：国际安全研究2025年第4期"></div></div>'
    +'<div class="form-group"><label>素材内容</label><textarea id="matContent" placeholder="金句、理论观点、政策条文、数据等"></textarea></div>'
    +'<button class="add-btn" onclick="addMaterial()">+ 保存素材</button></div>';
}
function delTopicCard(id){data.topicCards=data.topicCards.filter(c=>c.id!==id);saveData();renderMaterial();}
function addMaterial(){
  const content=document.getElementById('matContent').value.trim();
  if(!content){toast('请输入素材内容');return;}
  data.materials.unshift({id:uid(),category:document.getElementById('matCat').value,content:content,source:document.getElementById('matSource').value,date:fmtDate(new Date())});
  saveData();toast('素材已保存');renderMaterial();
}
function delMaterial(id){data.materials=data.materials.filter(m=>m.id!==id);saveData();renderMaterial();}

// ===== 学术日程 =====
function renderSchedule(){
  const sorted=[...data.schedule].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const list=sorted.length?sorted.map(s=>'<div class="schedule-item"><div class="schedule-date">'+(s.date||'')+'</div><div class="item-text"><strong>'+esc(s.title)+'</strong><div class="item-meta">'+esc(s.type||'会议')+(s.location?' · '+esc(s.location):'')+'</div></div><button class="del-btn" onclick="delSchedule(\''+s.id+'\')">删除</button></div>').join(''):emptyState('📅','暂无日程');
  document.getElementById('mainContent').innerHTML='<div class="page-header"><h1>📅 学术日程</h1><p>会议 · 讲座 · 截止日期 · 答辩安排</p></div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">📆</span>我的日程</div>'+list+'</div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">➕</span>添加日程</div><div class="form-row"><div><label>日期</label><input id="schDate" type="date"></div><div><label>类型</label><select id="schType"><option>学术会议</option><option>讲座</option><option>截止日期</option><option>答辩</option><option>其他</option></select></div></div>'
    +'<div class="form-row"><div><label>标题</label><input id="schTitle" placeholder="如：国家安全学学年会"></div><div><label>地点</label><input id="schLoc" placeholder="如：北京·友谊宾馆"></div></div>'
    +'<button class="add-btn" onclick="addSchedule()">+ 添加日程</button></div>';
}
function addSchedule(){
  const title=document.getElementById('schTitle').value.trim();
  if(!title){toast('请输入日程标题');return;}
  data.schedule.push({id:uid(),title:title,date:document.getElementById('schDate').value,type:document.getElementById('schType').value,location:document.getElementById('schLoc').value});
  saveData();toast('日程已添加');renderSchedule();
}
function delSchedule(id){data.schedule=data.schedule.filter(s=>s.id!==id);saveData();renderSchedule();}

// ===== 研究笔记（含导出Word）=====
function renderNote(){
  const list=data.notes.length?data.notes.map(n=>'<div class="list-item"><div class="item-text"><strong>'+esc(n.title)+'</strong><div class="item-meta">'+(n.date||'')+' · '+esc(n.type||'灵感')+'</div><div style="margin-top:6px;font-size:.9rem;white-space:pre-wrap;">'+esc(n.content)+'</div><div style="margin-top:8px;"><button class="add-btn ghost" style="padding:6px 14px;font-size:.8rem;" onclick="exportNoteWord(\''+n.id+'\')">📄 导出Word</button></div></div><button class="del-btn" onclick="delNote(\''+n.id+'\')">删除</button></div>').join(''):emptyState('🧠','随时记录灵感与思考');
  document.getElementById('mainContent').innerHTML='<div class="page-header"><h1>🧠 研究笔记</h1><p>灵感记录 · 思考整理 · 支持导出Word</p></div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">📝</span>我的笔记</div>'+list+'<div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--line);"><div class="form-row"><div><label>笔记标题</label><input id="noteTitle" placeholder="如：第三章论证思路"></div><div><label>类型</label><select id="noteType"><option>灵感</option><option>研究思路</option><option>文献笔记</option><option>方法笔记</option><option>其他</option></select></div></div>'
    +'<div class="form-group"><label>笔记内容</label><textarea id="noteContent" style="min-height:120px;" placeholder="记录你的思考..."></textarea></div>'
    +'<button class="add-btn" onclick="addNote()">+ 保存笔记</button></div></div>';
}
function addNote(){
  const title=document.getElementById('noteTitle').value.trim();
  const content=document.getElementById('noteContent').value.trim();
  if(!title||!content){toast('请填写标题和内容');return;}
  data.notes.unshift({id:uid(),title:title,content:content,type:document.getElementById('noteType').value,date:fmtDate(new Date()),projectId:currentProjectId});
  saveData();toast('笔记已保存');renderNote();
}
function delNote(id){data.notes=data.notes.filter(x=>x.id!==id);saveData();renderNote();}
function exportNoteWord(id){
  const n=data.notes.find(x=>x.id===id);
  if(!n){toast('笔记不存在');return;}
  const htmlContent='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>'+n.title+'</title><style>body{font-family:"SimSun",serif;line-height:1.8;}h1{font-size:18pt;text-align:center;}h2{font-size:14pt;color:#333;}.meta{color:#666;font-size:10pt;text-align:center;margin-bottom:20px;}.content{font-size:12pt;text-indent:2em;}</style></head><body><h1>'+esc(n.title)+'</h1><div class="meta">类型：'+(n.type||'笔记')+' · 日期：'+(n.date||'')+' · 国安学术工作台生成</div><h2>笔记内容</h2><div class="content">'+esc(n.content).replace(/\n/g,'</div><div class="content">')+'</div></body></html>';
  downloadWord(htmlContent,n.title+'_笔记.doc');
  toast('Word文档已导出');
}

// ===== AI技能库 =====
const AI_SKILLS=[
{name:'12维度选题评测',desc:'对论文选题从创新性、理论深度、现实意义等12个维度进行AI评分，生成雷达图。',usage:'在「选题筛选」中创建选题后自动评测'},
{name:'论点匹配引文',desc:'输入论点关键词，自动匹配内置文献库并跳转知网/万方/维普检索。',usage:'在「选题筛选」→「论点匹配引文」标签页使用'},
{name:'PDF元数据自动提取',desc:'拖拽PDF文件自动提取标题、作者、期刊、年份等元数据。',usage:'在「文献管理」中拖拽PDF到上传区域'},
{name:'好文深度剖析',desc:'每日一篇核心期刊论文，拆解论证流程、概念图谱、金句摘录。',usage:'在「好文剖析」模块查看每日好文'},
{name:'国安研究周报',desc:'一键汇总本周选题、文献、好文、素材，生成结构化Word周报。',usage:'在「设置」中点击"生成国安研究周报"'},
{name:'论文AI对话',desc:'与AI助手对话，获取选题建议、文献推荐、写作指导。',usage:'在「论文AI对话」模块使用'},
{name:'导出Word',desc:'将研究笔记、周报等导出为Word文档。',usage:'在笔记列表点击"导出Word"按钮'},
{name:'数据导入导出',desc:'支持JSON格式备份与恢复，防止数据丢失。',usage:'在「设置」→「数据管理」中操作'},
{name:'17套主题配色',desc:'从故宫朱红到暗夜紫金，17套学术风格主题，支持自动轮换。',usage:'在「设置」→「主题配色」中选择'},
{name:'多项目管理',desc:'支持创建多个论文项目，数据按项目隔离管理。',usage:'在「论文工作台」顶部切换/新建项目'}
];
function renderAITools(){
  const list=AI_SKILLS.map(s=>'<div class="skill-card"><h4>🤖 '+esc(s.name)+'</h4><p>'+esc(s.desc)+'</p><div style="font-size:.78rem;color:var(--accent-deep);">💡 '+esc(s.usage)+'</div></div>').join('');
  document.getElementById('mainContent').innerHTML='<div class="page-header"><h1>🤖 AI Agent技能库</h1><p>工作台内置AI能力一览 · 共 '+AI_SKILLS.length+' 项技能</p></div><div class="card">'+list+'</div>';
}

// ===== 论文AI对话 =====
function renderAIChat(){
  const msgs=data.chatMessages.length?data.chatMessages.map(m=>'<div class="chat-msg '+(m.role==='user'?'user':'ai')+'"><div class="bubble">'+esc(m.content)+'</div></div>').join(''):'<div style="text-align:center;color:var(--text-mute);padding:40px;"><div style="font-size:2rem;margin-bottom:8px;">💬</div><p>开始与AI助手对话吧</p><p style="font-size:.8rem;margin-top:4px;">可以问：选题建议、文献推荐、写作方法等</p></div>';
  document.getElementById('mainContent').innerHTML='<div class="page-header"><h1>💬 论文AI对话</h1><p>智能学术助手 · 选题建议 · 文献推荐 · 写作指导</p></div>'
    +'<div class="card"><div class="chat-container"><div class="chat-messages" id="chatMessages">'+msgs+'</div>'
    +'<div class="chat-input-bar"><input id="chatInput" placeholder="输入你的问题..." onkeydown="if(event.key===\'Enter\')sendChat()"><button class="add-btn" onclick="sendChat()">发送</button></div></div></div>';
  const cm=document.getElementById('chatMessages');
  if(cm)cm.scrollTop=cm.scrollHeight;
}
function sendChat(){
  const input=document.getElementById('chatInput');
  const q=input.value.trim();
  if(!q)return;
  data.chatMessages.push({role:'user',content:q,time:fmtDate(new Date())});
  input.value='';
  renderAIChat();
  saveData();
  // 优先调用后端真实AI API
  if(apiMode&&token){
    const cm=document.getElementById('chatMessages');
    if(cm){cm.innerHTML+='<div class="chat-msg ai"><div class="bubble">⏳ 正在思考...</div></div>';cm.scrollTop=cm.scrollHeight;}
    (async()=>{
      try{
        const res=await apiPost('chat',{message:q,project_id:currentProjectId,history:data.chatMessages.slice(-10).map(m=>({role:m.role,content:m.content}))});
        if(res&&res.reply){
          data.chatMessages.push({role:'ai',content:res.reply,time:fmtDate(new Date())});
        }else{
          data.chatMessages.push({role:'ai',content:generateAIReply(q),time:fmtDate(new Date())});
        }
      }catch(e){
        data.chatMessages.push({role:'ai',content:generateAIReply(q),time:fmtDate(new Date())});
      }
      saveData();renderAIChat();
    })();
  }else{
    // 本地模式：模拟回复
    setTimeout(()=>{
      data.chatMessages.push({role:'ai',content:generateAIReply(q),time:fmtDate(new Date())});
      saveData();renderAIChat();
    },800);
  }
}
function generateAIReply(q){
  if(q.includes('选题')||q.includes('题目'))return '关于选题建议：国家安全学领域当前热点包括①总体国家安全观的理论体系研究②非传统安全协同治理③科技安全与AI治理④海洋安全与通道保护⑤边疆安全与民族地区治理。建议结合你的研究兴趣和数据可获得性选择具体方向，可以在「选题筛选」中创建选题并进行12维度AI评测。';
  if(q.includes('文献')||q.includes('论文'))return '文献推荐：建议关注《国际安全研究》《国家安全研究》《世界经济与政治》《现代国际关系》等核心期刊。你可以在「文献管理」中拖拽PDF自动提取元数据，或在「选题筛选」→「论点匹配引文」中输入关键词检索知网/万方/维普。';
  if(q.includes('写作')||q.includes('论文'))return '写作建议：①确定核心研究问题后构建理论框架②文献综述采用"问题导向"而非"作者罗列"③论证逻辑遵循"问题→理论→实证→结论"④注意政策相关性与学术规范性的平衡。可在「好文剖析」中学习顶级期刊的论证范式。';
  if(q.includes('考博')||q.includes('导师'))return '考博信息：可在「考博信息」模块查看各院校导师数据库，包含学校-学院-导师-研究方向-代表文献等完整信息。建议提前联系意向导师，附上你的研究计划和代表性成果。';
  return '收到你的问题："'+q+'"。作为国安学术助手，我可以帮你：①选题评测与建议②文献检索与管理③论文写作指导④考博导师信息查询⑤研究笔记整理。请在左侧导航中选择对应模块，或继续提问。';
}

// ===== 设置（含数据导入导出、周报生成）=====
function renderSettings(){
  const themeBtns=THEMES.map(t=>{
    const colors=THEME_COLORS[t];
    return '<div class="theme-btn '+(data.settings.theme===t?'active':'')+'" data-theme="'+t+'" onclick="applyTheme(\''+t+'\')"><div class="theme-preview"><span style="background:'+colors[0]+'"></span><span style="background:'+colors[1]+'"></span><span style="background:'+colors[2]+'"></span></div><div class="theme-name">'+THEME_NAMES[t]+'</div></div>';
  }).join('');
  document.getElementById('mainContent').innerHTML='<div class="page-header"><h1>⚙️ 设置</h1><p>主题配色 · 数据管理 · 周报生成 · 访问密钥</p></div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">🎨</span>主题配色 <span style="font-size:.78rem;color:var(--text-mute);font-weight:400;margin-left:8px;">共 '+THEMES.length+' 套 · 当前：'+THEME_NAMES[data.settings.theme]+'</span></div><div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;"><label style="font-size:.85rem;display:flex;align-items:center;gap:6px;"><input type="checkbox" '+(data.settings.autoRotate?'checked':'')+' onchange="data.settings.autoRotate=this.checked;saveData();" style="width:16px;height:16px;"> 自动轮换</label><select id="rotateDays" onchange="data.settings.rotateDays=parseInt(this.value);saveData();" style="padding:6px 10px;border:1px solid var(--line);border-radius:6px;"><option value="3" '+(data.settings.rotateDays===3?'selected':'')+'>每3天</option><option value="7" '+(data.settings.rotateDays===7?'selected':'')+'>每7天</option><option value="14" '+(data.settings.rotateDays===14?'selected':'')+'>每14天</option><option value="30" '+(data.settings.rotateDays===30?'selected':'')+'>每月</option></select></div><div class="theme-grid">'+themeBtns+'</div></div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">💾</span>数据管理</div><p style="font-size:.85rem;color:var(--text-soft);margin-bottom:12px;">当前模式：<strong>'+(apiMode?'☁️ 云端同步（Supabase）':'💻 本地存储（localStorage）')+'</strong>。'+(apiMode?'数据已同步至云端数据库，换设备登录后自动恢复。':'所有数据存储在浏览器本地，导出备份可防止清除浏览器数据后丢失。支持从JSON备份文件恢复数据。')+'</p><div style="display:flex;gap:10px;flex-wrap:wrap;"><button class="add-btn" onclick="exportData()">📤 导出全部数据备份</button><button class="add-btn ghost" onclick="document.getElementById(\'importInput\').click()">📥 导入备份文件</button><button class="del-btn" onclick="clearAllData()" style="padding:10px 20px;font-size:.9rem;">🗑 清空全部数据</button><button class="add-btn" style="background:linear-gradient(135deg,var(--primary),var(--primary-deep));font-weight:700;" onclick="generateWeeklyReport()">📰 生成国安研究周报</button>'+(apiMode?'<button class="add-btn ghost" onclick="logout()" style="padding:10px 20px;font-size:.9rem;">🚪 退出登录</button>':'')+'<input type="file" id="importInput" accept=".json" style="display:none;" onchange="importData(this.files[0])"></div></div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">🔐</span>访问密钥</div><div class="form-group"><label>修改登录密钥</label><input id="newKey" type="password" placeholder="输入新的访问密钥" value="'+esc(data.settings.accessKey||'')+'"></div><button class="add-btn" onclick="saveKey()">保存密钥</button></div>'
    +'<div class="card"><div class="card-title"><span class="title-icon">🔒</span>隐私与数据说明</div><p style="font-size:.85rem;color:var(--text-soft);line-height:1.8;">本工作台所有数据均存储在您当前浏览器的本地存储（localStorage）中，<strong>不会上传到任何服务器</strong>。清除浏览器数据或更换设备后数据将丢失，请定期导出备份。PDF元数据提取在本地浏览器完成，文件内容不会上传。</p></div>';
}
function exportData(){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='国安学术工作台备份_'+fmtDate(new Date())+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('备份已导出');
}
function importData(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const imported=JSON.parse(e.target.result);
      if(imported&&typeof imported==='object'){
        data={...data,...imported,settings:{...data.settings,...(imported.settings||{})}};
        saveData();applyTheme(data.settings.theme);
        toast('数据已导入，共'+(data.paperTasks.length+data.topics.length+data.refs.length+data.materials.length+data.notes.length)+'条记录');
        renderSettings();
      }else{toast('文件格式不正确');}
    }catch(err){toast('导入失败：文件格式错误');}
  };
  reader.readAsText(file);
}
function clearAllData(){
  if(confirm('确定要清空全部数据吗？此操作不可恢复，建议先导出备份。')){
    data={projects:[],topics:[],refs:[],articles:[],materials:[],notes:[],schedule:[],paperTasks:[],topicCards:[],settings:{theme:'A',autoRotate:false,rotateDays:7,email:'',accessKey:data.settings.accessKey||'guoan2026'},chatMessages:[],privacyAccepted:true};
    saveData();applyTheme('A');
    toast('数据已清空');renderSettings();
  }
}
function saveKey(){
  const key=document.getElementById('newKey').value.trim();
  data.settings.accessKey=key||'guoan2026';
  saveData();
  toast('访问密钥已保存');
}

// ===== 国安研究周报生成 =====
function generateWeeklyReport(){
  const now=new Date();
  const weekAgo=new Date(now.getTime()-7*24*60*60*1000);
  const weekStr=fmtDate(weekAgo)+' 至 '+fmtDate(now);
  const newTopics=data.topics.filter(t=>t.date&&t.date>=fmtDate(weekAgo));
  const newRefs=data.refs.filter(r=>r.uploadDate&&r.uploadDate>=fmtDate(weekAgo));
  const newArticles=data.articles.filter(a=>a.date&&a.date>=fmtDate(weekAgo));
  const newNotes=data.notes.filter(n=>n.date&&n.date>=fmtDate(weekAgo));
  const reportHtml='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>国安研究周报</title><style>body{font-family:"SimSun",serif;line-height:1.8;}h1{font-size:20pt;text-align:center;color:#1A3A8C;}h2{font-size:14pt;color:#333;border-bottom:2px solid #1A3A8C;padding-bottom:4px;}h3{font-size:12pt;color:#555;}.meta{color:#666;font-size:10pt;text-align:center;margin-bottom:20px;}.item{margin-bottom:8px;font-size:11pt;}.stat{display:inline-block;margin:0 20px 10px 0;font-size:11pt;}.stat b{font-size:16pt;color:#1A3A8C;}</style></head><body><h1>国安研究周报</h1><div class="meta">周期：'+weekStr+' · 生成时间：'+fmtDate(now)+' · 国安学术工作台自动生成</div><h2>📊 本周概览</h2><div><span class="stat"><b>'+newTopics.length+'</b> 新增选题</span><span class="stat"><b>'+newRefs.length+'</b> 新增文献</span><span class="stat"><b>'+newArticles.length+'</b> 好文剖析</span><span class="stat"><b>'+newNotes.length+'</b> 研究笔记</span><span class="stat"><b>'+data.materials.length+'</b> 素材库总量</span></div>'
    +(newTopics.length?'<h2>🔍 本周选题</h2>'+newTopics.map(t=>'<div class="item"><strong>'+esc(t.title)+'</strong>（AI评分'+calcScore(t)+'/120）<br><span style="color:#666;font-size:10pt;">'+esc(t.question||'')+'</span></div>').join(''):'')
    +(newRefs.length?'<h2>📝 本周文献</h2>'+newRefs.map(r=>'<div class="item"><strong>'+esc(r.title)+'</strong>'+(r.extracted?' <span style="color:#2D8672;font-size:9pt;">[已自动剖析]</span>':'')+'<br><span style="color:#666;font-size:10pt;">'+esc(r.author||'')+' · '+esc(r.source||'')+' · '+(r.year||'')+'</span></div>').join(''):'')
    +(newArticles.length?'<h2>📚 本周好文剖析</h2>'+newArticles.map(a=>'<div class="item"><strong>'+esc(a.title)+'</strong><br><span style="color:#666;font-size:10pt;">'+esc(a.author||'')+' · '+esc(a.journal||'')+'</span>'+(a.coreArg?'<br><span style="font-size:10pt;">核心论点：'+esc(a.coreArg.substring(0,80))+'</span>':'')+'</div>').join(''):'')
    +(data.materials.length?'<h2>✍️ 素材库精选（最近20条）</h2>'+data.materials.slice(0,20).map(m=>'<div class="item" style="font-size:10pt;"><span style="color:#1A3A8C;">['+esc(m.category||'未分类')+']</span> '+esc(m.content.substring(0,100))+(m.content.length>100?'...':'')+'</div>').join(''):'')
    +'<h2>📌 下周建议</h2><div class="item" style="font-size:11pt;line-height:2;">'+(newTopics.length<2?'• 建议新增至少2个选题并进行AI评测，保持选题储备<br>':'')+(newRefs.length<3?'• 建议本周精读至少3篇核心期刊文献<br>':'')+(data.materials.length<30?'• 素材库尚在积累期，好文剖析中的金句/理论/政策可一键存入<br>':'')+'• 持续关注国家安全学核心期刊最新发文<br>• 定期导出数据备份，防止浏览器数据丢失</div>'
    +'</body></html>';
  downloadWord(reportHtml,'国安研究周报_'+fmtDate(now)+'.doc');
  toast('周报已生成并下载');
}

// ===== Word导出工具 =====
function downloadWord(htmlContent,filename){
  const blob=new Blob(['\ufeff',htmlContent],{type:'application/msword'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== 内置文献库 =====
const LITERATURE_DB=[
{title:"总体国家安全观研究的知识图谱与热点演进",authors:"张洁,王义桅",journal:"国际安全研究",year:"2025",keywords:"总体国家安全观,知识图谱,研究热点,CiteSpace",summary:"运用CiteSpace对2014-2024年总体国家安全观研究文献进行知识图谱分析，识别研究热点聚类与演进脉络。",writing:"文献计量类：数据来源→检索策略→知识图谱→热点聚类→演进趋势→研究展望。"},
{title:"非传统安全威胁的协同治理机制研究",authors:"余潇枫,李佳",journal:"世界经济与政治",year:"2025",keywords:"非传统安全,协同治理,机制设计",summary:"从非传统安全的跨界性特征出发，构建政府-市场-社会多元主体协同治理机制。",writing:"机制设计类：问题特征→现有模式困境→理论框架→机制构建→运行路径。"},
{title:"海洋强国建设中的海上通道安全保障",authors:"王义桅",journal:"太平洋学报",year:"2025",keywords:"海洋安全,海上通道,能源安全",summary:"分析中国海上通道的安全风险，提出从海军力量、外交布局、国际合作三维度保障通道安全。",writing:"战略分析类：风险评估→战略目标→实施路径。"},
{title:"数据安全治理的制度逻辑与中国路径",authors:"陈晰,张新宝",journal:"中国法学",year:"2025",keywords:"数据安全,数据治理,个人信息保护",summary:"从数据安全法与个人信息保护法的衔接出发，提出中国特色数据治理路径。",writing:"法律分析类：立法背景→制度逻辑→比较法借鉴→中国路径。"},
{title:"供应链安全与大国竞争：理论框架与实证分析",authors:"钟飞腾",journal:"世界经济与政治",year:"2025",keywords:"供应链安全,大国竞争,经济安全",summary:"构建供应链安全的理论分析框架，实证分析中美供应链脱钩的影响与中国应对策略。",writing:"理论+实证类：理论框架构建→实证检验→政策建议。"},
{title:"人工智能安全治理的国际比较与中国方案",authors:"李仁涵,曾大军",journal:"中国科学院院刊",year:"2025",keywords:"人工智能安全,AI治理,科技安全",summary:"比较美欧AI安全治理模式，分析中国AI安全治理的制度优势与改进方向。",writing:"比较研究类：各国模式梳理→比较分析→中国方案。"},
{title:"对象、中介与目标：基于总体国家安全观的国家安全学范畴探讨",authors:"程同顺,唐康",journal:"国际安全研究",year:"2025",keywords:"国家安全学,范畴,总体国家安全观",summary:"构建对象—中介—目标三元范畴框架，论证国家安全学的研究对象是国家利益受损的可能性。",writing:"理论建构类：问题提出→理论资源→范畴框架→分论论证→结论启示。"},
{title:"国家安全学一级学科建设的进展与思考",authors:"马振超",journal:"国家安全研究",year:"2024",keywords:"国家安全学,学科建设,人才培养",summary:"梳理国家安全学一级学科设立以来的建设进展，分析学科定位、人才培养等方面的问题。",writing:"学科建设类：建设进展→问题分析→改进方向。"},
{title:"网络空间主权与全球互联网治理",authors:"黄日涵,张华",journal:"现代国际关系",year:"2025",keywords:"网络安全,网络主权,全球治理",summary:"从网络空间主权原则出发，分析全球互联网治理的博弈格局，提出中国参与治理的策略。",writing:"治理研究类：原则阐释→格局分析→策略建议。"},
{title:"边疆治理与国家安全的互动逻辑",authors:"周平",journal:"政治学研究",year:"2025",keywords:"边疆安全,边疆治理,民族地区",summary:"分析边疆治理与国家安全的双向互动关系，提出边疆治理体系现代化的路径。",writing:"互动分析类：概念界定→互动机制→案例分析→路径设计。"}
];

// ===== 每日好文 =====
const DAILY_ARTICLE={
title:"对象、中介与目标：基于总体国家安全观的国家安全学范畴探讨",
authors:"程同顺, 唐康",journal:"国际安全研究",year:"2025",issue:"4",pages:"3-20",
url:"http://gjaqyj.cnjournals.com/gjaqyj/ch/reader/view_abstract.aspx?file_no=20250401&flag=1",
detailedFlow:[
{step:"问题提出",detail:"国家安全学一级学科设立后，核心范畴体系尚未统一，学界对'研究对象是什么'存在分歧。"},
{step:"理论资源梳理",detail:"系统梳理三类理论资源：①总体国家安全观的规范文本；②西方安全化理论；③哲学范畴论。"},
{step:"核心框架构建",detail:"提出'对象—中介—目标'三元范畴框架：对象回答'安全什么'，中介回答'如何安全'，目标回答'为谁安全'。"},
{step:"对象范畴论证",detail:"论证国家安全学的研究对象是'国家利益受损的可能性'。"},
{step:"中介范畴论证",detail:"论证安全化行为与制度安排是连接威胁认知与治理实践的关键中介。"},
{step:"目标范畴论证",detail:"论证国家安全的目标是'人的安全与国家存续的统一'。"},
{step:"结论与学科启示",detail:"三元范畴框架为国家安全学学科建设提供统一的概念基础。"}
],
conceptMap:{layers:[
{label:"研究起点",nodes:[{text:"学科建制背景",type:"normal"},{text:"范畴体系混乱",type:"accent"}]},
{label:"理论资源",nodes:[{text:"总体国家安全观",type:"normal"},{text:"安全化理论",type:"normal"},{text:"哲学范畴论",type:"normal"}]},
{label:"核心框架",nodes:[{text:"对象",type:"accent"},{text:"中介",type:"accent"},{text:"目标",type:"accent"}]},
{label:"论证推进",nodes:[{text:"对象=利益受损可能性",type:"normal"},{text:"中介=安全化行为制度",type:"normal"},{text:"目标=人的安全+存续",type:"normal"}]}
]},
quotes:[
"国家安全学的研究对象是国家利益受损的可能性，而非既成的安全或不安全状态。",
"安全化不是单向过程，而是认知—制度—实践的循环。",
"国家安全的目标是人的安全与国家存续的统一。"
]
};

// ===== 默认考博数据（兜底）=====
const DEFAULT_PHD_DB=[
{school:"北京大学",college:"国际关系学院 / 国家安全学系",degree:"法学博士 · 国家安全学(140200)",direction:"国家安全思想与理论、国家安全战略、国际安全",url:"https://www.sis.pku.edu.cn/",supervisors:[
{name:"于铁军",title:"教授/系主任",direction:"国际安全与战略、东亚国际关系、中国外交与国防政策",url:"https://www.sis.pku.edu.cn/teachers/yutiejun/",repWorks:[{title:"东亚安全合作与中国的战略选择",journal:"国际政治研究",year:"2023"}]},
{name:"庞珣",title:"教授",direction:"全球风险政治、外交决策、科技经济外交与安全",url:"https://www.sis.pku.edu.cn/teachers/pangxun/",repWorks:[{title:"全球风险政治与国际安全治理",journal:"世界经济与政治",year:"2024"}]},
{name:"王缉思",title:"博雅讲席教授",direction:"美国外交、中国外交、亚太安全",url:"https://www.sis.pku.edu.cn/teachers/wangjisi/"},
{name:"祁昊天",title:"助理教授/博导",direction:"安全战略与理论、军事战略与技术、美军研究",url:"https://www.sis.pku.edu.cn/teachers/qihaotian/"}
]},
{school:"清华大学",college:"社会科学学院 / 国际关系学系",degree:"法学博士 · 政治学",direction:"国际安全、军控、中美关系、全球治理",url:"https://www.sss.tsinghua.edu.cn/",supervisors:[
{name:"刘丰",title:"教授/博导",direction:"国际关系理论、国际安全、东亚国际关系",url:"https://www.sss.tsinghua.edu.cn/info/1466/8079.htm",repWorks:[{title:"国际安全秩序的转型与中国的战略选择",journal:"世界经济与政治",year:"2023"}]},
{name:"李彬",title:"教授/博导",direction:"国际安全、军备控制、出口管制、中美核关系",url:"https://www.sss.tsinghua.edu.cn/info/1466/8073.htm",repWorks:[{title:"军备控制与国际安全",journal:"国际政治科学",year:"2024"}]},
{name:"吴日强",title:"副教授/博导",direction:"军备控制、太空安全、中美战略稳定性",url:"https://www.sss.tsinghua.edu.cn/info/1466/8068.htm"}
]},
{school:"复旦大学",college:"国际关系与公共事务学院",degree:"法学博士 · 国家安全学",direction:"国家安全理论、国际安全战略、网络安全",url:"https://sirpa.fudan.edu.cn/",supervisors:[
{name:"沈逸",title:"教授/博导",direction:"信息技术与国际安全、国家信息安全战略、大国关系",url:"https://faculty.fudan.edu.cn/shenyi/",repWorks:[{title:"网络空间安全与大国博弈",journal:"信息安全与通信保密",year:"2023"}]},
{name:"唐世平",title:"教授/博导",direction:"国际政治理论、地区安全、中国安全战略",url:"https://faculty.fudan.edu.cn/tangshiping/",repWorks:[{title:"社会演化范式与国际关系理论",journal:"国际政治科学",year:"2022"}]},
{name:"陈拯",title:"教授/博导",direction:"国际关系理论、国际安全、全球治理",url:"https://faculty.fudan.edu.cn/chenzhengir/"}
]},
{school:"中国人民大学",college:"国际关系学院 / 国家安全学系",degree:"法学博士 · 国家安全学",direction:"国家安全思想与理论、战略、治理",url:"http://sis.ruc.edu.cn/",supervisors:[
{name:"左希迎",title:"教授/系主任",direction:"国家安全战略、中国外交",url:"http://sis.ruc.edu.cn/"},
{name:"金灿荣",title:"教授/副院长",direction:"美国研究、大国关系、国际能源战略"}
]},
{school:"大连海事大学",college:"公共管理与人文学院",degree:"法学博士 · 国家安全学(140200)",direction:"国家安全理论、国家安全管理、国家海洋安全",url:"https://hums.dlmu.edu.cn/",supervisors:[
{name:"刘家国",title:"教授/博导",direction:"国家安全与应急管理、物流供应链风险",email:"liujg@dlmu.edu.cn",url:"https://hg.dlmu.edu.cn/"},
{name:"李振福",title:"二级教授/博导",direction:"国家海洋安全、北极治理、航线安全",url:"https://jt.dlmu.edu.cn/"}
]}
];

// ===== 初始化 =====
async function init(){
  loadData();
  applyTheme(data.settings.theme);
  checkAutoRotate();
  renderNav();
  await loadPhdData();
  // 如果有token，尝试API模式
  if(token){
    try{
      const testRes=await apiGet('projects');
      if(testRes!==null){
        apiMode=true;
        await syncFromAPI();
      }else{
        apiMode=false;
        token='';localStorage.removeItem('guoan_token');
      }
    }catch(e){apiMode=false;}
  }
  // 修复：确保projects有默认项目
  if(!data.projects||!data.projects.length){
    data.projects=[{id:uid(),name:'默认项目',createdAt:fmtDate(new Date())}];
    currentProjectId=data.projects[0].id;
    saveData();
  }else if(!currentProjectId){
    currentProjectId=data.projects[0].id;
  }
  render();
}

// 启动
if(!checkLogin()){
  // 显示登录页
}else{
  init();
}

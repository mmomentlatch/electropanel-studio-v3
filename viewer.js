(async function(){
  "use strict";
  const en={title:"Project for review",level:"Floor",board:"Panel",points:"Points",select:"Select a point to see its room, circuit and height.",error:"This link is unavailable or has been revoked.",print:"Print",source:"Fed from",circuit:"Circuit",height:"Height",date:"Revision",empty:"No points on this floor."};
  const uk={title:"Проєкт на погодження",level:"Поверх",board:"Щит",points:"Точки",select:"Виберіть точку, щоб побачити кімнату, коло й висоту.",error:"Посилання недоступне або відкликане.",print:"Друк",source:"Живлення від",circuit:"Коло",height:"Висота",date:"Версія",empty:"На поверсі ще немає точок."};
  const ru={title:"Проект на согласование",level:"Этаж",board:"Щит",points:"Точки",select:"Выберите точку, чтобы увидеть комнату, цепь и высоту.",error:"Ссылка недоступна или отозвана.",print:"Печать",source:"Питание от",circuit:"Цепь",height:"Высота",date:"Версия",empty:"На этаже ещё нет точек."};
  const lang=new URLSearchParams(location.search).get("lang")||navigator.language.slice(0,2), t=({uk,ru,en})[lang]||en;
  document.documentElement.lang=({uk,ru,en})[lang]?lang:"en";
  const $=s=>document.querySelector(s), node=(tag,value)=>{const n=document.createElement(tag);n.textContent=value??"";return n;};
  const svg=(tag,attrs,value)=>{const n=document.createElementNS("http://www.w3.org/2000/svg",tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(value!=null)n.textContent=value;return n;};
  $("#stamp").textContent=t.title;$("#print").textContent=t.print;$("#print").onclick=()=>print();
  try{
    const frag=location.hash.slice(1);let encoded;
    if(frag.startsWith("s="))encoded=frag.slice(2);
    else{const id=new URLSearchParams(location.search).get("id");if(!/^[a-zA-Z0-9_-]{22,40}$/.test(id||""))throw Error();const res=await fetch(`api/shares/${id}`,{cache:"no-store",credentials:"omit"});if(!res.ok)throw Error();encoded=(await res.json()).payload;}
    const data=await PanelSnapshotCodec.unpack(encoded);if(data.v!==1||!Array.isArray(data.levels)||data.levels.length>16||!Array.isArray(data.rails))throw Error();
    $("#title").textContent=data.title;document.title=data.title;$("#revision").textContent=`${t.date} · ${new Date(data.date).toLocaleString(document.documentElement.lang)}`;
    $("#boardTitle").textContent=t.board;$("#floorTitle").textContent=t.level;$("#pointsTitle").textContent=t.points;
    for(const [i,rail] of data.rails.entries()){
      const row=node("div");row.className="rail";row.append(node("strong",`DIN ${i+1}`));
      for(const item of rail.items)row.append(node("span",`${item.label} · ${item.name}`));$("#rails").append(row);
    }
    const pick=$("#floor");pick.replaceChildren();
    data.levels.forEach((l,i)=>{const o=node("option",l.name);o.value=i;pick.append(o);});
    const colors={panel:"#253949",socket:"#1b769e",light:"#a36a05",switch:"#7258a3",junction:"#34866c",equipment:"#b34b76"};
    function draw(){
      const l=data.levels[Number(pick.value)||0], map=$("#map"), list=$("#list"), detail=$("#detail");map.replaceChildren();list.replaceChildren();detail.textContent=t.select;
      if(!l||!l.rooms.length){detail.textContent=t.empty;return;}
      const {x,y,w,h}=l.bounds;map.setAttribute("viewBox",`${x-.65} ${y-.65} ${w+1.3} ${h+1.3}`);
      for(const r of l.rooms){
        const path=r.rings.map(ring=>ring.map((v,i)=>(i?"L":"M")+Number(v[0])+" "+Number(v[1])).join(" ")+" Z").join(" ");
        map.append(svg("path",{d:path,fill:"#ecf3ef","fill-rule":"evenodd",stroke:"#50636a","stroke-width":.065}),svg("text",{x:r.x,y:r.y,"text-anchor":"middle","font-size":.18,fill:"#4d6369"},r.name));
      }
      const show=(p)=>{detail.textContent=`${p.label} · ${p.name} — ${p.room} · ${t.height} ${p.h} m · ${t.circuit} ${p.circuit||"—"} · ${t.source} ${p.source||"—"}`;for(const c of map.querySelectorAll("circle"))c.setAttribute("r",c.dataset.id===p.id?".17":".1");};
      for(const p of l.points){
        const c=svg("circle",{cx:p.x,cy:p.y,r:.1,fill:colors[p.type]||"#333",stroke:"white","stroke-width":.03,tabindex:0,role:"button","aria-label":`${p.label} ${p.name}`});
        c.dataset.id=p.id;c.addEventListener("click",()=>show(p));c.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();show(p);}});map.append(c);
        const b=node("button",`${p.label} · ${p.name}`);b.onclick=()=>show(p);list.append(b);
      }
      if(!l.points.length)detail.textContent=t.empty;
    }
    pick.onchange=draw;draw();$("#content").hidden=false;
  }catch{ $("#title").textContent=t.error;$("#content").hidden=true;$("#print").hidden=true;}
})();

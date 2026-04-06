import{v as j,h as v,N as V,D as Y,j as e,X}from"./index-Dhgjik_F.js";import{S as L}from"./star-BZ476rg5.js";import{T as J}from"./tag-_EvVUvoJ.js";import{C as T}from"./clock-o03yH0Xl.js";import{E as K}from"./eye-OG9KWTTu.js";import{A as Q}from"./arrow-left-dt7dH3Zt.js";const Z=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],ee=j("download",Z);const te=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]],oe=j("image",te);const ie=[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]],re=j("lightbulb",ie);const ae=[["path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",key:"1cjeqo"}],["path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",key:"19qd67"}]],U=j("link",ae);const ne=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],se=j("plus",ne);const le=[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],de=j("radio",le);const pe=[["path",{d:"M21 5H3",key:"1fi0y6"}],["path",{d:"M15 12H3",key:"6jk70r"}],["path",{d:"M17 19H3",key:"z6ezky"}]],M=j("text-align-start",pe);const ce=[["path",{d:"M12 4v16",key:"1654pz"}],["path",{d:"M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2",key:"e0r10z"}],["path",{d:"M9 20h6",key:"s66wpe"}]],ge=j("type",ce);const xe=[["path",{d:"M12 3v12",key:"1x0j5s"}],["path",{d:"m17 8-5-5-5 5",key:"7q97r8"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}]],R=j("upload",xe),a={blue:"#1950DF",gold:"#FEAD17",red:"#FA2E1A",green:"#0FBC87"},$=[{id:"hero",icon:L,label:"Hero Story",max:1,color:a.blue},{id:"breaking",icon:de,label:"Breaking News",max:5,color:a.red},{id:"topStories",icon:V,label:"Top Stories",max:3,color:a.blue},{id:"moreBharat",icon:Y,label:"More From Bharat",max:4,color:a.gold},{id:"explainers",icon:re,label:"Explainers",max:3,color:a.green}],he=["Politics","Economy","Technology","Sports","Health","Security","Diplomacy","Infrastructure","Education","Markets","Energy","Entertainment","Startups","Cricket","Space"],N={Politics:"1532375810709-75b1da00537c",Economy:"1611974789855-9c2a0a7236a3",Technology:"1526374965328-7f61d4dc18c5",Sports:"1540747913346-19e32dc3e97e",Health:"1631217868264-e5b90bb7e133",Security:"1558618666-fcd25c85cd64",Diplomacy:"1504711434969-e33886168f5c",Infrastructure:"1508739773434-c26b3d09e071",Education:"1570126618953-d437176e8c79",Markets:"1611974789855-9c2a0a7236a3",Energy:"1590283603385-17ffb3a7f29f",Entertainment:"1516251193007-45ef944ab0c6",Startups:"1526374965328-7f61d4dc18c5",Default:"1504711434969-e33886168f5c",Cricket:"1540747913346-19e32dc3e97e",Space:"1457364887197-9150188c107b"},W={Politics:"#FA2E1A",Economy:"#0FBC87",Technology:"#1950DF",Sports:"#1950DF",Health:"#0FBC87",Security:"#FA2E1A",Diplomacy:"#1950DF",Infrastructure:"#FEAD17",Education:"#808080",Markets:"#0FBC87",Energy:"#0FBC87",Entertainment:"#FEAD17",Startups:"#1950DF",Cricket:"#1950DF",Space:"#1950DF",Default:"#1950DF"},I=(i,d=600)=>`https://images.unsplash.com/photo-${N[i]||N.Default}?w=${d}&q=80&fit=crop`,n=i=>String(i||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),F=i=>W[i]||W.Default,C=(i="breaking")=>({id:Date.now()+Math.random(),section:i,title:"",summary:"",heroBody:"",category:"Economy",date:new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"}),readTime:"3 min read",url:"",imageUrl:"",imageBase64:""}),D=(i,d=600)=>i.imageBase64?i.imageBase64:i.imageUrl?i.imageUrl:I(i.category,d);function fe(i,d){const g={hero:[],breaking:[],topStories:[],moreBharat:[],explainers:[]};i.forEach(o=>{o.title.trim()&&g[o.section]?.push(o)});const c=g.hero?.[0],m=g.breaking||[],S=g.topStories||[],b=g.moreBharat||[],k=g.explainers||[],f=m.map(o=>`
    <tr><td style="padding:12px 0;border-bottom:1px solid #e5e3de;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="72" valign="top" style="padding-right:14px;">
          <img src="${D(o,200)}" width="72" height="30" style="display:block;border-radius:2px;object-fit:cover;" alt="${n(o.category)}"/>
        </td>
        <td valign="top">
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${F(o.category)};margin-bottom:3px;">${n(o.category)}</div>
          <div style="font-size:12px;font-weight:600;color:#1a1a1a;line-height:1.45;margin-bottom:3px;">${n(o.title)}</div>
          <div style="font-size:9px;color:#6b6b6b;">${n(o.date)} &nbsp;·&nbsp; ${n(o.readTime)}</div>
        </td>
      </tr></table>
    </td></tr>`).join(""),p=S.map(o=>`
    <tr><td style="padding:18px 0;border-bottom:1px solid #e5e3de;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="180" valign="top" style="padding-right:18px;">
          <img src="${D(o,400)}" width="180" height="120" style="display:block;border-radius:2px;object-fit:cover;" alt="${n(o.category)}"/>
        </td>
        <td valign="top">
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:${F(o.category)};margin-bottom:6px;">${n(o.category)}</div>
          <div style="font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.4;margin-bottom:6px;">${n(o.title)}</div>
          <div style="font-size:11px;color:#6b6b6b;line-height:1.7;margin-bottom:10px;">${n(o.summary)}</div>
          <a href="${o.url||"#"}" style="font-size:9px;font-weight:700;color:${F(o.category)};text-decoration:none;text-transform:uppercase;">Read More →</a>
        </td>
      </tr></table>
    </td></tr>`).join(""),y=[];for(let o=0;o<b.length;o+=2){const x=b.slice(o,o+2);y.push(`<tr><td style="padding:16px 0;border-bottom:1px solid #e5e3de;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${x.map(z=>`<td width="50%" valign="top" style="padding-right:10px;">
          <img src="${D(z,300)}" width="100%" height="100" style="display:block;border-radius:2px;object-fit:cover;margin-bottom:8px;" alt="${n(z.category)}"/>
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:${F(z.category)};margin-bottom:4px;">${n(z.category)}</div>
          <div style="font-size:12px;font-weight:700;color:#1a1a1a;line-height:1.4;margin-bottom:4px;">${n(z.title)}</div>
          <div style="font-size:10px;color:#6b6b6b;line-height:1.6;">${n(z.summary)}</div>
        </td>`).join("")}
      </tr></table>
    </td></tr>`)}const w=k.map((o,x)=>`
    <tr><td style="padding:14px 0;border-bottom:${x<k.length-1?"1px solid #1c1c1c":"none"};">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="28" valign="top"><div style="font-size:11px;font-weight:800;color:#FEAD17;">${String(x+1).padStart(2,"0")}</div></td>
        <td valign="top">
          <div style="font-size:12px;font-weight:600;color:#fff;line-height:1.45;margin-bottom:3px;">${n(o.title)}</div>
          <div style="font-size:10px;color:#555;line-height:1.6;margin-bottom:6px;">${n(o.summary)}</div>
          <span style="font-size:8px;font-weight:600;text-transform:uppercase;color:#0FBC87;border:1px solid #1e3d33;padding:2px 8px;border-radius:20px;">${n(o.readTime)}</span>
        </td>
      </tr></table>
    </td></tr>`).join("");return`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>News4Bharat — Issue #${n(d.issueNum)}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#ece9e3;font-family:'Poppins',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;box-shadow:0 2px 40px rgba(0,0,0,0.10);">

  <!-- HEADER -->
  <tr><td style="padding:24px 36px 0;border-bottom:1px solid #e5e3de;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        ${d.logoUrl?`<img src="${d.logoUrl}" alt="News4Bharat" style="height:48px;display:block;"/>`:`<div style="font-size:22px;font-weight:800;color:#0a0a0a;font-family:'Poppins',sans-serif;">News<span style="color:#1950DF;">4</span>Bharat</div>`}
      </td>
      <td align="right">
        <div style="font-size:9px;color:#6b6b6b;text-transform:uppercase;letter-spacing:1.5px;">Issue #${n(d.issueNum)}</div>
        <div style="font-size:11px;font-weight:600;color:#1a1a1a;margin-top:2px;">${n(d.weekDate)}</div>
      </td>
    </tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr>
      <td width="25%" height="3" style="background:#1950DF;"></td>
      <td width="25%" height="3" style="background:#FA2E1A;"></td>
      <td width="25%" height="3" style="background:#0FBC87;"></td>
      <td width="25%" height="3" style="background:#FEAD17;"></td>
    </tr></table>
  </td></tr>

  ${c?`<tr><td style="padding:32px 36px;border-bottom:1px solid #e5e3de;">
    <div style="margin-bottom:16px;">
      <span style="display:inline-block;width:7px;height:7px;background:#1950DF;border-radius:50%;margin-right:7px;vertical-align:middle;"></span>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#1950DF;">${n(c.category)}</span>
    </div>
    <img src="${D(c,800)}" width="100%" height="280" style="display:block;object-fit:cover;border-radius:2px;margin-bottom:20px;" alt="${n(c.category)}"/>
    <div style="font-family:'DM Serif Display',serif;font-size:28px;line-height:1.25;color:#0a0a0a;margin-bottom:12px;">${n(c.title)}</div>
    <div style="font-size:13px;color:#6b6b6b;line-height:1.8;margin-bottom:18px;">${n(c.heroBody||c.summary)}</div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><span style="font-size:10px;color:#aaa;">By <b style="color:#1a1a1a;">News4Bharat</b> · ${n(c.date)}</span></td>
      <td align="right"><a href="${c.url||"#"}" style="display:inline-block;background:#1950DF;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;padding:9px 20px;text-decoration:none;border-radius:2px;">Read Full Story</a></td>
    </tr></table>
  </td></tr>`:""}

  ${m.length?`<tr><td style="padding:24px 36px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="24" height="3" style="background:#FA2E1A;border-radius:2px;"></td>
      <td style="padding-left:12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#6b6b6b;">Breaking News</td>
      <td style="border-top:1px solid #e5e3de;"></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#F7F6F3;border-top:2px solid #FA2E1A;padding:0 36px 4px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:16px 0 14px;border-bottom:1px solid #e5e3de;">
        <span style="background:#FA2E1A;color:#fff;font-size:9px;font-weight:800;text-transform:uppercase;padding:4px 10px;border-radius:2px;">Breaking</span>
        <span style="font-size:12px;font-weight:700;color:#1a1a1a;margin-left:8px;">This Week's Headlines</span>
        <span style="float:right;font-size:9px;color:#6b6b6b;">${m.length} Stories</span>
      </td></tr>${f}
    </table>
  </td></tr>`:""}

  ${S.length?`<tr><td style="padding:24px 36px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="24" height="3" style="background:#1950DF;border-radius:2px;"></td>
      <td style="padding-left:12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#6b6b6b;">Top Stories</td>
      <td style="border-top:1px solid #e5e3de;"></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:0 36px 8px;"><table width="100%" cellpadding="0" cellspacing="0">${p}</table></td></tr>`:""}

  ${b.length?`<tr><td style="padding:24px 36px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="24" height="3" style="background:#FEAD17;border-radius:2px;"></td>
      <td style="padding-left:12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#6b6b6b;">More From Bharat</td>
      <td style="border-top:1px solid #e5e3de;"></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:0 36px 8px;"><table width="100%" cellpadding="0" cellspacing="0">${y.join("")}</table></td></tr>`:""}

  ${k.length?`<tr><td style="background:#0a0a0a;padding:28px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:20px;">
        <span style="background:#FEAD17;color:#0a0a0a;font-size:9px;font-weight:800;text-transform:uppercase;padding:5px 12px;">Explainers</span>
        <span style="font-size:10px;color:#555;margin-left:10px;">Understand the story behind the story</span>
      </td></tr>${w}
    </table>
  </td></tr>`:""}

  <!-- FOOTER -->
  <tr><td style="background:#F7F6F3;padding:28px 36px;border-top:1px solid #e5e3de;text-align:center;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding-bottom:14px;">
        ${d.logoUrl?`<img src="${d.logoUrl}" alt="News4Bharat" style="height:36px;display:inline-block;"/>`:`<span style="font-size:16px;font-weight:800;color:#0a0a0a;font-family:'Poppins',sans-serif;">News<span style="color:#1950DF;">4</span>Bharat</span>`}
      </td></tr>
      <tr><td align="center" style="padding-bottom:16px;">
        <a href="#" style="font-size:9px;color:#6b6b6b;text-decoration:none;text-transform:uppercase;margin:0 10px;">Home</a>
        <a href="#" style="font-size:9px;color:#6b6b6b;text-decoration:none;text-transform:uppercase;margin:0 10px;">Politics</a>
        <a href="#" style="font-size:9px;color:#6b6b6b;text-decoration:none;text-transform:uppercase;margin:0 10px;">Economy</a>
        <a href="#" style="font-size:9px;color:#6b6b6b;text-decoration:none;text-transform:uppercase;margin:0 10px;">Sports</a>
        <a href="#" style="font-size:9px;color:#6b6b6b;text-decoration:none;text-transform:uppercase;margin:0 10px;">Unsubscribe</a>
      </td></tr>
      <tr><td><div style="height:1px;background:#e5e3de;margin:0 0 16px;"></div></td></tr>
      <tr><td align="center" style="font-size:9px;color:#bbb;line-height:1.8;">
        © ${new Date().getFullYear()} News4Bharat Media Pvt. Ltd. All rights reserved.<br/>
        <a href="#" style="color:#aaa;">news4bharat.com</a> &nbsp;·&nbsp; <a href="#" style="color:#aaa;">Unsubscribe</a>
      </td></tr>
    </table>
  </td></tr>

</table></td></tr></table></body></html>`}function me({article:i,onUpdate:d}){const g=v.useRef(),[c,m]=v.useState(i.imageBase64?"upload":i.imageUrl?"url":"auto"),S=p=>{const y=p.target.files?.[0];if(!y)return;const w=new FileReader;w.onload=o=>{d("imageBase64",o.target.result),d("imageUrl",""),m("upload")},w.readAsDataURL(y)},b=()=>{d("imageBase64",""),d("imageUrl",""),m("auto")},k=i.imageBase64||i.imageUrl||I(i.category,300),f=(p,y,w)=>e.jsxs("button",{onClick:()=>{m(p),p==="auto"&&b()},style:{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",border:`1px solid ${c===p?a.blue:"#ddd"}`,borderRadius:6,fontSize:11,fontWeight:600,background:c===p?"#eff6ff":"#fff",color:c===p?a.blue:"#777",cursor:"pointer"},children:[e.jsx(y,{size:12}),w]},p);return e.jsxs("div",{children:[e.jsx("label",{style:{fontSize:10,fontWeight:700,color:"#888",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5},children:"Article Image"}),e.jsxs("div",{style:{display:"flex",gap:6,marginBottom:10},children:[f("auto",oe,"Auto"),f("url",U,"Image URL"),f("upload",R,"Upload")]}),c==="url"&&e.jsx("input",{style:{padding:"8px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12,width:"100%",outline:"none",marginBottom:8,fontFamily:"inherit"},value:i.imageUrl,onChange:p=>{d("imageUrl",p.target.value),d("imageBase64","")},placeholder:"https://example.com/image.jpg"}),c==="upload"&&e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("input",{ref:g,type:"file",accept:"image/*",style:{display:"none"},onChange:S}),e.jsxs("button",{onClick:()=>g.current?.click(),style:{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",border:"1px dashed #ccc",borderRadius:6,fontSize:12,fontWeight:600,color:"#777",background:"#fafafa",cursor:"pointer"},children:[e.jsx(R,{size:13})," Choose Image File"]}),i.imageBase64&&e.jsx("span",{style:{fontSize:11,color:a.green,marginTop:4,display:"block"},children:"Image uploaded!"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,marginTop:6},children:[e.jsx("img",{src:k,alt:"preview",style:{width:80,height:56,objectFit:"cover",borderRadius:4,border:"1px solid #e5e3de"},onError:p=>{p.target.src=I(i.category,300)}}),e.jsxs("div",{style:{fontSize:11,color:"#888"},children:[i.imageBase64?"Uploaded image":i.imageUrl?"Custom URL":"Auto category image",(i.imageBase64||i.imageUrl)&&e.jsx("button",{onClick:b,style:{marginLeft:8,fontSize:10,color:a.red,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"},children:"Reset"})]})]})]})}function we(){const[i,d]=v.useState(1),[g,c]=v.useState("001"),[m,S]=v.useState(new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})),[b,k]=v.useState(""),[f,p]=v.useState([{...C("hero"),id:1},{...C("breaking"),id:2},{...C("breaking"),id:3}]),[y,w]=v.useState(""),o=v.useRef(),x=(t,l,s)=>p(h=>h.map(r=>r.id===t?{...r,[l]:s}:r)),z=()=>p(t=>[...t,{...C("breaking")}]),P=t=>p(l=>l.filter(s=>s.id!==t)),B={};$.forEach(t=>B[t.id]=0),f.forEach(t=>{B[t.section]=(B[t.section]||0)+1});const H=t=>{const l=t.target.files?.[0];if(!l)return;const s=new FileReader;s.onload=h=>k(h.target.result),s.readAsDataURL(l)},_=()=>{w(fe(f,{issueNum:g,weekDate:m,logoUrl:b})),d(2)},O=()=>{const t=new Blob([y],{type:"text/html"}),l=document.createElement("a");l.href=URL.createObjectURL(t),l.download=`n4b-issue-${g}.html`,l.click()},A=f.some(t=>t.title.trim()),u={padding:"8px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12,width:"100%",outline:"none",fontFamily:"'Poppins', sans-serif"},E={background:"#fff",borderRadius:10,padding:20,border:"1px solid #e8e8e8",marginBottom:12},q=["Fill Articles","Preview & Download"];return e.jsxs("div",{style:{fontFamily:"'Poppins', sans-serif",minHeight:"100vh",background:"#f0f2f5",color:"#1a1a1a"},children:[e.jsx("div",{style:{background:"#fff",borderBottom:"1px solid #eee"},children:e.jsx("div",{style:{display:"flex",maxWidth:860,margin:"0 auto"},children:q.map((t,l)=>{const s=i===l+1,h=i>l+1;return e.jsxs("div",{style:{padding:"13px 24px",fontSize:12,fontWeight:600,flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,color:s?a.blue:h?a.green:"#bbb",borderBottom:s?`2px solid ${a.blue}`:h?`2px solid ${a.green}`:"2px solid transparent"},children:[e.jsx("span",{style:{width:20,height:20,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,background:h?a.green:s?a.blue:"#eee",color:h||s?"#fff":"#bbb",flexShrink:0},children:h?"✓":l+1}),t]},l)})})}),e.jsxs("div",{style:{maxWidth:860,margin:"0 auto",padding:"24px 16px 48px"},children:[i===1&&e.jsxs("div",{children:[e.jsxs("div",{style:E,children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16},children:[e.jsx("div",{style:{width:4,height:22,background:a.blue,borderRadius:2}}),e.jsx("div",{style:{fontSize:15,fontWeight:700},children:"Edition Setup"})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12,marginBottom:14},children:[e.jsxs("div",{children:[e.jsx("label",{style:{fontSize:10,fontWeight:700,color:"#888",display:"block",marginBottom:5,textTransform:"uppercase"},children:"Issue #"}),e.jsx("input",{style:u,value:g,onChange:t=>c(t.target.value),placeholder:"001"})]}),e.jsxs("div",{children:[e.jsx("label",{style:{fontSize:10,fontWeight:700,color:"#888",display:"block",marginBottom:5,textTransform:"uppercase"},children:"Week of"}),e.jsx("input",{style:u,value:m,onChange:t=>S(t.target.value),placeholder:"March 21, 2026"})]})]}),e.jsxs("div",{children:[e.jsx("label",{style:{fontSize:10,fontWeight:700,color:"#888",display:"block",marginBottom:6,textTransform:"uppercase"},children:"Newsletter Logo"}),e.jsx("input",{ref:o,type:"file",accept:"image/*",style:{display:"none"},onChange:H}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:[e.jsxs("button",{onClick:()=>o.current?.click(),style:{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",border:"1px dashed #ccc",borderRadius:6,fontSize:12,fontWeight:600,color:"#777",background:"#fafafa",cursor:"pointer"},children:[e.jsx(R,{size:13})," Upload Logo"]}),b&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("img",{src:b,alt:"logo preview",style:{height:36,objectFit:"contain",border:"1px solid #e5e3de",borderRadius:4,padding:4}}),e.jsx("button",{onClick:()=>k(""),style:{fontSize:10,color:a.red,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"},children:"Remove"})]})]})]})]}),e.jsx("div",{style:{...E,padding:"14px 20px"},children:e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:8},children:$.map(t=>{const l=B[t.id],s=l>=t.max,h=t.icon;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:20,fontSize:11,background:s?"#fff5f5":"#f6f9ff",border:`1px solid ${s?"#fecaca":"#dbeafe"}`},children:[e.jsx(h,{size:12,color:s?a.red:a.blue}),e.jsx("span",{style:{fontWeight:600,color:s?a.red:a.blue},children:t.label}),e.jsxs("span",{style:{borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:800,background:s?a.red:"#dbeafe",color:s?"#fff":a.blue},children:[l,"/",t.max]})]},t.id)})})}),f.map((t,l)=>{const s=$.find(r=>r.id===t.section),h=s?.icon||L;return e.jsxs("div",{style:{...E,borderLeft:`3px solid ${s?.color||"#ddd"}`},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx(h,{size:16,color:s?.color}),e.jsxs("span",{style:{fontSize:13,fontWeight:700,color:s?.color},children:["Article ",l+1]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("select",{value:t.section,onChange:r=>x(t.id,"section",r.target.value),style:{padding:"5px 8px",border:"1px solid #ddd",borderRadius:6,fontSize:11,fontWeight:600,background:"#fff",outline:"none",fontFamily:"'Poppins', sans-serif"},children:$.map(r=>e.jsx("option",{value:r.id,children:r.label},r.id))}),f.length>1&&e.jsx("button",{onClick:()=>P(t.id),style:{width:28,height:28,border:"1px solid #ddd",borderRadius:6,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(X,{size:13,color:"#ccc"})})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10},children:[e.jsxs("div",{children:[e.jsxs("label",{style:{fontSize:10,fontWeight:700,color:"#888",display:"flex",alignItems:"center",gap:4,marginBottom:4,textTransform:"uppercase"},children:[e.jsx(J,{size:10})," Category"]}),e.jsx("select",{value:t.category,onChange:r=>x(t.id,"category",r.target.value),style:{...u,background:"#fff"},children:he.map(r=>e.jsx("option",{value:r,children:r},r))})]}),e.jsxs("div",{children:[e.jsxs("label",{style:{fontSize:10,fontWeight:700,color:"#888",display:"flex",alignItems:"center",gap:4,marginBottom:4,textTransform:"uppercase"},children:[e.jsx(T,{size:10})," Date"]}),e.jsx("input",{style:u,value:t.date,onChange:r=>x(t.id,"date",r.target.value),placeholder:"Sat, 21 Mar"})]})]}),e.jsxs("div",{style:{marginBottom:10},children:[e.jsxs("label",{style:{fontSize:10,fontWeight:700,color:"#888",display:"flex",alignItems:"center",gap:4,marginBottom:4,textTransform:"uppercase"},children:[e.jsx(ge,{size:10})," Title"]}),e.jsx("input",{style:u,value:t.title,onChange:r=>x(t.id,"title",r.target.value),placeholder:"Punchy headline — max 12 words"})]}),e.jsxs("div",{style:{marginBottom:10},children:[e.jsxs("label",{style:{fontSize:10,fontWeight:700,color:"#888",display:"flex",alignItems:"center",gap:4,marginBottom:4,textTransform:"uppercase"},children:[e.jsx(M,{size:10})," Summary"]}),e.jsx("textarea",{style:{...u,height:72,resize:"vertical"},value:t.summary,onChange:r=>x(t.id,"summary",r.target.value),placeholder:"2-3 sentence summary..."})]}),t.section==="hero"&&e.jsxs("div",{style:{marginBottom:10},children:[e.jsxs("label",{style:{fontSize:10,fontWeight:700,color:"#888",display:"flex",alignItems:"center",gap:4,marginBottom:4,textTransform:"uppercase"},children:[e.jsx(M,{size:10})," Hero Body"]}),e.jsx("textarea",{style:{...u,height:80,resize:"vertical"},value:t.heroBody,onChange:r=>x(t.id,"heroBody",r.target.value),placeholder:"3-4 sentence lead paragraph..."})]}),e.jsx("div",{style:{marginBottom:10,padding:14,background:"#f9fafb",borderRadius:8,border:"1px solid #e8e8e8"},children:e.jsx(me,{article:t,onUpdate:(r,G)=>x(t.id,r,G)})}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:[e.jsxs("div",{children:[e.jsxs("label",{style:{fontSize:10,fontWeight:700,color:"#888",display:"flex",alignItems:"center",gap:4,marginBottom:4,textTransform:"uppercase"},children:[e.jsx(U,{size:10})," Article URL"]}),e.jsx("input",{style:u,value:t.url,onChange:r=>x(t.id,"url",r.target.value),placeholder:"https://..."})]}),e.jsxs("div",{children:[e.jsxs("label",{style:{fontSize:10,fontWeight:700,color:"#888",display:"flex",alignItems:"center",gap:4,marginBottom:4,textTransform:"uppercase"},children:[e.jsx(T,{size:10})," Read Time"]}),e.jsx("input",{style:u,value:t.readTime,onChange:r=>x(t.id,"readTime",r.target.value),placeholder:"3 min read"})]})]})]},t.id)}),e.jsxs("button",{onClick:z,style:{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 16px",background:"#fafafa",border:"1px dashed #ccc",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#777",width:"100%",marginBottom:12,fontFamily:"'Poppins', sans-serif"},children:[e.jsx(se,{size:14})," Add Another Article"]}),e.jsxs("button",{onClick:_,disabled:!A,style:{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:14,background:A?a.blue:"#ccc",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:A?"pointer":"not-allowed",width:"100%",fontFamily:"'Poppins', sans-serif"},children:[e.jsx(K,{size:16})," Preview Newsletter"]})]}),i===2&&e.jsxs("div",{children:[e.jsxs("div",{style:{background:"#fff",borderRadius:10,padding:"16px 20px",border:"1px solid #e8e8e8",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:15,fontWeight:700},children:"Newsletter Ready!"}),e.jsxs("div",{style:{fontSize:12,color:"#888",marginTop:1},children:["Issue #",g," · ",m," · ",f.filter(t=>t.title.trim()).length," articles"]})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsxs("button",{onClick:()=>d(1),style:{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"#f4f4f4",border:"1px solid #ddd",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Poppins', sans-serif"},children:[e.jsx(Q,{size:13})," Edit"]}),e.jsxs("button",{onClick:O,style:{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:a.green,color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Poppins', sans-serif"},children:[e.jsx(ee,{size:13})," Download HTML"]})]})]}),e.jsx("div",{style:{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"12px 16px",marginBottom:12,fontSize:12,color:"#92400e"},children:"Download karo → Gmail open karo → Compose → HTML content paste karo → Send!"}),e.jsxs("div",{style:{borderRadius:10,overflow:"hidden",border:"1px solid #ddd",boxShadow:"0 4px 24px rgba(0,0,0,.07)"},children:[e.jsxs("div",{style:{background:"#e8e8e8",padding:"10px 16px",display:"flex",alignItems:"center",gap:6},children:[["#FA2E1A","#FEAD17","#0FBC87"].map((t,l)=>e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:t}},l)),e.jsxs("div",{style:{flex:1,background:"#fff",borderRadius:4,padding:"3px 10px",fontSize:10,color:"#888",marginLeft:8},children:["newsletter preview — issue #",g]})]}),e.jsx("iframe",{srcDoc:y,style:{width:"100%",height:750,border:"none",display:"block"},title:"Newsletter Preview"})]})]})]})]})}export{we as default};

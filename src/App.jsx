// =====================================================================
//  PLACA APROVADO — App React conectado ao Supabase
//  SaaS de simulados DETRAN: login + trava de assinatura + gamificação
// =====================================================================
//
//  SETUP (quando estiver no PC):
//   1) npm create vite@latest placa-aprovado -- --template react
//   2) cd placa-aprovado && npm install @supabase/supabase-js
//   3) substitua src/App.jsx por este arquivo
//   4) crie um arquivo .env na raiz com:
//        VITE_SUPABASE_URL=...     (Settings > API > Project URL)
//        VITE_SUPABASE_ANON_KEY=...(Settings > API > anon public key)
//   5) no Supabase: Authentication > Providers > Email = ativado
//      (desligue "Confirm email" para testes, religue em produção)
//   6) npm run dev   |   deploy: npm run build + Netlify/Vercel
//
//  A trava de acesso é garantida pelo RLS no banco (função tem_acesso):
//  sem assinatura ativa, as questões nem chegam ao navegador.
// =====================================================================

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// As duas informações abaixo são públicas por natureza (o RLS protege os dados).
// Já vêm preenchidas com o seu projeto; não precisa configurar mais nada.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://dkiytkzyounzajaomcsh.supabase.co",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_7M7MrNwskOoLS3MqWVNnBQ_xRMa5L-4"
);

const COLORS = {
  asfalto: "#15181C", sinal: "#F7B500", faixa: "#F6F4EE",
  verde: "#1E7A46", vermelho: "#C8102E", azul: "#0D5EA6", cinza: "#6B7280",
};
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');`;

const CATEGORIES = {
  legislacao: "Legislação de Trânsito",
  sinalizacao: "Sinalização",
  defensiva: "Direção Defensiva",
  socorros: "Primeiros Socorros",
  mecanica: "Mecânica Básica",
};

const LEVELS = [
  { xp: 0, name: "Aprendiz" }, { xp: 100, name: "Candidato" },
  { xp: 300, name: "Condutor" }, { xp: 700, name: "Motorista Defensivo" },
  { xp: 1500, name: "Instrutor" }, { xp: 3000, name: "Examinador" },
];

const PASS_RATE = 0.7;

const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function levelOf(xp) {
  let lvl = LEVELS[0], next = null;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) { lvl = LEVELS[i]; next = LEVELS[i + 1] || null; }
  return { lvl, next };
}

/* ---------- estilo base ---------- */
const baseBtn = {
  fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.08em",
  border: "none", cursor: "pointer", borderRadius: 8,
};
const sectionTitle = {
  fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 15,
  borderBottom: "2px solid " + COLORS.asfalto, paddingBottom: 6,
};

function Diamond({ size = 17 }) {
  return <span style={{ display: "inline-block", width: size, height: size, background: COLORS.sinal, border: "1.5px solid " + COLORS.asfalto, transform: "rotate(45deg)", borderRadius: 2, flexShrink: 0 }} />;
}
function CatChip({ cat }) {
  return <span style={{ display: "inline-flex", alignItems: "center", background: COLORS.sinal, color: COLORS.asfalto, fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 4, border: "2px solid " + COLORS.asfalto }}>{CATEGORIES[cat]}</span>;
}
function LawPlate({ refText, law, explain }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ background: COLORS.asfalto, borderRadius: 10, border: "3px solid " + COLORS.faixa, boxShadow: "0 0 0 3px " + COLORS.asfalto + ", 0 8px 24px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ background: COLORS.vermelho, color: "#fff", fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12.5, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
          Fundamentação legal · {refText}
        </div>
        <div style={{ padding: "14px 16px" }}>
          <p style={{ color: COLORS.faixa, fontFamily: "'Saira Condensed', sans-serif", fontWeight: 500, fontSize: 16.5, lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>“{law}”</p>
        </div>
      </div>
      <div style={{ marginTop: 8, padding: "11px 14px", background: "#FFF8E0", border: "1px solid " + COLORS.sinal, borderLeft: "5px solid " + COLORS.sinal, borderRadius: 8, fontSize: 14, lineHeight: 1.6, color: "#3D3A2E" }}>
        <strong style={{ fontFamily: "'Saira Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 12.5 }}>Na prática:</strong> {explain}
      </div>
    </div>
  );
}
function XPBar({ xp }) {
  const { lvl, next } = levelOf(xp);
  const base = lvl.xp, span = next ? next.xp - base : 1;
  const pct = next ? Math.min(100, ((xp - base) / span) * 100) : 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 18, textTransform: "uppercase", letterSpacing: "0.05em" }}>{lvl.name}</span>
        <span style={{ fontSize: 12.5, color: COLORS.cinza }}>{xp} XP {next ? `· faltam ${next.xp - xp} para ${next.name}` : "· nível máximo"}</span>
      </div>
      <div style={{ height: 10, background: "#E2DFD6", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: `repeating-linear-gradient(90deg, ${COLORS.sinal} 0 16px, #E0A400 16px 22px)`, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

/* =====================================================================
   AUTENTICAÇÃO
   ===================================================================== */
function AuthScreen() {
  const [modo, setModo] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErro(""); setMsg(""); setBusy(true);
    try {
      if (modo === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password: senha,
          options: { data: { nome: nome.trim().slice(0, 24) } },
        });
        if (error) throw error;
        setMsg("Conta criada! Se a confirmação de e-mail estiver ativa, verifique sua caixa de entrada. Senão, já pode entrar.");
        setModo("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
    } catch (e) {
      setErro(traduzErro(e.message));
    } finally {
      setBusy(false);
    }
  };

  const input = { width: "100%", boxSizing: "border-box", marginTop: 10, padding: "13px 14px", fontSize: 16, borderRadius: 8, border: "2px solid " + COLORS.asfalto, fontFamily: "'Inter', sans-serif" };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.asfalto, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, justifyContent: "center", marginBottom: 6 }}>
          <Diamond size={20} />
          <span style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 28, color: COLORS.faixa, letterSpacing: "0.04em", textTransform: "uppercase" }}>Placa Aprovado</span>
        </div>
        <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 12.5, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 26px" }}>Simulados DETRAN · Fundamentado no CTB</p>

        <div style={{ background: COLORS.faixa, borderRadius: 14, padding: "24px 22px" }}>
          <h2 style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 24, textTransform: "uppercase", margin: "0 0 4px" }}>
            {modo === "login" ? "Entrar" : "Criar conta"}
          </h2>

          {modo === "signup" && (
            <input style={input} placeholder="Nome (aparece no ranking)" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={24} />
          )}
          <input style={input} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={input} type="password" placeholder="Senha (mín. 6 caracteres)" value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />

          {erro && <p style={{ color: COLORS.vermelho, fontSize: 13.5, marginTop: 10 }}>{erro}</p>}
          {msg && <p style={{ color: COLORS.verde, fontSize: 13.5, marginTop: 10 }}>{msg}</p>}

          <button onClick={submit} disabled={busy || !email || senha.length < 6} style={{ ...baseBtn, width: "100%", marginTop: 16, padding: "14px", fontSize: 16, background: busy || !email || senha.length < 6 ? "#D9D5CA" : COLORS.sinal, color: COLORS.asfalto, border: "2px solid " + COLORS.asfalto }}>
            {busy ? "Aguarde…" : modo === "login" ? "Entrar" : "Criar conta"}
          </button>

          <p style={{ textAlign: "center", fontSize: 13.5, marginTop: 16, color: "#444" }}>
            {modo === "login" ? "Ainda não tem conta? " : "Já tem conta? "}
            <button onClick={() => { setModo(modo === "login" ? "signup" : "login"); setErro(""); setMsg(""); }} style={{ background: "none", border: "none", color: COLORS.azul, fontWeight: 700, cursor: "pointer", fontSize: 13.5, fontFamily: "'Inter', sans-serif" }}>
              {modo === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function traduzErro(m) {
  if (/Invalid login/i.test(m)) return "E-mail ou senha incorretos.";
  if (/already registered/i.test(m)) return "Este e-mail já tem conta. Faça login.";
  if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail antes de entrar.";
  if (/at least 6/i.test(m)) return "A senha precisa de pelo menos 6 caracteres.";
  return m;
}

/* =====================================================================
   TELA DE BLOQUEIO (sem assinatura ativa)
   ===================================================================== */
function LockedScreen({ email, onSignOut }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.faixa, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ maxWidth: 460, textAlign: "center" }}>
        <Diamond size={26} />
        <h1 style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 30, textTransform: "uppercase", marginTop: 14, lineHeight: 1.1 }}>
          Seu acesso ainda não está liberado
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#444", marginTop: 12 }}>
          Sua conta (<strong>{email}</strong>) está criada, mas não encontramos uma assinatura ativa.
          Assim que o pagamento for confirmado, o acesso é liberado automaticamente — pode ser só atualizar a página.
        </p>
        <a href="#" style={{ ...baseBtn, display: "inline-block", marginTop: 20, padding: "14px 28px", fontSize: 16, background: COLORS.verde, color: "#fff", textDecoration: "none" }}>
          Assinar agora
        </a>
        <div style={{ marginTop: 18 }}>
          <button onClick={onSignOut} style={{ background: "none", border: "none", color: COLORS.cinza, cursor: "pointer", fontSize: 13.5, textDecoration: "underline" }}>Sair</button>
        </div>
        <p style={{ fontSize: 12, color: COLORS.cinza, marginTop: 24, lineHeight: 1.5 }}>
          Use na compra o mesmo e-mail desta conta, para o acesso casar automaticamente.
        </p>
      </div>
    </div>
  );
}

/* =====================================================================
   APP PRINCIPAL (com acesso liberado)
   ===================================================================== */
function MainApp({ session, onSignOut }) {
  const uid = session.user.id;
  const [screen, setScreen] = useState("home");
  const [stats, setStats] = useState({ xp: 0, ofensiva: 0, ultimo_dia: null, respondidas: 0, acertos_leg: 0 });
  const [nome, setNome] = useState("");
  const [catProg, setCatProg] = useState({});
  const [historico, setHistorico] = useState([]);
  const [conquistasCat, setConquistasCat] = useState([]);
  const [minhasConquistas, setMinhasConquistas] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [mode, setMode] = useState("treino");
  const [quiz, setQuiz] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [gains, setGains] = useState({ xp: 0, novas: [], streakUp: false });

  // carga inicial
  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: p }, { data: cp }, { data: h }, { data: cc }, { data: mc }] = await Promise.all([
        supabase.from("stats").select("*").eq("user_id", uid).single(),
        supabase.from("profiles").select("nome_exibicao").eq("id", uid).single(),
        supabase.from("progresso_categoria").select("*").eq("user_id", uid),
        supabase.from("sessoes").select("*").eq("user_id", uid).order("criada_em", { ascending: false }).limit(5),
        supabase.from("conquistas").select("*"),
        supabase.from("conquistas_usuario").select("codigo").eq("user_id", uid),
      ]);
      if (s) setStats(s);
      if (p) setNome(p.nome_exibicao || "");
      if (cp) { const o = {}; cp.forEach((r) => o[r.categoria] = { hit: r.acertos, total: r.total }); setCatProg(o); }
      if (h) setHistorico(h);
      if (cc) setConquistasCat(cc);
      if (mc) setMinhasConquistas(mc.map((x) => x.codigo));
      setCarregando(false);
    })();
  }, [uid]);

  useEffect(() => {
    if (screen !== "quiz") return;
    const t = setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [screen]);

  const start = async (m) => {
    // pega um lote aleatório de questões (a trava de RLS garante que só vem se houver acesso)
    const { data, error } = await supabase.from("questoes").select("*").eq("ativa", true).limit(80);
    if (error || !data || data.length === 0) {
      alert("Não foi possível carregar as questões. Verifique sua assinatura ou tente novamente.");
      return;
    }
    setMode(m);
    setQuiz(shuffle(data).slice(0, 10));
    setIdx(0); setAnswers({}); setRevealed(false); setSeconds(0);
    setScreen("quiz");
  };

  const current = quiz[idx];
  const chosen = current ? answers[current.id] : undefined;
  const choose = (i) => {
    if (mode === "treino" && revealed) return;
    setAnswers((a) => ({ ...a, [current.id]: i }));
    if (mode === "treino") setRevealed(true);
  };

  const finish = async (finalAnswers) => {
    const score = quiz.filter((q) => finalAnswers[q.id] === q.correta).length;
    const approved = score / quiz.length >= PASS_RATE;

    let gxp = score * 10 + 20;
    if (approved) gxp += 50;
    if (score === quiz.length) gxp += 100;

    const today = todayStr();
    let novaOfensiva = stats.ofensiva, streakUp = false;
    if (stats.ultimo_dia !== today) {
      novaOfensiva = stats.ultimo_dia === yesterdayStr() ? stats.ofensiva + 1 : 1;
      streakUp = true;
    }
    const legNow = quiz.filter((q) => q.categoria === "legislacao" && finalAnswers[q.id] === q.correta).length;
    const novoStats = {
      xp: stats.xp + gxp, ofensiva: novaOfensiva, ultimo_dia: today,
      respondidas: stats.respondidas + quiz.length, acertos_leg: stats.acertos_leg + legNow,
      atualizado_em: new Date().toISOString(),
    };

    // grava stats
    await supabase.from("stats").update(novoStats).eq("user_id", uid);

    // grava sessão
    await supabase.from("sessoes").insert({ user_id: uid, modo: mode, acertos: score, total: quiz.length, segundos: seconds });

    // progresso por categoria (upsert acumulando)
    const acc = {};
    quiz.forEach((q) => {
      if (!acc[q.categoria]) acc[q.categoria] = { hit: 0, total: 0 };
      acc[q.categoria].total++;
      if (finalAnswers[q.id] === q.correta) acc[q.categoria].hit++;
    });
    const novoCatProg = { ...catProg };
    for (const [cat, v] of Object.entries(acc)) {
      const prev = catProg[cat] || { hit: 0, total: 0 };
      const merged = { hit: prev.hit + v.hit, total: prev.total + v.total };
      novoCatProg[cat] = merged;
      await supabase.from("progresso_categoria").upsert({ user_id: uid, categoria: cat, acertos: merged.hit, total: merged.total });
    }

    // conquistas
    const novas = [];
    const unlock = (codigo) => { if (!minhasConquistas.includes(codigo) && !novas.includes(codigo)) novas.push(codigo); };
    unlock("primeira");
    if (approved) unlock("aprovado");
    if (score === quiz.length) unlock("perfeito");
    if (novaOfensiva >= 3) unlock("streak3");
    if (novaOfensiva >= 7) unlock("streak7");
    if (novoStats.respondidas >= 50) unlock("q50");
    if (novoStats.respondidas >= 100) unlock("q100");
    if (novoStats.acertos_leg >= 20) unlock("legmaster");
    if (novoStats.xp >= 300) unlock("condutor");
    if (novas.length) {
      await supabase.from("conquistas_usuario").insert(novas.map((codigo) => ({ user_id: uid, codigo })));
    }

    setStats(novoStats);
    setCatProg(novoCatProg);
    setMinhasConquistas([...minhasConquistas, ...novas]);
    setHistorico([{ modo: mode, acertos: score, total: quiz.length, segundos: seconds, criada_em: new Date().toISOString() }, ...historico].slice(0, 5));
    setGains({ xp: gxp, novas, streakUp });
    setScreen("result");
  };

  const next = () => {
    if (idx + 1 < quiz.length) { setIdx(idx + 1); setRevealed(false); }
    else finish(answers);
  };

  const openRanking = async () => {
    const { data } = await supabase.from("ranking").select("*");
    setRanking(data || []);
    setScreen("ranking");
  };

  const score = quiz.filter((q) => answers[q.id] === q.correta).length;
  const approved = quiz.length > 0 && score / quiz.length >= PASS_RATE;

  if (carregando) return <div style={{ minHeight: "100vh", background: COLORS.faixa, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", color: COLORS.cinza }}><style>{FONT_IMPORT}</style>Carregando seu progresso…</div>;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.faixa, fontFamily: "'Inter', sans-serif", color: COLORS.asfalto }}>
      <style>{FONT_IMPORT}</style>
      <header style={{ background: COLORS.asfalto, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "5px solid " + COLORS.sinal }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Diamond />
          <div>
            <div style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 21, color: COLORS.faixa, lineHeight: 1, letterSpacing: "0.04em", textTransform: "uppercase" }}>Placa Aprovado</div>
            <div style={{ fontSize: 10.5, color: "#9CA3AF", letterSpacing: "0.12em", textTransform: "uppercase" }}>Simulados DETRAN · Fundamentado no CTB</div>
          </div>
        </div>
        {screen === "quiz" ? (
          <div style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700, color: COLORS.sinal, fontSize: 19, letterSpacing: "0.1em" }}>{fmtTime(seconds)}</div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: COLORS.sinal, fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 17 }}>🔥 {stats.ofensiva}</span>
            <span style={{ color: COLORS.faixa, fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 17 }}>{stats.xp} XP</span>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 64px" }}>
        {/* HOME */}
        {screen === "home" && (
          <div>
            <div style={{ background: "#fff", border: "2px solid " + COLORS.asfalto, borderRadius: 14, padding: "18px 18px 16px", marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{nome ? `Olá, ${nome}!` : "Olá, candidato!"}</span>
                <span style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: stats.ofensiva > 0 ? "#C25700" : COLORS.cinza }}>🔥 Ofensiva: {stats.ofensiva} {stats.ofensiva === 1 ? "dia" : "dias"}</span>
              </div>
              <XPBar xp={stats.xp} />
              <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 12.5, color: COLORS.cinza }}>
                <span><strong style={{ color: COLORS.asfalto }}>{stats.respondidas}</strong> questões respondidas</span>
                <span><strong style={{ color: COLORS.asfalto }}>{minhasConquistas.length}/{conquistasCat.length}</strong> conquistas</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={() => start("treino")} style={{ ...baseBtn, background: COLORS.sinal, color: COLORS.asfalto, padding: "18px 15px", fontSize: 17, textAlign: "left", border: "2px solid " + COLORS.asfalto }}>
                Modo Treino
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 12.5, marginTop: 5, lineHeight: 1.5 }}>Correção imediata com a lei na tela.</div>
              </button>
              <button onClick={() => start("prova")} style={{ ...baseBtn, background: COLORS.asfalto, color: COLORS.faixa, padding: "18px 15px", fontSize: 17, textAlign: "left", border: "2px solid " + COLORS.asfalto }}>
                Modo Prova
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 12.5, marginTop: 5, lineHeight: 1.5, color: "#C9CDD3" }}>Formato oficial. Aprovação: 70%.</div>
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <button onClick={() => setScreen("conquistas")} style={{ ...baseBtn, background: "#fff", color: COLORS.asfalto, padding: "13px", fontSize: 15, border: "2px solid " + COLORS.asfalto }}>🏅 Conquistas</button>
              <button onClick={openRanking} style={{ ...baseBtn, background: "#fff", color: COLORS.asfalto, padding: "13px", fontSize: 15, border: "2px solid " + COLORS.asfalto }}>🏆 Ranking</button>
            </div>

            {Object.keys(catProg).length > 0 && (
              <div style={{ marginTop: 26 }}>
                <h3 style={sectionTitle}>Domínio por categoria</h3>
                {Object.entries(CATEGORIES).map(([cat, label]) => {
                  const s = catProg[cat]; if (!s) return null;
                  const pct = Math.round((s.hit / s.total) * 100);
                  return (
                    <div key={cat} style={{ margin: "11px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{label}</span>
                        <span style={{ color: pct >= 70 ? COLORS.verde : COLORS.vermelho, fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 9, background: "#E2DFD6", borderRadius: 5, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: pct + "%", background: pct >= 70 ? COLORS.verde : COLORS.vermelho }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {historico.length > 0 && (
              <div style={{ marginTop: 26 }}>
                <h3 style={sectionTitle}>Últimas sessões</h3>
                {historico.map((h, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 4px", borderBottom: "1px solid #E2DFD6", fontSize: 13.5 }}>
                    <span>{h.modo === "treino" ? "Treino" : "Prova"} · {h.criada_em.slice(0, 10)}</span>
                    <span style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: h.acertos / h.total >= PASS_RATE ? COLORS.verde : COLORS.vermelho }}>{h.acertos}/{h.total} {h.acertos / h.total >= PASS_RATE ? "· Aprovado" : "· Reprovado"}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 30, textAlign: "center" }}>
              <button onClick={onSignOut} style={{ background: "none", border: "none", color: COLORS.cinza, cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>Sair da conta</button>
            </div>
          </div>
        )}

        {/* QUIZ */}
        {screen === "quiz" && current && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <CatChip cat={current.categoria} />
              <span style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.06em" }}>Questão {idx + 1} / {quiz.length}</span>
            </div>
            <div style={{ height: 8, background: "#E2DFD6", borderRadius: 4, overflow: "hidden", marginBottom: 22 }}>
              <div style={{ height: "100%", width: `${((idx + (revealed || chosen !== undefined ? 1 : 0)) / quiz.length) * 100}%`, background: `repeating-linear-gradient(90deg, ${COLORS.sinal} 0 18px, ${COLORS.asfalto} 18px 26px)`, transition: "width 0.3s" }} />
            </div>
            <h2 style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700, fontSize: 23, lineHeight: 1.3, marginBottom: 18 }}>{current.enunciado}</h2>
            <div style={{ display: "grid", gap: 9 }}>
              {current.alternativas.map((opt, i) => {
                const isChosen = chosen === i, isCorrect = current.correta === i;
                let bg = "#fff", border = "#D6D2C6";
                if (mode === "treino" && revealed) { if (isCorrect) { bg = "#E8F5EC"; border = COLORS.verde; } else if (isChosen) { bg = "#FBEAEA"; border = COLORS.vermelho; } }
                else if (isChosen) { bg = "#FFF4D1"; border = COLORS.sinal; }
                return (
                  <button key={i} onClick={() => choose(i)} style={{ textAlign: "left", padding: "13px 15px", borderRadius: 10, background: bg, border: "2px solid " + border, color: COLORS.asfalto, fontSize: 14.5, lineHeight: 1.5, cursor: "pointer", fontFamily: "'Inter', sans-serif", display: "flex", gap: 11, alignItems: "flex-start", transition: "all 0.15s" }}>
                    <span style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, flexShrink: 0, width: 27, height: 27, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", background: mode === "treino" && revealed && isCorrect ? COLORS.verde : mode === "treino" && revealed && isChosen ? COLORS.vermelho : COLORS.asfalto, color: "#fff", fontSize: 14 }}>{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {mode === "treino" && revealed && (
              <div>
                <div style={{ marginTop: 16, fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 19, textTransform: "uppercase", letterSpacing: "0.06em", color: chosen === current.correta ? COLORS.verde : COLORS.vermelho }}>
                  {chosen === current.correta ? "✓ Resposta correta · +10 XP" : "✗ Resposta incorreta"}
                </div>
                <LawPlate refText={current.referencia} law={current.texto_legal} explain={current.explicacao} />
              </div>
            )}
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={next} disabled={mode === "treino" ? !revealed : chosen === undefined} style={{ ...baseBtn, background: (mode === "treino" ? revealed : chosen !== undefined) ? COLORS.asfalto : "#C9C5BA", color: COLORS.faixa, padding: "13px 30px", fontSize: 15 }}>
                {idx + 1 === quiz.length ? "Finalizar simulado" : "Próxima questão →"}
              </button>
            </div>
          </div>
        )}

        {/* RESULT */}
        {screen === "result" && (
          <div>
            <div style={{ borderRadius: 14, padding: "28px 22px", textAlign: "center", background: approved ? COLORS.verde : COLORS.vermelho, border: "3px solid #fff", boxShadow: `0 0 0 3px ${approved ? COLORS.verde : COLORS.vermelho}, 0 10px 30px rgba(0,0,0,0.18)`, color: "#fff", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.9 }}>Resultado do simulado</div>
              <div style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 60, lineHeight: 1 }}>{score}/{quiz.length}</div>
              <div style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 26, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{approved ? "Aprovado" : "Reprovado"}</div>
              <div style={{ fontSize: 12.5, marginTop: 7, opacity: 0.9 }}>Tempo: {fmtTime(seconds)} · Critério oficial: mínimo de 70%</div>
            </div>
            <div style={{ background: "#fff", border: "2px solid " + COLORS.sinal, borderRadius: 12, padding: "16px 18px", marginBottom: 24 }}>
              <div style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: "#B07F00" }}>+{gains.xp} XP</div>
              <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                {gains.streakUp && <span>🔥 Ofensiva: {stats.ofensiva} {stats.ofensiva === 1 ? "dia" : "dias"} · </span>}
                Total: {stats.xp} XP · Nível {levelOf(stats.xp).lvl.name}
              </div>
              {gains.novas.length > 0 && (
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  {gains.novas.map((codigo) => {
                    const a = conquistasCat.find((x) => x.codigo === codigo); if (!a) return null;
                    return (
                      <div key={codigo} style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFF8E0", border: "1px solid " + COLORS.sinal, borderRadius: 8, padding: "9px 12px" }}>
                        <span style={{ fontSize: 22 }}>{a.icone}</span>
                        <div>
                          <div style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 15, textTransform: "uppercase" }}>Conquista: {a.nome}</div>
                          <div style={{ fontSize: 12.5, color: "#666" }}>{a.descricao}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <h3 style={sectionTitle}>Revisão com fundamentação legal</h3>
            {quiz.map((q, qi) => {
              const ok = answers[q.id] === q.correta;
              return (
                <div key={q.id} style={{ margin: "14px 0", padding: "15px", background: "#fff", borderRadius: 12, border: "2px solid " + (ok ? "#CBE5D4" : "#F2CDD1") }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, color: "#fff", background: ok ? COLORS.verde : COLORS.vermelho, borderRadius: 6, padding: "2px 9px", fontSize: 12.5 }}>{qi + 1} · {ok ? "Acertou" : "Errou"}</span>
                    <CatChip cat={q.categoria} />
                  </div>
                  <p style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.5, margin: "4px 0 8px" }}>{q.enunciado}</p>
                  {!ok && answers[q.id] !== undefined && <p style={{ fontSize: 13, color: COLORS.vermelho, margin: "0 0 4px" }}>Sua resposta: {q.alternativas[answers[q.id]]}</p>}
                  <p style={{ fontSize: 13, color: COLORS.verde, fontWeight: 600, margin: 0 }}>Gabarito: {q.alternativas[q.correta]}</p>
                  <LawPlate refText={q.referencia} law={q.texto_legal} explain={q.explicacao} />
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 12, marginTop: 26 }}>
              <button onClick={() => start(mode)} style={{ ...baseBtn, flex: 1, background: COLORS.sinal, color: COLORS.asfalto, padding: "13px", fontSize: 15, border: "2px solid " + COLORS.asfalto }}>Novo simulado</button>
              <button onClick={() => setScreen("home")} style={{ ...baseBtn, flex: 1, background: COLORS.asfalto, color: COLORS.faixa, padding: "13px", fontSize: 15 }}>Início</button>
            </div>
          </div>
        )}

        {/* CONQUISTAS */}
        {screen === "conquistas" && (
          <div>
            <h2 style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 28, textTransform: "uppercase" }}>Conquistas · {minhasConquistas.length}/{conquistasCat.length}</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {conquistasCat.map((a) => {
                const got = minhasConquistas.includes(a.codigo);
                return (
                  <div key={a.codigo} style={{ display: "flex", alignItems: "center", gap: 13, background: got ? "#FFF8E0" : "#fff", border: "2px solid " + (got ? COLORS.sinal : "#E2DFD6"), borderRadius: 10, padding: "13px 15px", opacity: got ? 1 : 0.55 }}>
                    <span style={{ fontSize: 26, filter: got ? "none" : "grayscale(1)" }}>{a.icone}</span>
                    <div>
                      <div style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 16, textTransform: "uppercase" }}>{a.nome}</div>
                      <div style={{ fontSize: 13, color: "#666" }}>{a.descricao}</div>
                    </div>
                    {got && <span style={{ marginLeft: "auto", color: COLORS.verde, fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 13, textTransform: "uppercase" }}>✓ Obtida</span>}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setScreen("home")} style={{ ...baseBtn, marginTop: 22, background: COLORS.asfalto, color: COLORS.faixa, padding: "13px 28px", fontSize: 15 }}>← Voltar</button>
          </div>
        )}

        {/* RANKING */}
        {screen === "ranking" && (
          <div>
            <h2 style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 28, textTransform: "uppercase" }}>🏆 Ranking geral</h2>
            <p style={{ fontSize: 12.5, color: COLORS.cinza, marginTop: 4 }}>Top alunos por XP acumulado.</p>
            <div style={{ marginTop: 14 }}>
              {ranking.length === 0 && <p style={{ color: COLORS.cinza, fontSize: 14 }}>Ainda não há participantes. Complete um simulado para aparecer aqui!</p>}
              {ranking.map((r, i) => {
                const isMe = nome && r.nome === nome;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, background: isMe ? "#FFF4D1" : "#fff", border: "2px solid " + (isMe ? COLORS.sinal : "#E2DFD6"), borderRadius: 10, padding: "11px 15px", marginBottom: 8 }}>
                    <span style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 18, width: 30, textAlign: "center", color: i === 0 ? "#B07F00" : i === 1 ? "#7A7A7A" : i === 2 ? "#9C5B21" : COLORS.cinza }}>{i + 1}º</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.nome}{isMe ? " (você)" : ""}</div>
                      <div style={{ fontSize: 12, color: COLORS.cinza }}>Nível {levelOf(r.xp).lvl.name}</div>
                    </div>
                    <span style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 800, fontSize: 17 }}>{r.xp} XP</span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setScreen("home")} style={{ ...baseBtn, marginTop: 18, background: COLORS.asfalto, color: COLORS.faixa, padding: "13px 28px", fontSize: 15 }}>← Voltar</button>
          </div>
        )}
      </main>
    </div>
  );
}

/* =====================================================================
   RAIZ — decide entre login, bloqueio e app
   ===================================================================== */
export default function App() {
  const [session, setSession] = useState(null);
  const [acesso, setAcesso] = useState(null); // null=checando, true/false
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setPronto(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setAcesso(null); });
    return () => sub.subscription.unsubscribe();
  }, []);

  // verifica acesso sempre que houver sessão
  useEffect(() => {
    if (!session) return;
    supabase.rpc("tem_acesso", { uid: session.user.id }).then(({ data }) => setAcesso(!!data));
  }, [session]);

  const sair = () => supabase.auth.signOut();

  if (!pronto) return <div style={{ minHeight: "100vh", background: COLORS.asfalto }} />;
  if (!session) return <AuthScreen />;
  if (acesso === null) return <div style={{ minHeight: "100vh", background: COLORS.faixa, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", color: COLORS.cinza }}><style>{FONT_IMPORT}</style>Verificando seu acesso…</div>;
  if (!acesso) return <LockedScreen email={session.user.email} onSignOut={sair} />;
  return <MainApp session={session} onSignOut={sair} />;
}

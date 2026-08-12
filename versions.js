/* ============================================================
   Seletor de versões — compartilhado por todas as LPs.
   Injeta um seletor flutuante fixo no topo, alinhado ao header.
   Para adicionar uma versão nova: acrescente uma linha em VERSOES.
   ============================================================ */
(function () {
  "use strict";

  var VERSOES = [
    { id: "v1", nome: "V1", desc: "Catálogo técnico · estrutura B2B clássica" },
    { id: "v2", nome: "V2", desc: "Muro de produto · dark, movimento contínuo" },
    { id: "v3", nome: "V3", desc: "Light mode · galeria, coverflow e app" }
  ];

  var atual = (location.pathname.match(/\/(v\d+)\//) || [])[1] || VERSOES[VERSOES.length - 1].id;

  // A V3 é a versão oficial: nela o seletor fica escondido.
  // Para comparar, abra qualquer versão com ?versoes na URL.
  var OFICIAL = "v3";
  var forcar = /(^|[?&])versoes(=|&|$)/.test(location.search);
  if (atual === OFICIAL && !forcar) return;

  var css = document.createElement("style");
  css.textContent = [
    ".vsw{position:fixed;bottom:18px;right:18px;z-index:9999;display:flex;align-items:center;gap:6px;",
    "  padding:5px;border-radius:999px;background:rgba(8,16,46,.82);backdrop-filter:blur(14px);",
    "  border:1px solid rgba(255,255,255,.16);box-shadow:0 8px 30px -8px rgba(0,0,0,.5);",
    "  font-family:'Red Hat Mono',ui-monospace,monospace}",
    ".vsw__t{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.45);padding:0 6px 0 9px}",
    ".vsw a{display:block;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;",
    "  letter-spacing:.1em;text-decoration:none;color:rgba(255,255,255,.62);transition:all .16s;white-space:nowrap}",
    ".vsw a:hover{color:#fff;background:rgba(255,255,255,.12)}",
    ".vsw a.on{background:#005AFF;color:#fff}",
    ".vsw a:focus-visible{outline:2px solid #FFA400;outline-offset:2px}",
    "@media (max-width:900px){.vsw{bottom:80px;right:10px;padding:4px}",
    "  .vsw__t{display:none}.vsw a{padding:6px 10px;font-size:10px}}"
  ].join("");
  document.head.appendChild(css);

  var box = document.createElement("nav");
  box.className = "vsw";
  box.setAttribute("aria-label", "Versões do protótipo");

  var tag = document.createElement("span");
  tag.className = "vsw__t";
  tag.textContent = "Protótipo";
  box.appendChild(tag);

  VERSOES.forEach(function (v) {
    var a = document.createElement("a");
    a.href = "../" + v.id + "/";
    a.textContent = v.nome;
    a.title = v.desc;
    if (v.id === atual) {
      a.className = "on";
      a.setAttribute("aria-current", "page");
    }
    box.appendChild(a);
  });

  function montar() { document.body.appendChild(box); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montar);
  } else {
    montar();
  }
})();

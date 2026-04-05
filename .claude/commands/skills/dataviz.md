# Skill: dataviz
Especialista em visualizações HTML com Chart.js para dashboards de vendas.
Ativa quando o usuário pedir gráfico, chart, visualização, dashboard ou "mostre visualmente".

## Contexto do projeto
Interface embedada no Google Sites via HTML puro + Chart.js CDN.
Sem frameworks externos. Sem build. Tudo inline em um único bloco HTML.

---

## Paleta de cores obrigatória

```
Primário  → #6366f1  (índigo)
Sucesso   → #10b981  (verde)
Atenção   → #f59e0b  (âmbar)
Alerta    → #ef4444  (vermelho)
Neutro    → #94a3b8  (cinza)
Fundo     → #0f172a  (dark) / #f8fafc (light)
Card      → #1e293b  (dark) / #ffffff (light)
Texto     → #f1f5f9  (dark) / #1e293b (light)
```

### Paleta expandida para múltiplas séries
```javascript
const COLORS = [
  '#6366f1', // índigo
  '#10b981', // verde
  '#f59e0b', // âmbar
  '#ef4444', // vermelho
  '#8b5cf6', // roxo
  '#06b6d4', // ciano
  '#f97316', // laranja
  '#ec4899', // rosa
];
```

---

## Tipos de gráfico por caso de uso

| Pergunta | Tipo | Chart.js type |
|---|---|---|
| Ranking / comparação | Barras horizontais | `bar` + `indexAxis: 'y'` |
| Evolução no tempo | Linha | `line` |
| Participação / market share | Rosca | `doughnut` |
| Meta vs realizado | Barras agrupadas | `bar` (múltiplos datasets) |
| Performance multidimensional | Radar | `radar` |
| Forecast com intervalo | Linha + área | `line` com `fill` |
| Dispersão ticket/volume | Bolhas | `bubble` |

---

## Template base HTML

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{TITULO}}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      padding: 24px;
      min-height: 100vh;
    }
    .card {
      background: #1e293b;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      border: 1px solid #334155;
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 32px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 4px;
    }
    .card-sub {
      font-size: 13px;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-green { background: #064e3b; color: #10b981; }
    .badge-red   { background: #450a0a; color: #ef4444; }
    .badge-amber { background: #451a03; color: #f59e0b; }
    .chart-wrapper {
      position: relative;
      height: 300px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 24px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    @media (max-width: 600px) {
      .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <h1>{{TITULO}}</h1>
  <p class="subtitle">{{SUBTITULO}} · Atualizado em {{DATA}}</p>

  <!-- KPI Cards -->
  <div class="grid-4">
    <div class="card">
      <div class="card-title">Receita Total</div>
      <div class="card-value">R$ 0</div>
      <div class="card-sub"><span class="badge badge-green">+0%</span> vs mês anterior</div>
    </div>
  </div>

  <!-- Gráfico principal -->
  <div class="card">
    <div class="card-title">{{LABEL_GRAFICO}}</div>
    <div class="chart-wrapper">
      <canvas id="mainChart"></canvas>
    </div>
  </div>

  <script>
    // Formatador padrão PT-BR
    const fmt = (v) => new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL', minimumFractionDigits: 2
    }).format(v);

    const fmtPct = (v) => `${v.toFixed(1)}%`;
    const fmtNum = (v) => new Intl.NumberFormat('pt-BR').format(v);

    // Defaults Chart.js
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = '#1e293b';
    Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    // Tooltip padrão PT-BR
    const tooltipDefaults = {
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => ` ${fmt(ctx.parsed.y ?? ctx.parsed)}`
      }
    };

    // ---- DADOS ----
    const labels = []; // ex: ['Ana', 'Bruno', 'Carla']
    const data   = []; // ex: [45000, 38000, 32000]

    // ---- GRÁFICO ----
    new Chart(document.getElementById('mainChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '{{LABEL_DATASET}}',
          data,
          backgroundColor: '#6366f1',
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: tooltipDefaults,
        },
        scales: {
          x: { grid: { color: '#1e293b' } },
          y: {
            grid: { color: '#1e293b' },
            ticks: { callback: (v) => fmt(v) }
          }
        }
      }
    });
  </script>
</body>
</html>
```

---

## Snippets por tipo de gráfico

### Barras horizontais (ranking)
```javascript
{
  type: 'bar',
  options: {
    indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: tooltipDefaults },
    scales: {
      x: { ticks: { callback: (v) => fmt(v) }, grid: { color: '#1e293b' } },
      y: { grid: { display: false } }
    }
  }
}
```

### Linha com área (evolução)
```javascript
{
  type: 'line',
  data: {
    datasets: [{
      fill: true,
      tension: 0.4,
      backgroundColor: 'rgba(99,102,241,0.15)',
      borderColor: '#6366f1',
      pointBackgroundColor: '#6366f1',
      pointRadius: 4,
    }]
  }
}
```

### Rosca (participação)
```javascript
{
  type: 'doughnut',
  data: {
    datasets: [{
      backgroundColor: COLORS,
      borderWidth: 0,
      hoverOffset: 8,
    }]
  },
  options: {
    cutout: '70%',
    plugins: {
      legend: { position: 'right', labels: { padding: 16, usePointStyle: true } },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.label}: ${fmtPct(ctx.parsed)}` }
      }
    }
  }
}
```

### Barras agrupadas (meta vs realizado)
```javascript
{
  type: 'bar',
  data: {
    datasets: [
      { label: 'Realizado', backgroundColor: '#6366f1', borderRadius: 6 },
      { label: 'Meta',      backgroundColor: '#334155', borderRadius: 6,
        borderColor: '#f59e0b', borderWidth: 2 }
    ]
  },
  options: {
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`
        }
      }
    }
  }
}
```

### Linha com banda de confiança (forecast)
```javascript
// Dataset ordem: confidence_high, confidence_low, realizado, previsto
datasets: [
  { label: 'Limite Superior', data: high, fill: '+1',
    backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 0, pointRadius: 0 },
  { label: 'Limite Inferior', data: low,  fill: false,
    borderWidth: 0, pointRadius: 0 },
  { label: 'Realizado',  data: realizado, borderColor: '#10b981',
    borderWidth: 2, tension: 0.3, pointRadius: 3 },
  { label: 'Previsto',   data: previsto,  borderColor: '#6366f1',
    borderWidth: 2, borderDash: [6, 3], tension: 0.3, pointRadius: 0 },
]
```

---

## KPI Cards — padrões

```html
<!-- Verde: meta atingida / crescimento positivo -->
<div class="card">
  <div class="card-title">Receita Líquida</div>
  <div class="card-value" style="color:#10b981">R$ 128.450,00</div>
  <div class="card-sub"><span class="badge badge-green">+12,3%</span> vs março</div>
</div>

<!-- Âmbar: atenção / próximo da meta -->
<div class="card">
  <div class="card-title">Meta Atingida</div>
  <div class="card-value" style="color:#f59e0b">87,5%</div>
  <div class="card-sub"><span class="badge badge-amber">Em progresso</span></div>
</div>

<!-- Vermelho: abaixo da meta / queda -->
<div class="card">
  <div class="card-title">Ticket Médio</div>
  <div class="card-value" style="color:#ef4444">R$ 1.234,00</div>
  <div class="card-sub"><span class="badge badge-red">-8,1%</span> vs março</div>
</div>
```

---

## Regras obrigatórias

1. **Sempre** usar `fmt()` para valores monetários (nunca hardcodar R$)
2. **Sempre** incluir `responsive: true` e `maintainAspectRatio: false` com `.chart-wrapper { height: Xpx }`
3. **Sempre** usar `Chart.defaults.color = '#94a3b8'` no início do script
4. **Sempre** incluir título do card em `card-title` (maiúsculas, cinza)
5. **Nunca** usar `alert()`, `console.log()` ou dependências externas além do Chart.js CDN
6. Tooltips sempre em PT-BR com R$ formatado
7. Legenda: ocultar quando há só 1 dataset, mostrar à direita em rosca
8. Bordas arredondadas em barras: `borderRadius: 8`
9. Grid lines: sempre `color: '#1e293b'` (sutil, dark)
10. O HTML gerado deve funcionar colado diretamente no Google Sites (iframe embed)

---

## Checklist antes de entregar

- [ ] `<script src="chart.js CDN">` presente
- [ ] Dados reais do Supabase (via data-analyst) usados nos arrays
- [ ] Valores em R$ formatados com `fmt()`
- [ ] Tooltip PT-BR configurado
- [ ] Título e subtítulo preenchidos
- [ ] Cores da paleta oficial usadas
- [ ] HTML completo e funcional (sem imports externos além do CDN)

# Skill: data-analyst
Analista de vendas especialista em SQL e insights de negócio.
Ativa quando o usuário fizer perguntas sobre vendas, metas, produtos, canais, regiões ou vendedores.

## Contexto do projeto
Dashboard conversacional conectado ao Supabase via MCP.
Banco: PostgreSQL | Schema: public | Dados: vendas de produtos de tecnologia (2026)

## Tabelas disponíveis

### public.sales (tabela principal — 1.006 linhas)
- id, sale_date (date), year, month, month_name, week_of_year
- seller_name → vendedores: Ana, Bruno, Carla, Diego, Fernanda
- region → Nordeste | Sudeste | Sul | Centro-Oeste
- channel → Loja Física | E-commerce | Marketplace | WhatsApp
- product, category → Informática | Telefonia | Wearables | Acessórios
- quantity, unit_price, gross_revenue, discount, net_revenue

### public.seller_targets (15 linhas — metas mensais)
- year, month, month_name, seller_name, sales_target

### public.sales_forecast (previsão de receita)
- forecast_date, year, month, month_name
- forecast_type → daily | monthly
- predicted_revenue, confidence_low, confidence_high

### public.vw_sales_vs_target_monthly (VIEW)
- seller_name, month_name, net_revenue, sales_target, achievement_pct

## Regras de negócio obrigatórias
1. Métrica principal sempre `net_revenue` (nunca gross_revenue como padrão)
2. Moeda: R$ com formato brasileiro → R$ 12.345,67
3. Meta atingida = achievement_pct >= 100%
4. Crescimento sempre calculado vs mês anterior
5. Período padrão: mês atual (2026-04) ou último mês com dados disponíveis
6. Hoje = 2026-04-04 → mês atual = abril/2026 (month=4), ano=2026

## Como responder perguntas

### Passo 1 — Interpretar a pergunta
Identifique: período | vendedor | região | canal | categoria | métrica solicitada

### Passo 2 — Gerar a query SQL correta
Use `mcp__supabase__execute_sql` para consultar dados reais.
Sempre filtre por year/month quando possível para performance.

### Passo 3 — Formatar a resposta
Retorne:
- Tabela com dados principais
- Insight textual em PT-BR (1-3 frases objetivas)
- Destaques: melhor resultado em verde, pior em vermelho

---

## Queries prontas por tipo de análise

### Ranking de vendedores — mês atual
```sql
SELECT
  seller_name,
  SUM(net_revenue) AS total,
  COUNT(*) AS num_vendas,
  ROUND(AVG(net_revenue), 2) AS ticket_medio
FROM sales
WHERE year = 2026 AND month = 4
GROUP BY seller_name
ORDER BY total DESC;
```

### Meta vs realizado — ano atual
```sql
SELECT
  seller_name,
  month_name,
  month,
  ROUND(net_revenue, 2) AS realizado,
  ROUND(sales_target, 2) AS meta,
  ROUND(achievement_pct, 1) AS pct_atingido
FROM vw_sales_vs_target_monthly
WHERE year = 2026
ORDER BY month, seller_name;
```

### Receita por canal — mês atual
```sql
SELECT
  channel,
  SUM(net_revenue) AS total,
  COUNT(*) AS num_vendas,
  ROUND(SUM(net_revenue) * 100.0 / SUM(SUM(net_revenue)) OVER (), 1) AS pct_participacao
FROM sales
WHERE year = 2026 AND month = 4
GROUP BY channel
ORDER BY total DESC;
```

### Receita por categoria — mês atual
```sql
SELECT
  category,
  SUM(net_revenue) AS total,
  COUNT(*) AS num_vendas,
  ROUND(AVG(unit_price), 2) AS preco_medio
FROM sales
WHERE year = 2026 AND month = 4
GROUP BY category
ORDER BY total DESC;
```

### Receita por região — mês atual
```sql
SELECT
  region,
  SUM(net_revenue) AS total,
  COUNT(*) AS num_vendas,
  ROUND(SUM(net_revenue) * 100.0 / SUM(SUM(net_revenue)) OVER (), 1) AS pct_participacao
FROM sales
WHERE year = 2026 AND month = 4
GROUP BY region
ORDER BY total DESC;
```

### Evolução mensal — ano atual
```sql
SELECT
  month,
  month_name,
  SUM(net_revenue) AS total_mes,
  COUNT(*) AS num_vendas,
  ROUND(AVG(net_revenue), 2) AS ticket_medio
FROM sales
WHERE year = 2026
GROUP BY month, month_name
ORDER BY month;
```

### Crescimento mês a mês (MoM)
```sql
WITH monthly AS (
  SELECT
    month,
    month_name,
    SUM(net_revenue) AS total
  FROM sales
  WHERE year = 2026
  GROUP BY month, month_name
)
SELECT
  month_name,
  total,
  LAG(total) OVER (ORDER BY month) AS mes_anterior,
  ROUND(
    (total - LAG(total) OVER (ORDER BY month)) * 100.0
    / NULLIF(LAG(total) OVER (ORDER BY month), 0), 1
  ) AS crescimento_pct
FROM monthly
ORDER BY month;
```

### Forecast vs realizado — abril
```sql
SELECT
  f.forecast_date,
  ROUND(f.predicted_revenue, 2) AS previsto,
  ROUND(f.confidence_low, 2) AS limite_inferior,
  ROUND(f.confidence_high, 2) AS limite_superior,
  COALESCE(ROUND(SUM(s.net_revenue), 2), 0) AS realizado
FROM sales_forecast f
LEFT JOIN sales s ON s.sale_date = f.forecast_date
WHERE f.forecast_type = 'daily' AND f.month = 4
GROUP BY f.forecast_date, f.predicted_revenue, f.confidence_low, f.confidence_high
ORDER BY f.forecast_date;
```

### Top produtos — mês atual
```sql
SELECT
  product,
  category,
  SUM(quantity) AS qtd_vendida,
  SUM(net_revenue) AS receita_total,
  ROUND(AVG(unit_price), 2) AS preco_medio
FROM sales
WHERE year = 2026 AND month = 4
GROUP BY product, category
ORDER BY receita_total DESC
LIMIT 10;
```

### Desempenho por vendedor e canal
```sql
SELECT
  seller_name,
  channel,
  SUM(net_revenue) AS total,
  COUNT(*) AS num_vendas
FROM sales
WHERE year = 2026 AND month = 4
GROUP BY seller_name, channel
ORDER BY seller_name, total DESC;
```

---

## Exemplos de perguntas → análise esperada

| Pergunta | Query base | Insight esperado |
|---|---|---|
| "Quem vendeu mais esse mês?" | Ranking vendedores | Top vendedor + gap para o 2º |
| "Como estamos vs a meta?" | vw_sales_vs_target_monthly | % atingimento + quem está abaixo |
| "Qual canal performa melhor?" | Receita por canal | Canal líder + participação % |
| "Crescemos vs mês passado?" | Crescimento MoM | % de crescimento + valor absoluto |
| "Qual categoria vende mais?" | Receita por categoria | Categoria top + ticket médio |
| "Como está o forecast?" | Forecast vs realizado | Realizado vs previsto em R$ |

---

## Formato de resposta padrão

Sempre responda em PT-BR com:
1. **Resumo executivo** (1 frase com o número principal)
2. **Tabela de dados** (formatada em markdown)
3. **Insights** (2-3 pontos de atenção ou oportunidade)
4. **Sugestão de visualização** (tipo de gráfico recomendado para dataviz)

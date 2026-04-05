# Dashboard IA — Sales Intelligence

## Projeto
Dashboard conversacional de vendas conectado ao Supabase via MCP.
O usuário faz perguntas em português e recebe insights visuais com dados reais.

## Stack
- **Banco de dados**: Supabase (PostgreSQL)
- **Conexão**: Supabase MCP (leitura em tempo real)
- **Interface**: HTML + Chart.js embedado no Google Sites
- **IA conversacional**: Claude API (claude-sonnet-4-20250514)
- **Skills ativas**: claude-mem, data-analyst, dataviz

---

## Tabelas disponíveis

### `public.sales`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | int8 | PK |
| sale_date | date | Data da venda |
| year | int4 | Ano |
| month | int4 | Mês (1–12) |
| month_name | text | Nome do mês em PT |
| week_of_year | int4 | Semana do ano |
| seller_name | text | Nome do vendedor |
| region | text | Nordeste / Sudeste / Sul / Centro-Oeste |
| channel | text | Loja Física / E-commerce / Marketplace / WhatsApp |
| product | text | Nome do produto |
| category | text | Informática / Telefonia / Wearables / Acessórios |
| quantity | int4 | Quantidade vendida |
| unit_price | numeric | Preço unitário |
| gross_revenue | numeric | Receita bruta |
| discount | numeric | Desconto aplicado |
| net_revenue | numeric | Receita líquida |

### `public.seller_targets`
| Coluna | Tipo | Descrição |
|---|---|---|
| year | int4 | Ano |
| month | int4 | Mês |
| month_name | text | Nome do mês |
| seller_name | text | Nome do vendedor |
| sales_target | numeric | Meta de receita líquida |

### `public.sales_forecast`
| Coluna | Tipo | Descrição |
|---|---|---|
| forecast_date | date | Data prevista |
| year | int4 | Ano |
| month | int4 | Mês |
| month_name | text | Nome do mês |
| forecast_type | text | daily / monthly |
| predicted_revenue | numeric | Receita prevista |
| confidence_low | numeric | Limite inferior |
| confidence_high | numeric | Limite superior |

### `public.vw_sales_vs_target_monthly` (VIEW)
Consolida realizado vs meta por vendedor/mês.
Colunas principais: seller_name, month_name, net_revenue, sales_target, achievement_pct

---

## Skills

### claude-mem
Mantém contexto entre perguntas do usuário.
- Armazena: filtros ativos, último período consultado, vendedor em foco
- Uso: sempre verificar contexto antes de responder nova pergunta

### data-analyst
Transforma perguntas em linguagem natural em queries SQL.
- Sempre usar `net_revenue` como métrica principal de vendas
- Período padrão: mês atual ou último mês com dados
- Formato de resposta: JSON estruturado com dados + insights textuais

### dataviz
Gera visualizações HTML com Chart.js.
- Paleta: #6366f1 (primário), #10b981 (sucesso), #f59e0b (atenção), #ef4444 (alerta)
- Sempre incluir título, legenda e tooltip formatado em PT-BR
- Gráficos principais: bar, line, doughnut, radar

---

## Regras de negócio
1. Moeda sempre em R$ com formatação brasileira (ex: R$ 12.345,67)
2. Meta atingida = achievement_pct >= 100%
3. Crescimento calculado sempre vs mês anterior
4. Regiões: Nordeste, Sudeste, Sul, Centro-Oeste
5. Vendedores: Ana, Bruno, Carla, Diego, Fernanda

## Queries SQL prontas

### Ranking de vendedores (mês atual)
```sql
SELECT seller_name,
       SUM(net_revenue) as total,
       COUNT(*) as num_vendas,
       AVG(net_revenue) as ticket_medio
FROM sales
WHERE year = 2026 AND month = 1
GROUP BY seller_name
ORDER BY total DESC;
```

### Meta vs realizado
```sql
SELECT * FROM vw_sales_vs_target_monthly
WHERE year = 2026
ORDER BY month, seller_name;
```

### Receita por canal
```sql
SELECT channel,
       SUM(net_revenue) as total,
       ROUND(SUM(net_revenue) * 100.0 / SUM(SUM(net_revenue)) OVER (), 1) as pct
FROM sales
WHERE year = 2026
GROUP BY channel
ORDER BY total DESC;
```

### Forecast vs realizado (Abril)
```sql
SELECT f.forecast_date,
       f.predicted_revenue,
       f.confidence_low,
       f.confidence_high,
       COALESCE(SUM(s.net_revenue), 0) as realizado
FROM sales_forecast f
LEFT JOIN sales s ON s.sale_date = f.forecast_date
WHERE f.forecast_type = 'daily' AND f.month = 4
GROUP BY f.forecast_date, f.predicted_revenue, f.confidence_low, f.confidence_high
ORDER BY f.forecast_date;
```

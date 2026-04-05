// ═══════════════════════════════════════════════════════════════
//  SUPABASE SYNC — Google Apps Script
//  Planilha: https://docs.google.com/spreadsheets/d/1GNm3WL2mxR4DtEqEc3fUaUTv0AkQsxHvMRK7XUpSsEo
//  Tabela: public.sales
//  Última atualização: 2026-04-04
// ═══════════════════════════════════════════════════════════════

// ── CONFIGURAÇÃO ────────────────────────────────────────────────
const SUPABASE_URL      = 'https://ariieuhbifpxmmtanjdq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyaWlldWhiaWZweG1tdGFuamRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjI5ODEsImV4cCI6MjA5MDg5ODk4MX0.2kAb-rmJ9wvtTRqovH5gLPAG0iGKFNTsLyDJjuMfSio';
const ABA_SALES         = 'sales';
const STATUS_COL        = 17;   // Coluna Q — "Status Sync" (adicione este cabeçalho na planilha)
const PRIMEIRA_LINHA    = 2;    // Linha 1 = cabeçalho

// ── MAPEAMENTO DE COLUNAS ────────────────────────────────────────
// Ajuste os índices se a ordem das colunas na sua planilha for diferente
// Índice 1 = coluna A, 2 = coluna B, etc.
const COLS = {
  sale_date:    1,   // A
  year:         2,   // B
  month:        3,   // C
  month_name:   4,   // D
  week_of_year: 5,   // E
  seller_name:  6,   // F
  region:       7,   // G
  channel:      8,   // H
  product:      9,   // I
  category:     10,  // J
  quantity:     11,  // K
  unit_price:   12,  // L
  gross_revenue:13,  // M
  discount:     14,  // N
  net_revenue:  15,  // O
};

// ── CAMPOS OBRIGATÓRIOS para considerar linha completa ───────────
const CAMPOS_OBRIGATORIOS = ['sale_date','seller_name','product','net_revenue'];


// ═══════════════════════════════════════════════════════════════
//  GATILHO PRINCIPAL — chamado automaticamente ao editar
// ═══════════════════════════════════════════════════════════════
function onEdit(e) {
  try {
    const sheet = e.range.getSheet();

    // Ignorar se não for a aba "sales"
    if (sheet.getName() !== ABA_SALES) return;

    const row = e.range.getRow();

    // Ignorar cabeçalho
    if (row < PRIMEIRA_LINHA) return;

    // Ignorar edições na própria coluna de status
    if (e.range.getColumn() === STATUS_COL) return;

    const status = sheet.getRange(row, STATUS_COL).getValue();

    // Se já foi sincronizado, não reenviar
    if (status === '✅ Sincronizado') return;

    const dados = extrairLinha(sheet, row);

    // Verificar se os campos obrigatórios estão preenchidos
    if (!linhaCompleta(dados)) return;

    // Enviar para o Supabase
    const resultado = enviarParaSupabase(dados);

    if (resultado.sucesso) {
      sheet.getRange(row, STATUS_COL).setValue('✅ Sincronizado');
      sheet.getRange(row, STATUS_COL).setFontColor('#10b981');
      Logger.log(`[OK] Linha ${row} sincronizada. ID Supabase: ${resultado.id}`);
    } else {
      sheet.getRange(row, STATUS_COL).setValue('❌ Erro');
      sheet.getRange(row, STATUS_COL).setFontColor('#ef4444');
      Logger.log(`[ERRO] Linha ${row}: ${resultado.erro}`);
    }

  } catch (err) {
    Logger.log(`[EXCEÇÃO] onEdit: ${err.message}`);
  }
}


// ═══════════════════════════════════════════════════════════════
//  EXTRAIR LINHA — lê os valores da planilha e monta o objeto
// ═══════════════════════════════════════════════════════════════
function extrairLinha(sheet, row) {
  const get = (col) => sheet.getRange(row, col).getValue();

  // Formatar a data corretamente para o Supabase (YYYY-MM-DD)
  const rawDate = get(COLS.sale_date);
  let saleDate = '';
  if (rawDate instanceof Date && !isNaN(rawDate)) {
    saleDate = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  } else if (typeof rawDate === 'string' && rawDate.trim() !== '') {
    saleDate = rawDate.trim();
  }

  return {
    sale_date:    saleDate,
    year:         Number(get(COLS.year))         || null,
    month:        Number(get(COLS.month))        || null,
    month_name:   String(get(COLS.month_name)    || '').trim(),
    week_of_year: Number(get(COLS.week_of_year)) || null,
    seller_name:  String(get(COLS.seller_name)   || '').trim(),
    region:       String(get(COLS.region)        || '').trim(),
    channel:      String(get(COLS.channel)       || '').trim(),
    product:      String(get(COLS.product)       || '').trim(),
    category:     String(get(COLS.category)      || '').trim(),
    quantity:     Number(get(COLS.quantity))     || null,
    unit_price:   Number(get(COLS.unit_price))   || null,
    gross_revenue:Number(get(COLS.gross_revenue))|| null,
    discount:     Number(get(COLS.discount))     || 0,
    net_revenue:  Number(get(COLS.net_revenue))  || null,
  };
}


// ═══════════════════════════════════════════════════════════════
//  VERIFICAR SE A LINHA ESTÁ COMPLETA
// ═══════════════════════════════════════════════════════════════
function linhaCompleta(dados) {
  return CAMPOS_OBRIGATORIOS.every(campo => {
    const val = dados[campo];
    return val !== null && val !== undefined && val !== '';
  });
}


// ═══════════════════════════════════════════════════════════════
//  ENVIAR PARA O SUPABASE via REST API
// ═══════════════════════════════════════════════════════════════
function enviarParaSupabase(dados) {
  const url = `${SUPABASE_URL}/rest/v1/sales`;

  const options = {
    method:      'POST',
    contentType: 'application/json',
    headers: {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer':        'return=representation',  // retorna o registro criado
    },
    payload:          JSON.stringify(dados),
    muteHttpExceptions: true,  // não lança exceção em erros HTTP
  };

  try {
    const response    = UrlFetchApp.fetch(url, options);
    const statusCode  = response.getResponseCode();
    const body        = response.getContentText();

    if (statusCode === 201) {
      const registros = JSON.parse(body);
      const id = registros[0]?.id || '?';
      return { sucesso: true, id };
    } else {
      Logger.log(`[HTTP ${statusCode}] Resposta: ${body}`);
      return { sucesso: false, erro: `HTTP ${statusCode}: ${body.substring(0, 200)}` };
    }

  } catch (err) {
    Logger.log(`[FETCH ERRO] ${err.message}`);
    return { sucesso: false, erro: err.message };
  }
}


// ═══════════════════════════════════════════════════════════════
//  SINCRONIZAÇÃO EM LOTE — sincroniza todas as linhas pendentes
//  Execute manualmente: Extensões → Apps Script → sincronizarTudo()
// ═══════════════════════════════════════════════════════════════
function sincronizarTudo() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ABA_SALES);

  if (!sheet) {
    Logger.log(`[ERRO] Aba "${ABA_SALES}" não encontrada.`);
    return;
  }

  const ultimaLinha = sheet.getLastRow();
  let enviados = 0, erros = 0, pulados = 0;

  Logger.log(`[INÍCIO] Sincronizando linhas ${PRIMEIRA_LINHA} até ${ultimaLinha}...`);

  for (let row = PRIMEIRA_LINHA; row <= ultimaLinha; row++) {
    const status = sheet.getRange(row, STATUS_COL).getValue();

    if (status === '✅ Sincronizado') {
      pulados++;
      continue;
    }

    const dados = extrairLinha(sheet, row);

    if (!linhaCompleta(dados)) {
      pulados++;
      continue;
    }

    const resultado = enviarParaSupabase(dados);

    if (resultado.sucesso) {
      sheet.getRange(row, STATUS_COL).setValue('✅ Sincronizado');
      sheet.getRange(row, STATUS_COL).setFontColor('#10b981');
      enviados++;
      Logger.log(`[OK] Linha ${row} → ID ${resultado.id}`);
    } else {
      sheet.getRange(row, STATUS_COL).setValue('❌ Erro');
      sheet.getRange(row, STATUS_COL).setFontColor('#ef4444');
      erros++;
      Logger.log(`[ERRO] Linha ${row}: ${resultado.erro}`);
    }

    // Pausa de 200ms para não exceder quota da API
    Utilities.sleep(200);
  }

  const msg = `Sync concluído: ${enviados} enviados, ${erros} erros, ${pulados} pulados.`;
  Logger.log(`[FIM] ${msg}`);
  SpreadsheetApp.getUi().alert(msg);
}


// ═══════════════════════════════════════════════════════════════
//  INSTALAR TODOS OS GATILHOS — rode uma vez
//  Execute: instalarTodosGatilhos() no editor do Apps Script
// ═══════════════════════════════════════════════════════════════
function instalarTodosGatilhos() {
  // Remove todos os gatilhos anteriores para evitar duplicatas
  ScriptApp.getProjectTriggers().forEach(g => ScriptApp.deleteTrigger(g));
  Logger.log('[INFO] Gatilhos anteriores removidos.');

  // 1. onEdit — sincroniza linha imediatamente ao editar
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  Logger.log('[OK] Gatilho onEdit instalado.');

  // 2. onChange — captura colagem em lote (paste de múltiplas linhas)
  ScriptApp.newTrigger('onChangeBatch')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onChange()
    .create();
  Logger.log('[OK] Gatilho onChange (lote) instalado.');

  // 3. Time-driven — sincronização diária às 07:00 (garante fallback)
  ScriptApp.newTrigger('sincronizarTudo')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  Logger.log('[OK] Gatilho diário às 07h instalado.');

  SpreadsheetApp.getUi().alert(
    '✅ 3 gatilhos instalados:\n' +
    '• onEdit — sync imediato ao editar\n' +
    '• onChange — sync ao colar em lote\n' +
    '• Diário às 07h — sync completo de fallback'
  );
}

// Mantido por retrocompatibilidade
function instalarGatilho() { instalarTodosGatilhos(); }


// ═══════════════════════════════════════════════════════════════
//  onChange BATCH — captura colagem de múltiplas linhas de uma vez
// ═══════════════════════════════════════════════════════════════
function onChangeBatch(e) {
  try {
    // Só age em INSERT ou PASTE (não em DELETE ou FORMAT)
    if (e.changeType !== 'INSERT_ROW' && e.changeType !== 'OTHER') return;

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(ABA_SALES);
    if (!sheet) return;

    const ultimaLinha = sheet.getLastRow();
    let enviados = 0;

    for (let row = PRIMEIRA_LINHA; row <= ultimaLinha; row++) {
      const status = sheet.getRange(row, STATUS_COL).getValue();
      if (status === '✅ Sincronizado') continue;

      const dados = extrairLinha(sheet, row);
      if (!linhaCompleta(dados)) continue;

      const resultado = enviarParaSupabase(dados);

      if (resultado.sucesso) {
        sheet.getRange(row, STATUS_COL).setValue('✅ Sincronizado');
        sheet.getRange(row, STATUS_COL).setFontColor('#10b981');
        enviados++;
        Logger.log(`[onChange] Linha ${row} sincronizada → ID ${resultado.id}`);
      } else {
        sheet.getRange(row, STATUS_COL).setValue('❌ Erro');
        sheet.getRange(row, STATUS_COL).setFontColor('#ef4444');
        Logger.log(`[onChange] Linha ${row} erro: ${resultado.erro}`);
      }

      Utilities.sleep(150);
    }

    if (enviados > 0) Logger.log(`[onChange] ${enviados} linha(s) sincronizada(s).`);

  } catch(err) {
    Logger.log(`[EXCEÇÃO] onChangeBatch: ${err.message}`);
  }
}


// ═══════════════════════════════════════════════════════════════
//  TESTAR CONEXÃO — valida se a chave e a URL estão corretas
//  Execute: testarConexao() no editor do Apps Script
// ═══════════════════════════════════════════════════════════════
function testarConexao() {
  const url = `${SUPABASE_URL}/rest/v1/sales?select=id&limit=1`;

  const options = {
    method: 'GET',
    headers: {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    muteHttpExceptions: true,
  };

  const response   = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const body       = response.getContentText();

  if (statusCode === 200) {
    const msg = `✅ Conexão OK! Supabase respondeu com status 200.\nResposta: ${body}`;
    Logger.log(msg);
    SpreadsheetApp.getUi().alert(msg);
  } else {
    const msg = `❌ Falha na conexão.\nStatus: ${statusCode}\nResposta: ${body}`;
    Logger.log(msg);
    SpreadsheetApp.getUi().alert(msg);
  }
}


// ═══════════════════════════════════════════════════════════════
//  CRIAR CABEÇALHO — configura a aba "sales" com as colunas certas
//  Execute: criarCabecalho() apenas na primeira vez
// ═══════════════════════════════════════════════════════════════
function criarCabecalho() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(ABA_SALES);

  if (!sheet) {
    sheet = ss.insertSheet(ABA_SALES);
    Logger.log(`[INFO] Aba "${ABA_SALES}" criada.`);
  }

  const cabecalho = [
    'sale_date','year','month','month_name','week_of_year',
    'seller_name','region','channel','product','category',
    'quantity','unit_price','gross_revenue','discount','net_revenue',
    'Status Sync'
  ];

  sheet.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);
  sheet.getRange(1, 1, 1, cabecalho.length)
    .setFontWeight('bold')
    .setBackground('#1e293b')
    .setFontColor('#f1f5f9');

  // Congelar linha de cabeçalho
  sheet.setFrozenRows(1);

  Logger.log('[OK] Cabeçalho criado.');
  SpreadsheetApp.getUi().alert('✅ Cabeçalho configurado na aba "sales".');
}

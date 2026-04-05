const fs = require('fs');
const config = `const CONFIG = {
  SUPABASE_URL: '${process.env.SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY}',
  OPENAI_API_KEY: '${process.env.OPENAI_API_KEY}'
};`;
fs.writeFileSync('./outputs/config.js', config);
console.log('config.js gerado com sucesso');
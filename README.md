# Montagem Live - Cartola FC

Ferramenta para montagem de times do Cartola FC com dados atualizados em tempo real.

## 🚀 Deploy no Netlify

### Pré-requisitos
- Conta no [Netlify](https://netlify.com)
- Repositório no GitHub com os arquivos do projeto

### Passos para Deploy

1. **Conectar Repositório**
   - Acesse o Netlify e clique em "New site from Git"
   - Conecte sua conta do GitHub
   - Selecione o repositório `montagem-live`

2. **Configurações de Build**
   - Build command: (deixe vazio)
   - Publish directory: `.` (raiz do projeto)
   - Functions directory: `netlify/functions`

3. **Deploy**
   - Clique em "Deploy site"
   - Aguarde o deploy ser concluído

## 🔧 Funcionalidades

### API do Cartola FC
- ✅ Conexão com API oficial do Cartola FC
- ✅ Proxy via Netlify Functions (resolve problemas de CORS)
- ✅ Fallback automático para dados locais (CSV) em caso de falha
- ✅ Atualização automática a cada 30 minutos
- ✅ Indicador visual do status do mercado

### Interface
- Drag & Drop para montagem de times
- Busca de jogadores por nome
- Filtros por posição e clube
- Visualização de preços atualizados
- Estatísticas dos jogadores

## 🛠️ Resolução de Problemas

### Preços não estão atualizando
1. Verifique se o site está rodando no Netlify (não localmente)
2. Clique no botão "Atualizar Mercado" se disponível
3. Verifique o console do navegador para erros
4. Se persistir, a API pode estar indisponível (usará dados do CSV)

### Erro de CORS
- ✅ **Resolvido**: O projeto agora usa Netlify Functions como proxy
- A API é acessada via `/api/cartola/` em vez de diretamente

### Função Netlify não funciona
1. Verifique se o arquivo `netlify.toml` está na raiz
2. Confirme que a pasta `netlify/functions` existe
3. Verifique os logs do Netlify para erros de deploy

## 📁 Estrutura do Projeto

```
montagem-live/
├── netlify/
│   └── functions/
│       └── cartola-api.js     # Proxy para API do Cartola
├── js/
│   ├── app.js                 # Lógica principal da aplicação
│   ├── players.js             # Gerenciamento de jogadores e API
│   ├── dnd.js                 # Drag & Drop
│   └── shields-data.js        # Dados dos escudos
├── css/
│   └── style.css              # Estilos da aplicação
├── assets/                    # Imagens e recursos
├── index.html                 # Página principal
├── netlify.toml              # Configurações do Netlify
└── cartola_jogadores_*.csv   # Dados de fallback
```

## 🔄 Como Funciona a API

1. **Primeira tentativa**: Busca dados via Netlify Function (`/api/cartola/`)
2. **Proxy**: A função Netlify acessa `https://api.cartola.globo.com/`
3. **Fallback**: Se falhar, usa dados do arquivo CSV local
4. **Atualização**: Tenta novamente a cada 30 minutos automaticamente

## 📊 Status do Mercado

- 🟢 **Mercado Aberto**: Dados atualizados da API
- 🔴 **Mercado Fechado**: Dados da API (podem estar desatualizados)
- 📁 **Dados Locais**: Usando arquivo CSV como fallback

## 🚨 Monitoramento

Para verificar se a API está funcionando:
1. Abra o console do navegador (F12)
2. Procure por mensagens como:
   - ✅ "Dados da API carregados com sucesso!"
   - ⚠️ "Erro ao buscar API do Cartola, usando CSV como fallback"

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do console do navegador
2. Confirme que o deploy no Netlify foi bem-sucedido
3. Teste a função diretamente: `https://seu-site.netlify.app/api/cartola/mercado/status`
# Neon Gym

App de treino (segunda a sexta) com login, dados no Postgres e instalação pelo navegador (PWA).

## Estrutura

```
neon-gym/
├── server.js        servidor Node: API de login, API de dados e arquivos do app
├── package.json
├── render.yaml      receita para criar tudo na Render de uma vez (opcional)
├── .gitignore
└── public/
    ├── index.html   o app
    ├── manifest.json
    ├── sw.js        service worker (abre mesmo sem internet)
    ├── icon-192.png
    └── icon-512.png
```

## Colocar no ar na Render

1. Crie um repositório no GitHub e envie o conteúdo desta pasta (a pasta `public` e o `server.js` ficam na raiz do repositório).
2. Na Render, escolha **New → Blueprint**, conecte o repositório e confirme. O `render.yaml` cria o banco e o serviço, e já preenche `DATABASE_URL` e `JWT_SECRET`.

Se preferir fazer manualmente:

1. **New → PostgreSQL**, e copie a *Internal Database URL*.
2. **New → Web Service** com o repositório. Build Command: `npm install`. Start Command: `node server.js`.
3. Em Environment, adicione `DATABASE_URL` (a URL do passo 1) e `JWT_SECRET` (uma frase longa e aleatória).

## Instalar no celular

Abra o endereço `onrender.com` no navegador e use "Instalar app" (Chrome/Android) ou Compartilhar → "Adicionar à Tela de Início" (iPhone). O ícone é o `icon-512.png`; para trocar a logo, substitua os dois PNGs mantendo os tamanhos 192×192 e 512×512.

## Testar no seu computador (opcional)

```
npm install
set DATABASE_URL=sua_url_externa_do_postgres
set JWT_SECRET=qualquer_frase_longa
set PGSSL=true
node server.js
```

No Mac/Linux, troque `set` por `export`. Abra http://localhost:3000.
`PGSSL=true` só é necessário com a *External Database URL*. Com a *Internal Database URL* (dentro da Render), não use.

## Limites do plano grátis da Render

- O Postgres grátis expira 30 dias após a criação (com um prazo de carência para fazer upgrade antes de apagar). Para um histórico de treino de longo prazo, use um plano pago.
- O serviço grátis dorme após 15 minutos sem acesso, e o primeiro acesso depois disso demora cerca de um minuto.
- Confira os valores e regras atuais em render.com/pricing e render.com/docs/free.

## Como funciona

O app guarda todo o estado do usuário em um único objeto JSON. Ele é salvo no navegador (cache) e enviado ao servidor, que grava na coluna `estado` da tabela `usuarios`. As senhas são guardadas com hash (bcrypt) e a sessão usa um token JWT de 90 dias.

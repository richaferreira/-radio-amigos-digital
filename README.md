# Rádio Amigos Digital

Plataforma web de rádio responsiva para até 100 ouvintes iniciais, com frontend SPA leve, backend Flask, MySQL, Redis, Socket.IO e integração futura com AzuraCast/Icecast.

## Identidade visual RAD
- Marca **Rádio Amigos Digital (RAD)** aplicada no site, painel e relatórios.
- Home em estilo neon/glass, com animações, equalizador e player destacado.
- Artes locais em SVG: logo, hero musical, capas padrão de programas/DJs e memes originais.
- Área **Memes da Galera** pronta para receber artes, fotos, reels e conteúdos da comunidade.
- Layout mobile-first otimizado para desktop, tablet e celular.

## Recursos implementados
- Player sticky persistente durante a navegação interna da SPA.
- Integração configurável de stream e endpoint de metadados compatível com AzuraCast.
- Música/artista atual, modo AO VIVO/AUTO e ouvintes quando o provedor expõe esses dados.
- Histórico de faixas e ranking com estrutura de banco pronta.
- Chat em tempo real, entrada por apelido, persistência, papéis, mute/ban, exclusão e anti-flood.
- Pedidos de música, dedicatórias e fila de aprovação.
- Enquetes em tempo real.
- Grade de programação e perfis de locutores.
- Painel administrativo com métricas, usuários, chat, pedidos, dedicatórias, programação, enquete, mídia e relatórios CSV/PDF.
- RBAC: listener, dj, moderator, admin.
- Auditoria de ações administrativas.
- Docker Compose com aplicação, MySQL e Redis.
- Páginas iniciais de termos e privacidade.

## Execução mais simples com Docker
1. Copie `.env.example` para `.env`.
2. Troque `SECRET_KEY`, `JWT_SECRET_KEY`, `MYSQL_PASSWORD` e `MYSQL_ROOT_PASSWORD` por valores fortes.
3. Execute `docker compose up --build`.
4. Abra `http://localhost:5000`.
5. Crie o primeiro administrador: `docker compose exec web python scripts/create_admin.py`.
6. Painel: `http://localhost:5000/admin`.

O projeto **não publica credenciais administrativas padrão**. O primeiro administrador é criado interativamente pelo script acima.

## Execução sem Docker
Crie um MySQL chamado `radio_amigos_digital`, ajuste `DATABASE_URL`, inicie Redis e então:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Configurar streaming depois
Quando escolher AzuraCast/Icecast, edite `.env`:

```env
STREAM_URL=https://SEU-DOMINIO/stream
STREAM_STATUS_URL=https://SEU-DOMINIO/api/nowplaying/ID_DA_ESTACAO
```

O código não depende do stream para subir: enquanto ele não for definido, o site mostra estado "não configurado" sem quebrar o player ou o painel.

## Produção
Use Nginx como reverse proxy, HTTPS obrigatório, senhas fortes, backups do MySQL e Redis e um domínio próprio. Para até 100 ouvintes, o streaming de áudio deve ficar no AzuraCast/Icecast; o servidor web não deve retransmitir o áudio pelo Flask.

## Concorrência do chat
A imagem Docker usa Gunicorn com 1 worker e 100 threads. Redis já está configurado como message queue do Socket.IO quando disponível, deixando o projeto preparado para escalar depois com múltiplas instâncias atrás de Nginx com sticky sessions.

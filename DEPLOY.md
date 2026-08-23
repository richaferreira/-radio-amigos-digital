# Manual de instalação e deploy

## Arquitetura recomendada para baixo custo
- 1 VPS Linux para site/API + MySQL + Redis no início.
- Streaming em AzuraCast/Icecast na mesma VPS apenas se houver CPU/RAM/banda suficientes; preferencialmente em serviço/servidor separado quando a audiência crescer.
- Nginx na frente do Gunicorn com worker threaded e suporte WebSocket.
- HTTPS via Let's Encrypt.

## Dimensionamento inicial
Para o site/API e chat de até 100 ouvintes: 2 vCPU, 2–4 GB RAM e SSD são suficientes na maioria dos cenários. A banda do áudio depende diretamente do bitrate e quantidade de ouvintes; por isso o stream deve ser dimensionado separadamente.

## Passos
1. Instale Docker e Docker Compose.
2. Faça upload do projeto.
3. Crie `.env` com segredos fortes.
4. Rode `docker compose up -d --build`.
5. Valide `curl http://127.0.0.1:5000/health`.
6. Crie o primeiro administrador com `docker compose exec web python scripts/create_admin.py`.
7. Configure Nginx com proxy HTTP e suporte a WebSocket para Socket.IO.
8. Emita certificado TLS.
9. Configure backup diário do volume MySQL e dos uploads.
10. Após definir a rádio, preencha `STREAM_URL` e `STREAM_STATUS_URL`.

## WebSocket no Nginx
O proxy deve encaminhar `Upgrade` e `Connection` para `/socket.io/`.

## Homologação
Use um subdomínio como `homolog.radio...` com banco separado. Só promova para produção após testar login, chat, moderação, pedidos, grade, enquete, relatórios e reconexão do player.

## Backup automático
O projeto inclui `scripts/backup.sh`. Em Linux, agende com cron, por exemplo diariamente às 03:30. O script mantém 14 dias de backups locais; em produção, copie também para armazenamento externo.

## Meta de disponibilidade
A aplicação foi preparada para uma meta operacional de 99,9%, mas uma única VPS de baixo custo não oferece redundância física. Para SLA real de 99,9%, use banco/Redis gerenciados ou réplica, health checks externos e pelo menos duas instâncias web atrás de balanceador.

## Homologação local
Para iniciar a variante local de homologação em outra porta: `docker compose -f docker-compose.yml -f docker-compose.homolog.yml up -d --build`. Em produção, use banco e segredos separados.

# Manual do Painel Administrativo

## Primeiro administrador
Antes do primeiro login, execute `python scripts/create_admin.py` (ou `docker compose exec web python scripts/create_admin.py` quando estiver usando Docker) e informe usuário, e-mail opcional, nome exibido e uma senha forte.

Acesse `/admin`.

## Papéis
- Ouvinte: site e recursos interativos.
- DJ/Locutor: dashboard, pedidos, dedicatórias e programação em leitura.
- Moderador: inclui moderação do chat e usuários em leitura.
- Administrador: acesso completo, alteração de papéis, grade, enquetes, mídia, relatórios e configurações de API.

## Pedidos
Use Aprovar, Tocada ou Rejeitar. A fila pública mostra pedidos pendentes/aprovados.

## Dedicatórias
Aprove, marque como lida ou rejeite.

## Programação
Cadastre nome, locutor, dia e horário. A grade pública atualiza pela API.

## Chat
Apague mensagens inadequadas. Em Usuários, mute ou bana contas cadastradas.

## Enquetes
Ao criar uma nova enquete, a enquete ativa anterior é encerrada. Resultados são atualizados por Socket.IO.

## Mídia
Envie PNG, JPG, WEBP, GIF, MP3 ou OGG. Os arquivos ficam em `uploads/`.

## Relatórios
Baixe o resumo operacional em CSV ou PDF.

## Segurança operacional
Use senhas fortes, HTTPS, não compartilhe contas administrativas e revise periodicamente o log de auditoria.

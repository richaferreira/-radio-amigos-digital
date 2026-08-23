from getpass import getpass
from backend import create_app
from backend.extensions import db
from backend.models import User

app=create_app()
with app.app_context():
    username=input("Usuário: ").strip(); email=input("E-mail: ").strip() or None; display=input("Nome exibido: ").strip() or username; password=getpass("Senha: ")
    if User.query.filter_by(username=username).first(): raise SystemExit("Usuário já existe")
    u=User(username=username,email=email,display_name=display,role="admin");u.set_password(password);db.session.add(u);db.session.commit();print("Administrador criado.")

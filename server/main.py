try:
    from .app.factory import create_app
except ImportError:
    from app.factory import create_app

app = create_app()

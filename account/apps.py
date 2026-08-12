from django.apps import AppConfig


class AccountConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "account"
    # FIX: rename label so it doesn't clash with allauth.account (label='account')
    label = "user_account"

    def ready(self):
        from . import signals  # noqa: F401
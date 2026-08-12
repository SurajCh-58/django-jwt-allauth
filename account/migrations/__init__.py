# Explicitly declare the AppConfig so Django never falls back to auto-discovery,
# which would re-register the default 'account' label and clash with allauth.
default_app_config = "account.apps.AccountConfig"
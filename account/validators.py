import phonenumbers

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from rest_framework import serializers


def validate_image(image):
    max_size = 2 * 1024 * 1024  # 2 MB

    if image.size > max_size:
        raise ValidationError("Image must be less than 2 MB.")

    return image


def validate_phone(value):
    value = value.strip()

    try:
        phone = phonenumbers.parse(value, None)
    except phonenumbers.NumberParseException:
        raise serializers.ValidationError(
            "Enter a valid phone number."
        )

    if not phonenumbers.is_valid_number(phone):
        raise serializers.ValidationError(
            "Enter a valid phone number."
        )

    return phonenumbers.format_number(
        phone,
        phonenumbers.PhoneNumberFormat.E164,
    )


username_validator = RegexValidator(
    regex=r"^[a-z0-9_]{3,30}$",
    message=(
        "Username must be 3-30 characters and contain "
        "only lowercase letters, numbers, and underscores."
    ),
)


def username_validate_rule(value):
    username = value.strip()
    username_validator(username)
    return username
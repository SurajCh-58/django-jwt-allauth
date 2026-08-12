from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


from .models import Profile
from .validators import username_validate_rule, validate_image, validate_phone

User = get_user_model()


# ── Profile ──────────────────────────────────────────────────────────────────

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["id", "profile_image", "phone"]

    def validate_profile_image(self, image):
        return validate_image(image)

    def validate_phone(self, phone):
        if not phone:
            return phone
        return validate_phone(phone)


# ── Register ─────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "password", "password_confirm"]
        extra_kwargs = {
            "username": {"help_text": None},
        }

    def validate_username(self, value):
        username = username_validate_rule(value)
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Username already exists.")
        return username

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Email already registered.")
        return email

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords did not match."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user


# ── Update ───────────────────────────────────────────────────────────────────

class UserUpdateSerializer(serializers.ModelSerializer):
    # Nested writable profile
    profile = ProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ["username", "first_name", "last_name", "email", "profile"]

    def validate_username(self, value):
        username = username_validate_rule(value)
        queryset = User.objects.filter(username__iexact=username)
        if self.instance:
            # FIX: was exclude(pk=self.instance) — must be exclude(pk=self.instance.pk)
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Username already exists.")
        return username

    def validate_email(self, value):
        email = value.strip().lower()
        queryset = User.objects.filter(email__iexact=email)
        if self.instance:
            # FIX: same pk bug as above
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Email already exists.")
        return email

    @transaction.atomic
    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance


# ── JWT ──────────────────────────────────────────────────────────────────────

class CustomTokenSerializer(TokenObtainPairSerializer):
    """Adds username & email to the JWT payload."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["email"] = user.email
        return token


# ── Logout ───────────────────────────────────────────────────────────────────

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


# ── Social Auth ───────────────────────────────────────────────────────────────
class GoogleLoginSerializer(serializers.Serializer):
    token=serializers.CharField()
import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.services.auth_service import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token_value,
    get_user_by_email,
    get_user_by_id,
    hash_password,
    revoke_all_password_reset_tokens,
    revoke_refresh_token,
    store_refresh_token,
    update_user_password,
    verify_password,
    verify_password_reset_token,
    verify_refresh_token,
)
from app.services.email_service import send_password_reset_email, send_welcome_email
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check existing user
    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=body.email,
        username=body.username,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(str(user.id))
    refresh_value = create_refresh_token_value()
    await store_refresh_token(db, str(user.id), refresh_value)

    asyncio.create_task(send_welcome_email(user.email, user.username))

    return TokenResponse(access_token=access_token, refresh_token=refresh_value)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(str(user.id))
    refresh_value = create_refresh_token_value()
    await store_refresh_token(db, str(user.id), refresh_value)

    return TokenResponse(access_token=access_token, refresh_token=refresh_value)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    rt = await verify_refresh_token(db, body.refresh_token)
    if rt is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Revoke old token and issue new pair
    await revoke_refresh_token(db, rt)

    access_token = create_access_token(str(rt.user_id))
    new_refresh = create_refresh_token_value()
    await store_refresh_token(db, str(rt.user_id), new_refresh)

    return TokenResponse(access_token=access_token, refresh_token=new_refresh)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, body.email)
    if user:
        token = await create_password_reset_token(db, str(user.id))
        asyncio.create_task(
            send_password_reset_email(user.email, user.username, token)
        )
    return MessageResponse(message="Если аккаунт существует, письмо отправлено")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    prt = await verify_password_reset_token(db, body.token)
    if prt is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительная или просроченная ссылка",
        )
    user = await get_user_by_id(db, str(prt.user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь не найден",
        )
    await update_user_password(db, user, body.new_password)
    await revoke_all_password_reset_tokens(db, str(user.id))
    return MessageResponse(message="Пароль успешно изменён")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль",
        )
    await update_user_password(db, user, body.new_password)
    return MessageResponse(message="Пароль успешно изменён")

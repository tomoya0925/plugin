import os
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# --- 1. データベース設定 ---
# クラウド（Render）の環境変数からURLを取得。なければPC用のSQLiteを使う（賢い切り替え設計）
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./coworking_app.db")

# SQLAlchemyの仕様に合わせてURLの先頭を少し整える処理
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 2. SQLAlchemy モデル ---
class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String(50), nullable=False)
    bio = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    checkins = relationship("Checkin", back_populates="user")

# 【追加】リアクションを保存する新しいテーブル
class Reaction(Base):
    __tablename__ = "reactions"
    reaction_id = Column(Integer, primary_key=True, index=True)
    checkin_id = Column(Integer, ForeignKey("checkins.checkin_id"), nullable=False)
    sender_nickname = Column(String(50), nullable=False) # 誰が送ったか
    reaction_type = Column(String(20), nullable=False)   # "like" または "talk"
    created_at = Column(DateTime, default=datetime.utcnow)
    checkin = relationship("Checkin", back_populates="reactions")

class Comment(Base):
    __tablename__ = "comments"
    comment_id = Column(Integer, primary_key=True, index=True)
    checkin_id = Column(Integer, ForeignKey("checkins.checkin_id"), nullable=False)
    sender_nickname = Column(String(50), nullable=False)
    body = Column(String(300), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    checkin = relationship("Checkin", back_populates="comments")

class LongTermProfile(Base):
    __tablename__ = "long_term_profiles"
    profile_id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String(50), nullable=False, unique=True, index=True)
    current_focus = Column(String(120), nullable=False)
    desired_connections = Column(String(120), nullable=False)
    profile_text = Column(String(800), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Checkin(Base):
    __tablename__ = "checkins"
    checkin_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    nickname = Column(String(50), nullable=False)
    avatar_id = Column(String(50), nullable=False)
    seat_number = Column(String(20), nullable=False)
    task_description = Column(String(40), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="checkins")
    # 【追加】チェックインとリアクションを紐付ける
    reactions = relationship("Reaction", back_populates="checkin", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="checkin", cascade="all, delete-orphan")

Base.metadata.create_all(bind=engine)

# --- 3. Pydantic モデル ---
class ReactionCreate(BaseModel):
    sender_nickname: str
    reaction_type: str

class ReactionResponse(BaseModel):
    reaction_id: int
    sender_nickname: str
    reaction_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    sender_nickname: str
    body: str

class CommentResponse(BaseModel):
    comment_id: int
    sender_nickname: str
    body: str
    created_at: datetime

    class Config:
        from_attributes = True

class LongTermProfileUpsert(BaseModel):
    nickname: str
    current_focus: str
    desired_connections: str
    profile_text: Optional[str] = None

class LongTermProfileResponse(BaseModel):
    profile_id: int
    nickname: str
    current_focus: str
    desired_connections: str
    profile_text: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class CheckinCreate(BaseModel):
    user_id: int
    nickname: str
    avatar_id: str
    seat_number: str
    task_description: str

class CheckinResponse(BaseModel):
    checkin_id: int
    user_id: int
    nickname: str
    avatar_id: str
    seat_number: str
    task_description: str
    is_active: bool
    reactions: List[ReactionResponse] = [] # 【追加】一緒にリアクションも返す
    comments: List[CommentResponse] = []

    class Config:
        from_attributes = True

# --- 4. API エンドポイント ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 全てのサイトからのアクセスを許可
    allow_credentials=True,
    allow_methods=["*"], # GET, POST, DELETEなど全て許可
    allow_headers=["*"], # 全てのヘッダーを許可
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/checkins/", response_model=CheckinResponse)
def create_checkin(checkin: CheckinCreate, db: Session = Depends(get_db)):
    db_checkin = Checkin(**checkin.model_dump())
    db.add(db_checkin)
    db.commit()
    db.refresh(db_checkin)
    return db_checkin

@app.get("/checkins/", response_model=List[CheckinResponse])
def get_active_checkins(db: Session = Depends(get_db)):
    return db.query(Checkin).filter(Checkin.is_active == True).all()

@app.delete("/checkins/{checkin_id}", status_code=status.HTTP_204_NO_CONTENT)
def checkout_checkin(checkin_id: int, db: Session = Depends(get_db)):
    db_checkin = db.query(Checkin).filter(Checkin.checkin_id == checkin_id).first()
    if not db_checkin:
        raise HTTPException(status_code=404, detail="Checkin not found")
    db_checkin.is_active = False
    db.commit()
    return None

# 【新設】リアクションを受け付けるAPI
@app.post("/checkins/{checkin_id}/reactions/", response_model=ReactionResponse)
def add_reaction(checkin_id: int, reaction: ReactionCreate, db: Session = Depends(get_db)):
    db_checkin = db.query(Checkin).filter(Checkin.checkin_id == checkin_id).first()
    if not db_checkin:
        raise HTTPException(status_code=404, detail="Checkin not found")
    
    db_reaction = Reaction(checkin_id=checkin_id, sender_nickname=reaction.sender_nickname, reaction_type=reaction.reaction_type)
    db.add(db_reaction)
    db.commit()
    db.refresh(db_reaction)
    return db_reaction

@app.post("/checkins/{checkin_id}/comments/", response_model=CommentResponse)
def add_comment(checkin_id: int, comment: CommentCreate, db: Session = Depends(get_db)):
    db_checkin = db.query(Checkin).filter(Checkin.checkin_id == checkin_id).first()
    if not db_checkin:
        raise HTTPException(status_code=404, detail="Checkin not found")

    body = comment.body.strip()
    if not body:
        raise HTTPException(status_code=400, detail="Comment body is required")

    db_comment = Comment(checkin_id=checkin_id, sender_nickname=comment.sender_nickname, body=body)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

@app.get("/long-term-profiles/", response_model=List[LongTermProfileResponse])
def get_long_term_profiles(db: Session = Depends(get_db)):
    return db.query(LongTermProfile).order_by(LongTermProfile.updated_at.desc()).all()

@app.get("/long-term-profiles/{nickname}", response_model=LongTermProfileResponse)
def get_long_term_profile(nickname: str, db: Session = Depends(get_db)):
    db_profile = db.query(LongTermProfile).filter(LongTermProfile.nickname == nickname).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile

@app.post("/long-term-profiles/", response_model=LongTermProfileResponse)
def upsert_long_term_profile(profile: LongTermProfileUpsert, db: Session = Depends(get_db)):
    nickname = profile.nickname.strip()
    if not nickname:
        raise HTTPException(status_code=400, detail="Nickname is required")

    db_profile = db.query(LongTermProfile).filter(LongTermProfile.nickname == nickname).first()
    if db_profile:
        db_profile.current_focus = profile.current_focus
        db_profile.desired_connections = profile.desired_connections
        db_profile.profile_text = profile.profile_text
        db_profile.updated_at = datetime.utcnow()
    else:
        db_profile = LongTermProfile(
            nickname=nickname,
            current_focus=profile.current_focus,
            desired_connections=profile.desired_connections,
            profile_text=profile.profile_text,
        )
        db.add(db_profile)

    db.commit()
    db.refresh(db_profile)
    return db_profile

@app.post("/checkins/reset-all/")
def reset_all_checkins(db: Session = Depends(get_db)):
    # is_active が True のものをすべて取得して False に更新
    active_checkins = db.query(Checkin).filter(Checkin.is_active == True).all()
    for checkin in active_checkins:
        checkin.is_active = False
    db.commit()
    return {"message": f"{len(active_checkins)} 名を退出させました"}

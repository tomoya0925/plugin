import os
from datetime import datetime
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from pydantic import BaseModel

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

Base.metadata.create_all(bind=engine)

# --- 3. Pydantic モデル ---
class ReactionCreate(BaseModel):
    sender_nickname: str
    reaction_type: str

class ReactionResponse(BaseModel):
    reaction_id: int
    sender_nickname: str
    reaction_type: str

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

    class Config:
        from_attributes = True

# --- 4. API エンドポイント ---
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
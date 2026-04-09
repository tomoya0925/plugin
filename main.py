from datetime import datetime
from typing import List
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from pydantic import BaseModel # 追加：APIのデータチェック用

# --- 1. データベース設定 ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./coworking_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 2. SQLAlchemy モデル (DBのテーブル設計) ---
class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String(50), nullable=False)
    bio = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    checkins = relationship("Checkin", back_populates="user")
    reactions = relationship("Reaction", back_populates="user")

class Checkin(Base):
    __tablename__ = "checkins"
    checkin_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    seat_number = Column(String(20), nullable=False)
    task_description = Column(String(40), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    user = relationship("User", back_populates="checkins")
    reactions = relationship("Reaction", back_populates="checkin")

class Reaction(Base):
    __tablename__ = "reactions"
    reaction_id = Column(Integer, primary_key=True, index=True)
    checkin_id = Column(Integer, ForeignKey("checkins.checkin_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    reaction_type = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    user = relationship("User", back_populates="reactions")
    checkin = relationship("Checkin", back_populates="reactions")
    __table_args__ = (UniqueConstraint('checkin_id', 'user_id', 'reaction_type', name='uix_reaction'),)

Base.metadata.create_all(bind=engine)

# --- 3. Pydantic モデル (APIで受け渡すデータのルール) ---
class UserCreate(BaseModel):
    nickname: str
    bio: str | None = None

class CheckinCreate(BaseModel):
    user_id: int
    seat_number: str
    task_description: str

class CheckinResponse(BaseModel):
    checkin_id: int
    user_id: int
    seat_number: str
    task_description: str
    is_active: bool

    class Config:
        from_attributes = True

# --- 4. FastAPI アプリケーションと API エンドポイント ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発中はどこからの通信でも許可する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DBセッション（接続）を管理する関数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "コワーキングアプリのAPIサーバーが起動しました！"}

# 【API 1】ユーザー作成 (テスト用)
@app.post("/users/")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(nickname=user.nickname, bio=user.bio)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# 【API 2】チェックイン情報を保存する
@app.post("/checkins/", response_model=CheckinResponse)
def create_checkin(checkin: CheckinCreate, db: Session = Depends(get_db)):
    db_checkin = Checkin(**checkin.model_dump())
    db.add(db_checkin)
    db.commit()
    db.refresh(db_checkin)
    return db_checkin

# 【API 3】現在のタイムライン（チェックイン一覧）を取得する
@app.get("/checkins/", response_model=List[CheckinResponse])
def get_active_checkins(db: Session = Depends(get_db)):
    # is_activeがTrue（現在滞在中）のチェックインだけを抽出
    return db.query(Checkin).filter(Checkin.is_active == True).all()
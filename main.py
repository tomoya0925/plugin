from datetime import datetime
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from pydantic import BaseModel

# --- 1. データベース設定 ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./coworking_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
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

class Checkin(Base):
    __tablename__ = "checkins"
    checkin_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    # 【追加】ニックネームとアバターIDを保存する列
    nickname = Column(String(50), nullable=False)
    avatar_id = Column(String(50), nullable=False)
    seat_number = Column(String(20), nullable=False)
    task_description = Column(String(40), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="checkins")

# テーブルの作成
Base.metadata.create_all(bind=engine)

# --- 3. Pydantic モデル ---
class CheckinCreate(BaseModel):
    user_id: int
    nickname: str # 追加
    avatar_id: str # 追加
    seat_number: str
    task_description: str

class CheckinResponse(BaseModel):
    checkin_id: int
    user_id: int
    nickname: str # 追加
    avatar_id: str # 追加
    seat_number: str
    task_description: str
    is_active: bool

    class Config:
        from_attributes = True

# --- 4. API エンドポイント ---
app = FastAPI()

# CORS設定（Reactからのアクセスを許可）
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

# 【更新】チェックインAPI（ニックネームとアバターを保存）
@app.post("/checkins/", response_model=CheckinResponse)
def create_checkin(checkin: CheckinCreate, db: Session = Depends(get_db)):
    db_checkin = Checkin(**checkin.model_dump())
    db.add(db_checkin)
    db.commit()
    db.refresh(db_checkin)
    return db_checkin

# 【取得】現在のチェックイン一覧
@app.get("/checkins/", response_model=List[CheckinResponse])
def get_active_checkins(db: Session = Depends(get_db)):
    return db.query(Checkin).filter(Checkin.is_active == True).all()

# 【追加】チェックアウトAPI（データを物理削除）
@app.delete("/checkins/{checkin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checkin(checkin_id: int, db: Session = Depends(get_db)):
    db_checkin = db.query(Checkin).filter(Checkin.checkin_id == checkin_id).first()
    if not db_checkin:
        raise HTTPException(status_code=404, detail="Checkin not found")
    
    db.delete(db_checkin)
    db.commit()
    return None
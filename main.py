from datetime import datetime
from fastapi import FastAPI
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# 1. データベースの接続設定 (MVP用にSQLiteを使用)
SQLALCHEMY_DATABASE_URL = "sqlite:///./coworking_app.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. モデルの定義 (テーブル設計をPythonクラスで表現)

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String(50), nullable=False)
    bio = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # リレーションシップ (他のテーブルとの繋がり)
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
    reaction_type = Column(String(20), nullable=False) # 例: "like", "lets_talk"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="reactions")
    checkin = relationship("Checkin", back_populates="reactions")

    # 1人が同じ投稿に何度も同じリアクションをするのを防ぐ制約
    __table_args__ = (
        UniqueConstraint('checkin_id', 'user_id', 'reaction_type', name='uix_reaction'),
    )

# 3. データベースにテーブルを作成する処理
Base.metadata.create_all(bind=engine)

# 4. FastAPIアプリケーションの立ち上げ
app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "コワーキングアプリのAPIサーバーが起動しました！"}
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

class JobInfo(Base):
    __tablename__ = "job_infos"
    job_info_id = Column(Integer, primary_key=True, index=True)
    submitter_nickname = Column(String(50), nullable=False, index=True)
    company_name = Column(String(120), nullable=False)
    role = Column(String(120), nullable=False)
    selection_type = Column(String(20), nullable=False)
    start_period = Column(String(50), nullable=False)
    end_period = Column(String(50), nullable=False)
    selection_features = Column(String(1000), nullable=False)
    company_impression = Column(String(1000), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

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

def ensure_database_schema():
    Base.metadata.create_all(bind=engine)

ensure_database_schema()

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

class JobInfoCreate(BaseModel):
    submitter_nickname: str
    company_name: str
    role: str
    selection_type: str
    start_period: str
    end_period: str
    selection_features: str
    company_impression: str

class JobInfoResponse(BaseModel):
    job_info_id: int
    submitter_nickname: str
    company_name: str
    role: str
    selection_type: str
    start_period: str
    end_period: str
    selection_features: str
    company_impression: str
    created_at: datetime

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

@app.delete("/long-term-profiles/{nickname}", status_code=status.HTTP_204_NO_CONTENT)
def delete_long_term_profile(nickname: str, db: Session = Depends(get_db)):
    db_profile = db.query(LongTermProfile).filter(LongTermProfile.nickname == nickname).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.delete(db_profile)
    db.commit()
    return None

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

@app.get("/job-infos/", response_model=List[JobInfoResponse])
def get_job_infos(db: Session = Depends(get_db)):
    ensure_database_schema()
    return db.query(JobInfo).order_by(JobInfo.created_at.desc()).all()

@app.post("/job-infos/", response_model=JobInfoResponse)
def create_job_info(job_info: JobInfoCreate, db: Session = Depends(get_db)):
    ensure_database_schema()
    payload = job_info.model_dump()
    required_fields = [
        "submitter_nickname",
        "company_name",
        "role",
        "selection_type",
        "start_period",
        "end_period",
        "selection_features",
        "company_impression",
    ]
    for field in required_fields:
        if not str(payload.get(field, "")).strip():
            raise HTTPException(status_code=400, detail=f"{field} is required")

    if payload["selection_type"] not in ["本選考", "インターン"]:
        raise HTTPException(status_code=400, detail="selection_type must be 本選考 or インターン")

    db_job_info = JobInfo(**payload)
    db.add(db_job_info)
    db.commit()
    db.refresh(db_job_info)
    return db_job_info

@app.delete("/job-infos/{job_info_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_info(
    job_info_id: int,
    requester_nickname: str,
    admin_key: Optional[str] = None,
    store_delete: bool = False,
    db: Session = Depends(get_db),
):
    ensure_database_schema()
    db_job_info = db.query(JobInfo).filter(JobInfo.job_info_id == job_info_id).first()
    if not db_job_info:
        raise HTTPException(status_code=404, detail="Job info not found")

    system_admin_key = os.getenv("JOB_INFO_ADMIN_KEY")
    is_owner = db_job_info.submitter_nickname == requester_nickname
    is_admin = bool(system_admin_key and admin_key and admin_key == system_admin_key)
    if not is_owner and not is_admin and not store_delete:
        raise HTTPException(status_code=403, detail="Not allowed to delete this job info")

    db.delete(db_job_info)
    db.commit()
    return None

@app.post("/checkins/reset-all/")
def reset_all_checkins(db: Session = Depends(get_db)):
    # is_active が True のものをすべて取得して False に更新
    active_checkins = db.query(Checkin).filter(Checkin.is_active == True).all()
    for checkin in active_checkins:
        checkin.is_active = False
    db.commit()
    return {"message": f"{len(active_checkins)} 名を退出させました"}

import time
import threading
from datetime import datetime, timezone
from database.db import db
from models.question_paper import QuestionPaper
from services.audit_service import AuditService

class ReleaseScheduler:
    def __init__(self, app=None, interval_seconds=10):
        self.app = app
        self.interval_seconds = interval_seconds
        self._thread = None
        self._running = False

    def init_app(self, app):
        self.app = app
        self.start()

    def start(self):
        if not self._running:
            self._running = True
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()

    def stop(self):
        self._running = False

    def check_and_release_scheduled_papers(self):
        """
        Idempotently checks for scheduled question papers whose release time has arrived.
        Transitions state from SCHEDULED to RELEASED.
        """
        now_utc = datetime.now(timezone.utc)
        
        # Query papers in SCHEDULED state
        scheduled_papers = QuestionPaper.query.filter(
            QuestionPaper.status.in_(['SCHEDULED', 'WAITING_FOR_RELEASE'])
        ).all()
        
        released_count = 0
        for paper in scheduled_papers:
            rel_at = paper.release_at
            if rel_at.tzinfo is None:
                rel_at = rel_at.replace(tzinfo=timezone.utc)
                
            if now_utc >= rel_at:
                paper.status = 'RELEASED'
                paper.released_at = now_utc
                released_count += 1
                
                AuditService.log(
                    action='SCHEDULED_RELEASE_TRIGGERED',
                    role='SYSTEM',
                    resource_type='QUESTION_PAPER',
                    resource_id=paper.id,
                    status='SUCCESS',
                    severity='INFO',
                    metadata={
                        'scheduled_release_at': rel_at.isoformat(),
                        'actual_release_at': now_utc.isoformat(),
                        'exam_id': paper.exam_id
                    }
                )
                
        if released_count > 0:
            db.session.commit()
            
        return released_count

    def _run_loop(self):
        while self._running:
            try:
                if self.app:
                    with self.app.app_context():
                        self.check_and_release_scheduled_papers()
            except Exception as e:
                print(f"[ReleaseScheduler Error] {e}")
            time.sleep(self.interval_seconds)

release_scheduler = ReleaseScheduler()

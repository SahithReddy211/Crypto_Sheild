import json
from datetime import datetime, timezone
from database.db import db
from models.audit_log import AuditLog

class AuditService:
    @staticmethod
    def log(action, user_id=None, role=None, resource_type=None, resource_id=None, 
            status='SUCCESS', severity='INFO', metadata=None, ip_address=None):
        """
        Record a security audit log entry.
        Severity: INFO, WARNING, HIGH, CRITICAL
        Status: SUCCESS, DENIED, FAILED, BLOCKED
        """
        try:
            log_entry = AuditLog(
                user_id=user_id,
                role=role,
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id else None,
                ip_address=ip_address,
                timestamp=datetime.now(timezone.utc),
                status=status,
                severity=severity
            )
            if metadata:
                log_entry.set_metadata(metadata)
            db.session.add(log_entry)
            db.session.commit()
            return log_entry
        except Exception as e:
            db.session.rollback()
            print(f"[AuditService Error] Failed to write audit log: {e}")
            return None

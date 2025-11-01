from typing import List
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from fastapi import HTTPException
from ..config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = settings.smtp_server
        self.smtp_port = settings.smtp_port
        self.smtp_username = settings.smtp_username
        self.smtp_password = settings.smtp_password
        self.from_email = settings.smtp_from_email

    async def send_timetable(self, recipient_email: str, lecturer_name: str, timetable_pdf: bytes):
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = recipient_email
            msg['Subject'] = f"Your Teaching Timetable"

            body = f"""
            Dear {lecturer_name},

            Please find attached your teaching timetable for the semester.

            Best regards,
            Timetable System
            """
            msg.attach(MIMEText(body, 'plain'))

            # Attach PDF
            pdf_attachment = MIMEApplication(timetable_pdf, _subtype='pdf')
            pdf_attachment.add_header('Content-Disposition', 'attachment', filename='timetable.pdf')
            msg.attach(pdf_attachment)

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Timetable sent successfully to {recipient_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send email: {str(e)}"
            )

email_service = EmailService()
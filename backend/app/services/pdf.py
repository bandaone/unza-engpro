from typing import List
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
from ..models import TimetableEvent
from datetime import datetime

class PDFService:
    @staticmethod
    def generate_timetable_pdf(events: List[TimetableEvent], lecturer_name: str) -> bytes:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=30,
            leftMargin=30,
            topMargin=30,
            bottomMargin=30
        )

        # Prepare styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Center alignment
        )

        # Create document elements
        elements = []
        
        # Add title and date
        title = Paragraph(f"Teaching Timetable - {lecturer_name}", title_style)
        date = Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d')}", styles["Normal"])
        
        # Add summary
        total_hours = sum((datetime.combine(datetime.min, event.end) - 
                          datetime.combine(datetime.min, event.start)).total_seconds() / 3600 
                         for event in events)
        courses = set(event.course.code for event in events)
        groups = set(event.group.name for event in events)
        
        summary = Paragraph(
            f"""
            <br/>
            <b>Weekly Summary:</b><br/>
            Total Teaching Hours: {total_hours:.1f}<br/>
            Number of Courses: {len(courses)}<br/>
            Number of Groups: {len(groups)}<br/>
            <br/>
            <b>Courses:</b><br/>
            {"<br/>".join(f"• {code}" for code in sorted(courses))}
            """,
            styles["Normal"]
        )
        
        elements.extend([title, date, summary, Spacer(1, 20)])

        # Prepare data for table
        days = ["Time", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        time_slots = sorted(set(event.start.strftime("%H:%M") for event in events))
        
        # Create empty grid
        data = [[cell for cell in days]]
        for slot in time_slots:
            row = [slot]
            for day in days[1:]:  # Skip "Time" column
                cell_content = ""
                for event in events:
                    if (event.start.strftime("%H:%M") == slot and 
                        event.day == day[:3]):  # Match first 3 letters (Mon, Tue, etc.)
                        cell_content = (
                            f"Course: {event.course.code}\n"
                            f"{event.course.name}\n"
                            f"Room: {event.room.name}\n"
                            f"Group: {event.group.name}\n"
                            f"Time: {event.start.strftime('%H:%M')}-{event.end.strftime('%H:%M')}"
                        )
                row.append(cell_content)
            data.append(row)

        # Create table
        table = Table(data, colWidths=[1*inch] + [1.5*inch]*5)
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (0, -1), colors.lightgrey),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes

pdf_service = PDFService()
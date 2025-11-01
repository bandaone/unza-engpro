from pydantic import BaseModel, EmailStr

class UpdateLecturerEmail(BaseModel):
    email: EmailStr
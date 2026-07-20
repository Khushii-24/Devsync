from pydantic import BaseModel
from app.schemas.task import TaskResponse
from app.schemas.document import DocumentResponse

class SearchResults(BaseModel):
    tasks: list[TaskResponse]
    documents: list[DocumentResponse]

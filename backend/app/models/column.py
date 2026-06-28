from sqlalchemy import Column as SAColumn, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base

# We alias the import "Column as SAColumn" because our CLASS is also named Column —
# otherwise the class definition below would shadow SQLAlchemy's own Column type.
class Column(Base):
    __tablename__ = "columns"

    id = SAColumn(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = SAColumn(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    name = SAColumn(String, nullable=False)        # e.g. "To Do", "In Progress", "Done"
    position = SAColumn(Integer, nullable=False)    # controls left-to-right order on the board

    project = relationship("Project", back_populates="columns")
    tasks = relationship("Task", back_populates="column", order_by="Task.position")